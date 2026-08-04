import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';

import { dividerElement, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { CanvasElement } from '../models/canvas-element.model';
import { ElementNode, applyBaseAttrs } from './element-renderer';
import { ElementRendererRegistry } from './element-renderer.registry';
import { SelectionRenderer } from './selection-renderer';

describe('SelectionRenderer', () => {
  let renderer: SelectionRenderer;
  let registry: ElementRendererRegistry;
  let layer: Konva.Layer;

  /** Draws `elements` on a scratch layer and hands them to the renderer. */
  function selectElements(elements: readonly CanvasElement[], zoom = 1): void {
    const nodes: ElementNode[] = elements.map((element) => {
      const node = registry.create(element);
      // The reconciler is what stamps the shared attributes on in the app; the
      // ids among them are how these assertions identify a node.
      applyBaseAttrs(node, element);
      layer.add(node as Konva.Shape);
      return node;
    });
    renderer.render(elements, nodes, zoom);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SelectionRenderer, ElementRendererRegistry],
    });
    renderer = TestBed.inject(SelectionRenderer);
    registry = TestBed.inject(ElementRendererRegistry);

    layer = new Konva.Layer();
    renderer.attach(layer);
  });

  afterEach(() => {
    renderer.detach();
    layer.destroy();
  });

  it('should put a transformer on the overlay layer', () => {
    expect(renderer.node).not.toBeNull();
    expect(renderer.node!.getLayer()).toBe(layer);
  });

  it('should hide itself when nothing is selected', () => {
    renderer.render([], [], 1);

    expect(renderer.node!.visible()).toBe(false);
    expect(renderer.node!.nodes()).toEqual([]);
  });

  it('should attach to the selected nodes', () => {
    const element = shapeElement();
    selectElements([element]);

    expect(renderer.node!.visible()).toBe(true);
    expect(renderer.node!.nodes().map((node) => node.id())).toEqual([element.id]);
  });

  it('should offer every handle on a shape', () => {
    selectElements([shapeElement()]);

    expect(renderer.node!.enabledAnchors()).toContain('top-left');
    expect(renderer.node!.enabledAnchors().length).toBe(8);
  });

  it('should offer width-only handles for text and dividers', () => {
    selectElements([textElement()]);
    expect(renderer.node!.enabledAnchors()).toEqual(['middle-left', 'middle-right']);

    selectElements([dividerElement()]);
    expect(renderer.node!.enabledAnchors()).toEqual(['middle-left', 'middle-right']);
  });

  it('should fall back to every handle for a mixed selection', () => {
    selectElements([textElement(), shapeElement()]);

    expect(renderer.node!.enabledAnchors().length).toBe(8);
  });

  it('should hand Konva a fixed anchor size — Konva renders anchors at a constant screen size on its own', () => {
    selectElements([shapeElement()], 1);
    const atOneHundredPercent = renderer.node!.anchorSize();

    selectElements([shapeElement()], 4);

    expect(renderer.node!.anchorSize()).toBe(atOneHundredPercent);
  });

  it('should keep the rotate handle the same screen distance from the shape at any zoom', () => {
    selectElements([shapeElement()], 1);
    const atOneHundredPercent = renderer.node!.rotateAnchorOffset();

    selectElements([shapeElement()], 4);

    expect(renderer.node!.rotateAnchorOffset() * 4).toBeCloseTo(atOneHundredPercent, 5);
  });

  it('should refuse a resize that would collapse an element to nothing', () => {
    const boundBox = renderer.node!.boundBoxFunc();
    const oldBox = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };

    const collapsed = { ...oldBox, width: 1 };
    expect(boundBox(oldBox, collapsed)).toBe(oldBox);

    const grown = { ...oldBox, width: 300 };
    expect(boundBox(oldBox, grown)).toBe(grown);
  });

  it('should still let an already-flat element be resized along its own axis', () => {
    // A divider is 2px tall; its box must not be treated as collapsing.
    const boundBox = renderer.node!.boundBoxFunc();
    const oldBox = { x: 0, y: 0, width: 200, height: 2, rotation: 0 };
    const wider = { ...oldBox, width: 400 };

    expect(boundBox(oldBox, wider)).toBe(wider);
  });

  it('should ignore renders before it is attached', () => {
    renderer.detach();

    expect(() => renderer.render([shapeElement()], [], 1)).not.toThrow();
  });
});
