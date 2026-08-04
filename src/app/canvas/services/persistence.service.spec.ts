import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasDocument } from '../models/canvas-document.model';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { PersistenceService } from './persistence.service';

const STORAGE_KEY = 'designerai:canvas:v1';

/** Effects flush on a microtask; give the scheduler a turn to run. */
async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('PersistenceService', () => {
  let persistence: PersistenceService;
  let canvas: CanvasStore;
  let history: HistoryStore;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
    history = TestBed.inject(HistoryStore);
    persistence = TestBed.inject(PersistenceService);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should have no save on a clean start', () => {
    expect(persistence.hasSave()).toBe(false);
  });

  it('should write the document and flag hasSave on manual save', () => {
    canvas.insertElement(shapeElement());

    persistence.save();

    expect(persistence.hasSave()).toBe(true);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CanvasDocument;
    expect(stored).toEqual(canvas.document());
  });

  it('should flash justSaved and clear it after a delay', () => {
    persistence.save();
    expect(persistence.justSaved()).toBe(true);

    vi.advanceTimersByTime(1600);
    expect(persistence.justSaved()).toBe(false);
  });

  it('should autosave silently after the debounce window, without flashing justSaved', async () => {
    canvas.insertElement(shapeElement());
    await flushEffects();

    vi.advanceTimersByTime(2000);

    expect(persistence.hasSave()).toBe(true);
    expect(persistence.justSaved()).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CanvasDocument;
    expect(stored).toEqual(canvas.document());
  });

  it('should coalesce a burst of changes into a single autosave write', async () => {
    canvas.insertElement(shapeElement());
    await flushEffects();
    vi.advanceTimersByTime(1000);

    canvas.insertElement(shapeElement());
    await flushEffects();
    vi.advanceTimersByTime(1000);
    // The first change's 2s window never elapsed uninterrupted, so it never wrote.
    expect(persistence.hasSave()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(persistence.hasSave()).toBe(true);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CanvasDocument;
    expect(stored).toEqual(canvas.document());
  });

  it('should do nothing when restoring on startup with no save present', () => {
    const before = canvas.document();
    persistence.restoreOnStartup();
    expect(canvas.document()).toEqual(before);
  });

  it('should restore the saved document on startup without touching history', () => {
    canvas.insertElement(shapeElement());
    persistence.save();
    canvas.replaceDocument({
      version: 1,
      pages: [{ id: 'blank', width: 794, height: 1123, background: '#fff', elements: [], groups: [] }],
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CanvasDocument;

    persistence.restoreOnStartup();

    expect(canvas.document()).toEqual(saved);
    expect(history.canUndo()).toBe(false);
  });

  it('should ignore a corrupted save', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nonsense: true }));
    const before = canvas.document();

    persistence.restoreOnStartup();

    expect(canvas.document()).toEqual(before);
  });

  it('should load the saved document as one undoable step', () => {
    const original = shapeElement({ name: 'Original' });
    canvas.insertElement(original);
    persistence.save();

    canvas.insertElement(shapeElement({ name: 'Unsaved addition' }));
    expect(canvas.elementCount()).toBe(2);

    persistence.load();
    expect(canvas.elements().map((element) => element.name)).toEqual(['Original']);

    history.takeUndo()?.undo();
    expect(canvas.elements().map((element) => element.name)).toEqual([
      'Original',
      'Unsaved addition',
    ]);
  });

  it('should do nothing when load is invoked with no save present', () => {
    const before = canvas.document();
    persistence.load();
    expect(canvas.document()).toEqual(before);
    expect(history.canUndo()).toBe(false);
  });
});
