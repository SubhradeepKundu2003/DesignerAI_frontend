import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasDocument } from '../models/canvas-document.model';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { PersistenceService } from './persistence.service';

const PROJECT_ID = 'project-1';
const CACHE_KEY = `designerai:canvas:${PROJECT_ID}`;

const documentUrl = (projectId = PROJECT_ID) => `${environment.apiBaseUrl}/projects/${projectId}/document`;

function blankDocument(pageId = 'p1'): CanvasDocument {
  return {
    version: 1,
    pages: [{ id: pageId, width: 794, height: 1123, background: '#fff', elements: [], groups: [] }],
  };
}

/**
 * Effects flush on a microtask, and `writeDocument` now chains through
 * `AssetExternalizationService.externalize` (itself several `Promise.all`
 * levels deep) before the HTTP call is dispatched — give the scheduler
 * generous room to drain all of it rather than counting exact ticks.
 */
async function flushEffects(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('PersistenceService', () => {
  let persistence: PersistenceService;
  let canvas: CanvasStore;
  let history: HistoryStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    canvas = TestBed.inject(CanvasStore);
    history = TestBed.inject(HistoryStore);
    persistence = TestBed.inject(PersistenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should have no save before a project is opened', () => {
    expect(persistence.hasSave()).toBe(false);
  });

  it('should load the document from the backend when opening a project', () => {
    const document = blankDocument();

    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(document);

    expect(canvas.document()).toEqual(document);
    expect(persistence.hasSave()).toBe(true);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(document);
  });

  it('should fall back to the local cache when the backend is unreachable on open', () => {
    const cached = blankDocument('cached');
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));

    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).error(new ProgressEvent('offline'));

    expect(canvas.document()).toEqual(cached);
  });

  it('should leave the document untouched when opening fails with nothing cached', () => {
    const before = canvas.document();

    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).error(new ProgressEvent('offline'));

    expect(canvas.document()).toEqual(before);
  });

  it('should write the document to the backend and flag hasSave on manual save', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());
    canvas.insertElement(shapeElement());

    persistence.save();
    await flushEffects();

    const req = http.expectOne(documentUrl());
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(canvas.document());
    req.flush(canvas.document());

    expect(persistence.hasSave()).toBe(true);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(canvas.document());
  });

  it('should still cache locally when a manual save fails to reach the backend', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());
    canvas.insertElement(shapeElement());

    persistence.save();
    await flushEffects();

    http.expectOne(documentUrl()).error(new ProgressEvent('offline'));

    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(canvas.document());
  });

  it('should flash justSaved and clear it after a delay', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());

    persistence.save();
    expect(persistence.justSaved()).toBe(true);
    await flushEffects();
    http.expectOne(documentUrl()).flush(blankDocument());

    vi.advanceTimersByTime(1600);
    expect(persistence.justSaved()).toBe(false);
  });

  it('should autosave silently after the debounce window, without flashing justSaved', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());

    canvas.insertElement(shapeElement());
    await flushEffects();

    vi.advanceTimersByTime(2000);
    await flushEffects();
    http.expectOne(documentUrl()).flush(canvas.document());

    expect(persistence.hasSave()).toBe(true);
    expect(persistence.justSaved()).toBe(false);
  });

  it('should coalesce a burst of changes into a single autosave write', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());

    canvas.insertElement(shapeElement());
    await flushEffects();
    vi.advanceTimersByTime(1000);

    canvas.insertElement(shapeElement());
    await flushEffects();
    vi.advanceTimersByTime(1000);
    // The first change's 2s window never elapsed uninterrupted, so it never wrote.
    http.expectNone(documentUrl());

    vi.advanceTimersByTime(1000);
    await flushEffects();
    const req = http.expectOne(documentUrl());
    req.flush(canvas.document());
    expect(req.request.body).toEqual(canvas.document());
  });

  it('should not write anywhere before a project has been opened', async () => {
    canvas.insertElement(shapeElement());
    await flushEffects();

    vi.advanceTimersByTime(2000);

    http.expectNone(documentUrl());
    expect(localStorage.length).toBe(0);
  });

  it('should load the saved document from the backend as one undoable step', async () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());

    const original = shapeElement({ name: 'Original' });
    canvas.insertElement(original);
    persistence.save();
    await flushEffects();
    http.expectOne(documentUrl()).flush(canvas.document());

    canvas.insertElement(shapeElement({ name: 'Unsaved addition' }));
    expect(canvas.elementCount()).toBe(2);

    persistence.load();
    http.expectOne(documentUrl()).flush({
      version: 1,
      pages: [{ id: 'p1', width: 794, height: 1123, background: '#fff', elements: [original], groups: [] }],
    });

    expect(canvas.elements().map((element) => element.name)).toEqual(['Original']);

    history.takeUndo()?.undo();
    expect(canvas.elements().map((element) => element.name)).toEqual([
      'Original',
      'Unsaved addition',
    ]);
  });

  it('should fall back to the cache on load when the backend is unreachable', () => {
    persistence.openProject(PROJECT_ID);
    http.expectOne(documentUrl()).flush(blankDocument());

    const cached = blankDocument('cached');
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    canvas.insertElement(shapeElement());

    persistence.load();
    http.expectOne(documentUrl()).error(new ProgressEvent('offline'));

    expect(canvas.document()).toEqual(cached);
  });

  it('should do nothing when load is invoked with no project open', () => {
    const before = canvas.document();
    persistence.load();
    expect(canvas.document()).toEqual(before);
    expect(history.canUndo()).toBe(false);
  });
});
