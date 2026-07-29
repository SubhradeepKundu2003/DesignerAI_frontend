import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';

import { dividerElement, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { ElementRendererRegistry } from './element-renderer.registry';
import { Reconciler } from './reconciler';

describe('Reconciler', () => {
  let reconciler: Reconciler;
  let layer: Konva.Layer;

  const nodeIds = () => layer.getChildren().map((node) => node.id());

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ElementRendererRegistry, Reconciler] });
    reconciler = TestBed.inject(Reconciler);

    layer = new Konva.Layer();
    reconciler.attach(layer);
  });

  afterEach(() => {
    reconciler.detach();
    layer.destroy();
  });

  it('should create one node per element', () => {
    const shape = shapeElement();
    const text = textElement();

    reconciler.sync([shape, text]);

    expect(nodeIds()).toEqual([shape.id, text.id]);
    expect(reconciler.nodeFor(shape.id)).toBeDefined();
  });

  it('should reuse the node of an element it has already drawn', () => {
    const element = shapeElement();
    reconciler.sync([element]);
    const node = reconciler.nodeFor(element.id);

    reconciler.sync([{ ...element, x: 500 }]);

    expect(reconciler.nodeFor(element.id)).toBe(node);
    expect(node!.x()).toBe(500);
  });

  it('should destroy nodes whose element has gone', () => {
    const kept = shapeElement();
    const removed = shapeElement();
    reconciler.sync([kept, removed]);

    reconciler.sync([kept]);

    expect(nodeIds()).toEqual([kept.id]);
    expect(reconciler.nodeFor(removed.id)).toBeUndefined();
  });

  it('should mirror the array order as z-order', () => {
    const first = shapeElement();
    const second = shapeElement();
    const third = shapeElement();
    reconciler.sync([first, second, third]);

    reconciler.sync([third, first, second]);

    expect(nodeIds()).toEqual([third.id, first.id, second.id]);
    expect(reconciler.nodeFor(third.id)!.zIndex()).toBe(0);
  });

  it('should replace the node when an element changes type', () => {
    const shape = shapeElement();
    reconciler.sync([shape]);
    const before = reconciler.nodeFor(shape.id);

    // Same id, different drawing — the old node cannot become the new one.
    reconciler.sync([dividerElement({ id: shape.id })]);

    const after = reconciler.nodeFor(shape.id);
    expect(after).not.toBe(before);
    expect(before!.getParent()).toBeNull();
    expect(layer.getChildren().length).toBe(1);
  });

  it('should apply the shared element properties to every node', () => {
    const element = shapeElement({ x: 12, y: 34, rotation: 45, opacity: 0.5 });

    reconciler.sync([element]);

    expect(reconciler.nodeFor(element.id)).toMatchObject({
      attrs: expect.objectContaining({ x: 12, y: 34, rotation: 45, opacity: 0.5 }),
    });
  });

  it('should take locked elements out of hit testing and dragging', () => {
    const element = shapeElement({ locked: true });

    reconciler.sync([element]);

    const node = reconciler.nodeFor(element.id)!;
    expect(node.draggable()).toBe(false);
    expect(node.listening()).toBe(false);
    // Locked is not hidden: the element stays on the page.
    expect(node.visible()).toBe(true);
  });

  it('should hide invisible elements without removing them', () => {
    const element = shapeElement({ visible: false });

    reconciler.sync([element]);

    expect(reconciler.nodeFor(element.id)!.visible()).toBe(false);
  });

  it('should resolve a list of ids to nodes, skipping unknown ones', () => {
    const element = shapeElement();
    reconciler.sync([element]);

    expect(reconciler.nodesFor([element.id, 'missing'])).toEqual([reconciler.nodeFor(element.id)]);
  });

  it('should ignore syncs before it is attached', () => {
    reconciler.detach();

    expect(() => reconciler.sync([shapeElement()])).not.toThrow();
    expect(layer.getChildren().length).toBe(0);
  });

  it('should leave the layer empty when it detaches', () => {
    reconciler.sync([shapeElement(), textElement()]);

    reconciler.detach();

    expect(layer.getChildren().length).toBe(0);
  });
});
