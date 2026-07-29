import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';

import { PAGE_SIZE } from '../models/editor-config';
import { GridRenderer } from './grid-renderer';

describe('GridRenderer', () => {
  let renderer: GridRenderer;
  let layer: Konva.Layer;

  const shape = () => layer.getChildren()[0] as Konva.Shape;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GridRenderer] });
    renderer = TestBed.inject(GridRenderer);

    layer = new Konva.Layer();
    renderer.attach(layer);
  });

  afterEach(() => {
    renderer.detach();
    layer.destroy();
  });

  it('should size the grid to the page', () => {
    renderer.render(PAGE_SIZE, { visible: true });

    expect(shape().size()).toEqual({ width: PAGE_SIZE.width, height: PAGE_SIZE.height });
    expect(shape().visible()).toBe(true);
  });

  it('should hide when the grid is toggled off', () => {
    renderer.render(PAGE_SIZE, { visible: false });
    expect(shape().visible()).toBe(false);
  });

  it('should not listen for pointer events', () => {
    expect(shape().listening()).toBe(false);
  });

  it('should ignore renders before it is attached', () => {
    renderer.detach();

    expect(layer.getChildren().length).toBe(0);
    expect(() => renderer.render(PAGE_SIZE, { visible: true })).not.toThrow();
  });
});
