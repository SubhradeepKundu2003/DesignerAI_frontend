import { TestBed } from '@angular/core/testing';

import { PAGE_SIZE, ZOOM } from '../models/editor-config';
import { ViewportStore } from './viewport.store';

describe('ViewportStore', () => {
  let store: ViewportStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ViewportStore);
    store.setViewportSize({ width: 1200, height: 900 });
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should keep the point under the cursor fixed while wheel zooming', () => {
    const pointer = { x: 400, y: 300 };
    const before = store.transform();
    const worldBefore = {
      x: (pointer.x - before.panX) / before.zoom,
      y: (pointer.y - before.panY) / before.zoom,
    };

    store.zoomByWheel(-1, pointer);

    const after = store.transform();
    expect(after.zoom).toBeGreaterThan(before.zoom);
    expect(after.panX + worldBefore.x * after.zoom).toBeCloseTo(pointer.x, 5);
    expect(after.panY + worldBefore.y * after.zoom).toBeCloseTo(pointer.y, 5);
  });

  it('should clamp zoom to the configured range', () => {
    store.setZoom(1000);
    expect(store.zoom()).toBe(ZOOM.max);
    expect(store.canZoomIn()).toBe(false);

    store.setZoom(0);
    expect(store.zoom()).toBe(ZOOM.min);
    expect(store.canZoomOut()).toBe(false);
  });

  it('should fit the page inside the viewport with padding', () => {
    store.fitToViewport();

    const { zoom, panX, panY } = store.transform();
    expect(PAGE_SIZE.height * zoom).toBeLessThanOrEqual(900 - ZOOM.fitPadding * 2 + 0.001);
    expect(panX).toBeCloseTo((1200 - PAGE_SIZE.width * zoom) / 2, 5);
    expect(panY).toBeCloseTo((900 - PAGE_SIZE.height * zoom) / 2, 5);
  });

  it('should centre the page at 100% when reset', () => {
    store.resetZoom();

    expect(store.zoomPercent()).toBe(100);
    expect(store.panX()).toBeCloseTo((1200 - PAGE_SIZE.width) / 2, 5);
  });

  it('should not let the page be panned out of the workspace', () => {
    store.resetZoom();
    store.panBy(100000, 100000);

    const { panX, panY } = store.transform();
    expect(panX).toBeLessThanOrEqual(1200);
    expect(panY).toBeLessThanOrEqual(900);
  });
});
