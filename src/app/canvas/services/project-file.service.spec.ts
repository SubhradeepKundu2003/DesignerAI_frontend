import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasDocument } from '../models/canvas-document.model';
import { PROJECT_FILE_FORMAT_VERSION, ProjectManifest } from '../models/project-file.model';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { ProjectFileService } from './project-file.service';

async function zipFile(entries: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [name, contents] of Object.entries(entries)) {
    zip.file(name, contents);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'design.dzn');
}

async function buildProjectFile(document: CanvasDocument, manifestOverrides: Partial<ProjectManifest> = {}): Promise<File> {
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
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as ProjectManifest;
    const document = JSON.parse(await zip.file('document.json')!.async('string')) as CanvasDocument;

    expect(manifest.formatVersion).toBe(PROJECT_FILE_FORMAT_VERSION);
    expect(document).toEqual(canvas.document());
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
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
    const file = await zipFile({ 'manifest.json': JSON.stringify({ formatVersion: PROJECT_FILE_FORMAT_VERSION, title: 'x' }) });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).toContain('.dzn');
  });

  it('should report an error for a manifest with an unsupported format version', async () => {
    const before = canvas.document();
    const file = await buildProjectFile(canvas.document(), { formatVersion: 99 as 1 });

    await service.importProject(file);

    expect(canvas.document()).toEqual(before);
    expect(service.importError()).toContain('newer');
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
