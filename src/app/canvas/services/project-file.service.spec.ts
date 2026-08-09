import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';

import { imageElement, shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasDocument } from '../models/canvas-document.model';
import { ImageElement } from '../models/canvas-element.model';
import { PROJECT_FILE_FORMAT_VERSION, ProjectManifest } from '../models/project-file.model';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { ProjectFileService } from './project-file.service';

// Decodes to well over the 50 KB externalization threshold; all-'A' is valid
// (padding-free) base64, so JSZip can round-trip it without a real image.
const LARGE_IMAGE_SRC = `data:image/png;base64,${'A'.repeat(70000)}`;

async function zipFile(entries: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [name, contents] of Object.entries(entries)) {
    zip.file(name, contents);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'design.dzn');
}

async function buildProjectFile(
  document: CanvasDocument,
  manifestOverrides: Partial<ProjectManifest> = {},
): Promise<File> {
  const manifest: ProjectManifest = {
    formatVersion: PROJECT_FILE_FORMAT_VERSION,
    appVersion: '0.1.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    title: 'Untitled design',
    ...manifestOverrides,
  };
  return zipFile({
    'manifest.json': JSON.stringify(manifest),
    'document.json': JSON.stringify(document),
  });
}

describe('ProjectFileService', () => {
  let service: ProjectFileService;
  let canvas: CanvasStore;
  let history: HistoryStore;
  let createObjectURL: ReturnType<typeof vi.spyOn>;
  let revokeObjectURL: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
    history = TestBed.inject(HistoryStore);
    service = TestBed.inject(ProjectFileService);

    createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        (element as HTMLAnchorElement).click = clickSpy as unknown as () => void;
      }
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the current document as a downloaded .dzn zip', async () => {
    canvas.insertElement(shapeElement());

    await service.exportProject();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const manifest = JSON.parse(
      await zip.file('manifest.json')!.async('string'),
    ) as ProjectManifest;
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    expect(manifest.formatVersion).toBe(PROJECT_FILE_FORMAT_VERSION);
    expect(document).toEqual(canvas.document());
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(zip.file('thumbnail.png')).not.toBeNull();
  });

  it('should leave a small image inline rather than externalizing it', async () => {
    canvas.insertElement(imageElement());

    await service.exportProject();

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    expect((document.pages[0].elements[0] as ImageElement).src).toBe(imageElement().src);
    expect(Object.keys(zip.files).some((name) => name.startsWith('assets/'))).toBe(false);
  });

  it('should externalize a large image to assets/ and reference it by an asset: ref', async () => {
    canvas.insertElement(imageElement({ src: LARGE_IMAGE_SRC }));

    await service.exportProject();

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    const src = (document.pages[0].elements[0] as ImageElement).src;
    expect(src).toMatch(/^asset:img-[0-9a-f]{8}\.png$/);
    const assetEntry = zip.file(`assets/${src.slice('asset:'.length)}`);
    expect(assetEntry).not.toBeNull();
    expect(await assetEntry!.async('base64')).toBe('A'.repeat(70000));
  });

  it('should externalize a backend-hosted image (Track K2: export after a backend-loaded project) by fetching its bytes into assets/', async () => {
    const backendUrl = 'http://localhost:8000/assets/abc123';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })),
    );
    canvas.insertElement(imageElement({ src: backendUrl }));

    await service.exportProject();

    expect(fetch).toHaveBeenCalledWith(backendUrl);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    const src = (document.pages[0].elements[0] as ImageElement).src;
    expect(src).toMatch(/^asset:img-[0-9a-f]{8}\.png$/);
    expect(zip.file(`assets/${src.slice('asset:'.length)}`)).not.toBeNull();
  });

  it('should leave a backend-hosted image as a live URL when the fetch to inline it fails', async () => {
    const backendUrl = 'http://localhost:8000/assets/unreachable';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    canvas.insertElement(imageElement({ src: backendUrl }));

    await service.exportProject();

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    expect((document.pages[0].elements[0] as ImageElement).src).toBe(backendUrl);
    expect(Object.keys(zip.files).some((name) => name.startsWith('assets/'))).toBe(false);
  });

  it('should dedupe identical large images to a single asset file', async () => {
    canvas.insertElement(imageElement({ src: LARGE_IMAGE_SRC }));
    canvas.insertElement(imageElement({ src: LARGE_IMAGE_SRC }));

    await service.exportProject();

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    const [first, second] = document.pages[0].elements as ImageElement[];
    expect(first.src).toBe(second.src);
    expect(
      Object.values(zip.files).filter((entry) => !entry.dir && entry.name.startsWith('assets/')),
    ).toHaveLength(1);
  });

  it('should rehydrate an asset: ref back to a blob URL on import', async () => {
    canvas.insertElement(imageElement({ src: LARGE_IMAGE_SRC }));
    await service.exportProject();
    const exportedBlob = createObjectURL.mock.calls[0][0] as Blob;
    const dznFile = new File([exportedBlob], 'design.dzn');
    createObjectURL.mockClear();

    await service.importProject(dznFile);

    expect(service.importError()).toBeNull();
    const imported = canvas.elements()[0] as ImageElement;
    expect(imported.src).toBe('blob:mock');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('should import a valid .dzn file as one undoable step', async () => {
    const original = shapeElement({ name: 'Original' });
    canvas.insertElement(original);
    const saved = canvas.document();

    canvas.insertElement(shapeElement({ name: 'Unsaved addition' }));
    expect(canvas.elementCount()).toBe(2);

    const file = await buildProjectFile(saved);
    await service.importProject(file);

    expect(canvas.elements().map((element) => element.name)).toEqual(['Original']);
    expect(service.importError()).toBeNull();

    history.takeUndo()?.undo();
    expect(canvas.elements().map((element) => element.name)).toEqual([
      'Original',
      'Unsaved addition',
    ]);
  });

  it('should report an error and leave the document untouched for a file missing document.json', async () => {
    const before = canvas.document();
    const file = await zipFile({
      'manifest.json': JSON.stringify({ formatVersion: PROJECT_FILE_FORMAT_VERSION, title: 'x' }),
    });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).toContain('.dzn');
  });

  it('should report an error for a manifest with an unsupported (newer) format version', async () => {
    const before = canvas.document();
    const file = await buildProjectFile(canvas.document(), { formatVersion: 99 as 1 });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).toContain('newer');
  });

  it('should report an error rather than crash for a manifest older than any registered migration', async () => {
    // The migration registry is empty today (v1 is the only version that has ever shipped), so an
    // older version than current has nowhere to migrate from — this exercises that failure path
    // without waiting for a real v2 format to exist.
    const before = canvas.document();
    const file = await buildProjectFile(canvas.document(), { formatVersion: 0 as 1 });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).not.toBeNull();
  });

  it('should report an error for a document that fails validation', async () => {
    const before = canvas.document();
    const file = await zipFile({
      'manifest.json': JSON.stringify({ formatVersion: PROJECT_FILE_FORMAT_VERSION, title: 'x' }),
      'document.json': JSON.stringify({ nonsense: true }),
    });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).toContain('valid design');
  });

  it('should report an error for a file that is not a zip at all', async () => {
    const before = canvas.document();
    const file = new File(['not a zip'], 'design.dzn');

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).not.toBeNull();
  });

  it('should clear a previous import error on a successful import', async () => {
    await service.importProject(new File(['not a zip'], 'design.dzn'));
    expect(service.importError()).not.toBeNull();

    const file = await buildProjectFile(canvas.document());
    await service.importProject(file);

    expect(service.importError()).toBeNull();
  });
});
