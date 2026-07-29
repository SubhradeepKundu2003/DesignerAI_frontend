import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';
import { Rect } from 'konva/lib/shapes/Rect';

import { PAGE_MARGIN, PAGE_SIZE } from '../models/editor-config';
import { PageRenderer, PageSurface } from './page-renderer';

describe('PageRenderer', () => {
  const page: PageSurface = { ...PAGE_SIZE, background: '#ffffff' };

  let renderer: PageRenderer;
  let layer: Konva.Layer;

  const sheet = () => layer.getChildren()[0] as Rect;
  const safeArea = () => layer.getChildren()[1] as Rect;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PageRenderer] });
    renderer = TestBed.inject(PageRenderer);

    layer = new Konva.Layer();
    renderer.attach(layer);
  });

  afterEach(() => {
    renderer.detach();
    layer.destroy();
  });

  it('should draw the sheet at the page size and background', () => {
    renderer.render(page, { zoom: 1, marginsVisible: true });

    expect(sheet().size()).toEqual({ width: PAGE_SIZE.width, height: PAGE_SIZE.height });
    expect(sheet().position()).toEqual({ x: 0, y: 0 });
    expect(sheet().fill()).toBe('#ffffff');
  });

  it('should inset the safe area by the page margin on every side', () => {
    renderer.render(page, { zoom: 1, marginsVisible: true });

    expect(safeArea().position()).toEqual({ x: PAGE_MARGIN, y: PAGE_MARGIN });
    expect(safeArea().size()).toEqual({
      width: PAGE_SIZE.width - PAGE_MARGIN * 2,
      height: PAGE_SIZE.height - PAGE_MARGIN * 2,
    });
  });

  it('should hide the safe area when margins are turned off', () => {
    renderer.render(page, { zoom: 1, marginsVisible: false });
    expect(safeArea().visible()).toBe(false);

    renderer.render(page, { zoom: 1, marginsVisible: true });
    expect(safeArea().visible()).toBe(true);
  });

  it('should keep the page shadow the same size on screen at any zoom', () => {
    // Konva scales shadows by the stage scale, so the stored blur must shrink
    // as the user zooms in for the lift to look identical.
    renderer.render(page, { zoom: 1, marginsVisible: true });
    const atOneHundredPercent = sheet().shadowBlur();

    renderer.render(page, { zoom: 4, marginsVisible: true });
    expect(sheet().shadowBlur() * 4).toBeCloseTo(atOneHundredPercent, 5);
  });

  it('should ignore renders before it is attached', () => {
    renderer.detach();

    expect(layer.getChildren().length).toBe(0);
    expect(() => renderer.render(page, { zoom: 1, marginsVisible: true })).not.toThrow();
  });
});
