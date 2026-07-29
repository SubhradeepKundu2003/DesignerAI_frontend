import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';
import { Line } from 'konva/lib/shapes/Line';

import { PAGE_SIZE } from '../models/editor-config';
import { GuidesRenderer } from './guides-renderer';

describe('GuidesRenderer', () => {
  let renderer: GuidesRenderer;
  let layer: Konva.Layer;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GuidesRenderer] });
    renderer = TestBed.inject(GuidesRenderer);

    layer = new Konva.Layer();
    renderer.attach(layer);
  });

  afterEach(() => {
    renderer.detach();
    layer.destroy();
  });

  it('should draw a vertical line spanning the page height', () => {
    renderer.render({ vertical: [400], horizontal: [] }, PAGE_SIZE);

    const [line] = layer.getChildren() as Line[];
    expect(line.visible()).toBe(true);
    expect(line.points()).toEqual([400, 0, 400, PAGE_SIZE.height]);
  });

  it('should draw a horizontal line spanning the page width', () => {
    renderer.render({ vertical: [], horizontal: [300] }, PAGE_SIZE);

    const [line] = layer.getChildren() as Line[];
    expect(line.visible()).toBe(true);
    expect(line.points()).toEqual([0, 300, PAGE_SIZE.width, 300]);
  });

  it('should reuse lines across renders rather than recreating them', () => {
    renderer.render({ vertical: [100], horizontal: [] }, PAGE_SIZE);
    renderer.render({ vertical: [200], horizontal: [] }, PAGE_SIZE);

    expect(layer.getChildren().length).toBe(1);
    expect((layer.getChildren()[0] as Line).points()).toEqual([200, 0, 200, PAGE_SIZE.height]);
  });

  it('should hide lines that no longer match', () => {
    renderer.render({ vertical: [100], horizontal: [200] }, PAGE_SIZE);
    renderer.render({ vertical: [], horizontal: [] }, PAGE_SIZE);

    for (const line of layer.getChildren()) {
      expect(line.visible()).toBe(false);
    }
  });

  it('should hide every guide on clear', () => {
    renderer.render({ vertical: [100], horizontal: [200] }, PAGE_SIZE);
    renderer.clear();

    for (const line of layer.getChildren()) {
      expect(line.visible()).toBe(false);
    }
  });

  it('should ignore calls before it is attached', () => {
    renderer.detach();

    expect(() => renderer.render({ vertical: [1], horizontal: [] }, PAGE_SIZE)).not.toThrow();
    expect(() => renderer.clear()).not.toThrow();
  });
});
