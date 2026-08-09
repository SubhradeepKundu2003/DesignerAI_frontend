import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { ExportService } from './export.service';
import { PageFactory } from './page-factory.service';

describe('ExportService', () => {
  let service: ExportService;
  let canvas: CanvasStore;
  let pageFactory: PageFactory;
  let createObjectURL: ReturnType<typeof vi.spyOn>;
  let anchors: HTMLAnchorElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
    pageFactory = TestBed.inject(PageFactory);
    service = TestBed.inject(ExportService);

    createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    anchors = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        element.click = vi.fn();
        anchors.push(element as HTMLAnchorElement);
      }
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function lastBlob(): Blob {
    return createObjectURL.mock.calls.at(-1)![0] as Blob;
  }

  function lastFilename(): string {
    return anchors.at(-1)!.download;
  }

  it('should export only the current page as a single PNG when range is "current"', async () => {
    canvas.insertElement(shapeElement());
    canvas.insertPage(pageFactory.createBlank());

    await service.exportPng('current');

    expect(lastFilename()).toBe('design.png');
    expect(lastBlob().type).toBe('image/png');
  });

  it('should export every page as a zip of PNGs when range is "all"', async () => {
    canvas.insertPage(pageFactory.createBlank());

    await service.exportPng('all');

    expect(lastFilename()).toBe('design-pages.zip');
    const zip = await JSZip.loadAsync(lastBlob());
    expect(Object.keys(zip.files)).toHaveLength(2);
  });

  it('should export a PDF containing every page when range is "all"', async () => {
    canvas.insertPage(pageFactory.createBlank());

    await service.exportPdf('all');

    expect(lastFilename()).toBe('design.pdf');
    expect(lastBlob().type).toBe('application/pdf');
  });

  it('should export only the active page as PPTX when range is "current"', async () => {
    canvas.insertPage(pageFactory.createBlank());
    canvas.setActivePage(canvas.pages()[0].id);

    await service.exportPptx('current');

    expect(lastFilename()).toBe('design.pptx');
    const zip = await JSZip.loadAsync(lastBlob());
    expect(zip.file('ppt/slides/slide1.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide2.xml')).toBeNull();
  });

  it('should export every page as PPTX when range is "all"', async () => {
    canvas.insertPage(pageFactory.createBlank());

    await service.exportPptx('all');

    const zip = await JSZip.loadAsync(lastBlob());
    expect(zip.file('ppt/slides/slide1.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide2.xml')).not.toBeNull();
  });
});
