import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';
import { Transformer } from 'konva/lib/shapes/Transformer';

import { groupElement, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { CommandBus } from '../commands/command-bus.service';
import { CanvasElement } from '../models/canvas-element.model';
import { ElementNode } from '../renderers/element-renderer';
import { ElementRendererRegistry } from '../renderers/element-renderer.registry';
import { GuidesRenderer } from '../renderers/guides-renderer';
import { MarqueeRenderer } from '../renderers/marquee-renderer';
import { Reconciler } from '../renderers/reconciler';
import { CanvasStore } from '../state/canvas.store';
import { EditorSettingsStore } from '../state/editor-settings.store';
import { HistoryStore } from '../state/history.store';
import { SelectionStore } from '../state/selection.store';
import { TextEditingStore } from '../state/text-editing.store';
import { CanvasInteractions } from './canvas-interaction.service';
import { KeyboardShortcuts } from './keyboard-shortcuts.service';

/** Presses and releases the space bar, as the workspace's pan modifier. */
function pressSpace(shortcuts: KeyboardShortcuts): void {
  shortcuts.handleKeydown({
    code: 'Space',
    target: document.body,
    preventDefault: () => {},
  } as unknown as KeyboardEvent);
}

/** Konva only reads a handful of fields off the underlying DOM event. */
function pointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return { button: 0, buttons: 1, shiftKey: false, ...overrides } as PointerEvent;
}

describe('CanvasInteractions', () => {
  let interactions: CanvasInteractions;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let history: HistoryStore;
  let reconciler: Reconciler;

  let stage: Konva.Stage;
  let content: Konva.Layer;
  let transformer: Transformer;
  let guides: GuidesRenderer;
  let marquee: MarqueeRenderer;
  let settings: EditorSettingsStore;

  /** Adds `element` to the document and returns the node drawing it. */
  function place(element: CanvasElement): ElementNode {
    canvas.insertElement(element);
    reconciler.sync(canvas.elements());
    return reconciler.nodeFor(element.id)!;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CanvasInteractions,
        Reconciler,
        ElementRendererRegistry,
        GuidesRenderer,
        MarqueeRenderer,
      ],
    });
    interactions = TestBed.inject(CanvasInteractions);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    history = TestBed.inject(HistoryStore);
    reconciler = TestBed.inject(Reconciler);
    guides = TestBed.inject(GuidesRenderer);
    marquee = TestBed.inject(MarqueeRenderer);
    settings = TestBed.inject(EditorSettingsStore);

    stage = new Konva.Stage({ container: document.createElement('div'), width: 800, height: 600 });
    content = new Konva.Layer();
    const overlay = new Konva.Layer();
    stage.add(content, overlay);

    transformer = new Transformer();
    overlay.add(transformer);
    guides.attach(overlay);
    marquee.attach(overlay);

    reconciler.attach(content);
    interactions.attach(stage, content, transformer);
  });

  afterEach(() => {
    interactions.detach();
    reconciler.detach();
    stage.destroy();
  });

  describe('selection', () => {
    it('should select the element under the pointer', () => {
      const element = shapeElement();
      const node = place(element);

      node.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.selectedIds()).toEqual([element.id]);
    });

    it('should extend the selection when shift is held', () => {
      const first = shapeElement();
      const second = shapeElement();
      const firstNode = place(first);
      const secondNode = place(second);

      firstNode.fire('pointerdown', { evt: pointerEvent() }, true);
      secondNode.fire('pointerdown', { evt: pointerEvent({ shiftKey: true }) }, true);

      expect(selection.selectedIds()).toEqual([first.id, second.id]);
    });

    it('should keep a multi-selection intact when pressing on one of its members', () => {
      const first = shapeElement();
      const second = shapeElement();
      const firstNode = place(first);
      place(second);
      selection.selectMany([first.id, second.id]);

      firstNode.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.selectedIds()).toEqual([first.id, second.id]);
    });

    it('should clear the selection when the empty page is pressed', () => {
      const element = shapeElement();
      place(element);
      selection.select(element.id);

      stage.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.selectedIds()).toEqual([]);
    });

    it('should leave the selection alone during a pan gesture', () => {
      const element = shapeElement();
      const node = place(element);

      node.fire('pointerdown', { evt: pointerEvent({ button: 1, buttons: 4 }) }, true);

      expect(selection.selectedIds()).toEqual([]);
    });

    it('should treat a left-button press as panning while space is held', () => {
      pressSpace(TestBed.inject(KeyboardShortcuts));
      const element = shapeElement();
      const node = place(element);

      node.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.selectedIds()).toEqual([]);
    });
  });

  describe('marquee selection', () => {
    /** Presses on empty paper at `from`, drags to `to`, then releases — the window carries the drag once it starts. */
    function marqueeDrag(
      from: { x: number; y: number },
      to: { x: number; y: number },
      options: Partial<PointerEvent> = {},
    ): void {
      stage.fire(
        'pointerdown',
        { evt: pointerEvent({ clientX: from.x, clientY: from.y, ...options }) },
        true,
      );
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: to.x, clientY: to.y }));
      window.dispatchEvent(new PointerEvent('pointerup'));
    }

    it('should select every element inside the dragged rectangle', () => {
      const inside = shapeElement({ x: 0, y: 0, width: 50, height: 50 });
      const outside = shapeElement({ x: 200, y: 200, width: 50, height: 50 });
      place(inside);
      place(outside);

      marqueeDrag({ x: 0, y: 0 }, { x: 100, y: 100 });

      expect(selection.selectedIds()).toEqual([inside.id]);
    });

    it('should add marquee hits to the selection a shift-drag started with', () => {
      const already = shapeElement({ x: 0, y: 0, width: 50, height: 50 });
      const swept = shapeElement({ x: 200, y: 200, width: 50, height: 50 });
      place(already);
      place(swept);
      selection.select(already.id);

      marqueeDrag({ x: 100, y: 100 }, { x: 250, y: 250 }, { shiftKey: true });

      expect(selection.selectedIds()).toEqual([already.id, swept.id]);
    });

    it('should not select a locked element', () => {
      place(shapeElement({ x: 0, y: 0, width: 50, height: 50, locked: true }));

      marqueeDrag({ x: 0, y: 0 }, { x: 100, y: 100 });

      expect(selection.selectedIds()).toEqual([]);
    });

    it('should select a grouped element as its group', () => {
      const a = shapeElement({ x: 0, y: 0, width: 50, height: 50 });
      const b = shapeElement({ x: 60, y: 0, width: 50, height: 50 });
      place(a);
      place(b);
      canvas.groupElements(groupElement({ id: 'g1', childIds: [a.id, b.id] }), [a.id, b.id]);

      marqueeDrag({ x: 0, y: 0 }, { x: 40, y: 40 });

      expect(selection.selectedIds()).toEqual(['g1']);
    });

    it('should clear the selection on a plain click that never turns into a drag', () => {
      const element = shapeElement();
      place(element);
      selection.select(element.id);

      marqueeDrag({ x: 0, y: 0 }, { x: 0, y: 0 });

      expect(selection.selectedIds()).toEqual([]);
    });

    it('should stop tracking the pointer once the drag ends', () => {
      place(shapeElement({ x: 0, y: 0, width: 50, height: 50 }));

      marqueeDrag({ x: 0, y: 0 }, { x: 100, y: 100 });
      selection.clear();
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));

      expect(selection.selectedIds()).toEqual([]);
    });
  });

  describe('dragging', () => {
    it('should commit a finished drag as an undoable move', () => {
      const element = shapeElement({ x: 10, y: 20 });
      const node = place(element);
      transformer.nodes([node as Konva.Shape]);

      node.fire('dragstart', { evt: pointerEvent() }, true);
      node.position({ x: 120, y: 240 });
      node.fire('dragend', { evt: pointerEvent() }, true);

      expect(canvas.elementById(element.id)).toMatchObject({ x: 120, y: 240 });
      expect(history.undoLabel()).toBe('Move element');

      TestBed.inject(CommandBus).undo();
      expect(canvas.elementById(element.id)).toMatchObject({ x: 10, y: 20 });
    });

    it('should record nothing when a drag ends where it started', () => {
      const element = shapeElement();
      const node = place(element);

      node.fire('dragend', { evt: pointerEvent() }, true);

      expect(history.depth()).toBe(0);
    });

    it('should cancel a drag that belongs to the pan gesture', () => {
      const node = place(shapeElement());
      const stopDrag = vi.spyOn(node, 'stopDrag');

      node.fire('dragstart', { evt: pointerEvent({ button: 1, buttons: 4 }) }, true);
      expect(stopDrag).toHaveBeenCalled();

      stopDrag.mockClear();
      node.fire('dragstart', { evt: pointerEvent() }, true);
      expect(stopDrag).not.toHaveBeenCalled();
    });

    it('should cancel a drag that belongs to a space+left-button pan gesture', () => {
      pressSpace(TestBed.inject(KeyboardShortcuts));
      const node = place(shapeElement());
      const stopDrag = vi.spyOn(node, 'stopDrag');

      node.fire('dragstart', { evt: pointerEvent() }, true);

      expect(stopDrag).toHaveBeenCalled();
    });

    it('should move every node attached to the transformer together, as one undo step', () => {
      settings.toggleSnap();
      settings.toggleGuides();
      const a = shapeElement({ x: 0, y: 0 });
      const b = shapeElement({ x: 100, y: 100 });
      const nodeA = place(a);
      const nodeB = place(b);
      transformer.nodes([nodeA as Konva.Shape, nodeB as Konva.Shape]);

      nodeA.fire('dragstart', { evt: pointerEvent() }, true);
      nodeA.position({ x: 20, y: 20 });
      nodeA.fire('dragmove', { evt: pointerEvent() }, true);
      nodeA.fire('dragend', { evt: pointerEvent() }, true);

      expect(canvas.elementById(a.id)).toMatchObject({ x: 20, y: 20 });
      expect(canvas.elementById(b.id)).toMatchObject({ x: 120, y: 120 });
      expect(history.depth()).toBe(1);

      TestBed.inject(CommandBus).undo();
      expect(canvas.elementById(a.id)).toMatchObject({ x: 0, y: 0 });
      expect(canvas.elementById(b.id)).toMatchObject({ x: 100, y: 100 });
    });
  });

  describe('snapping', () => {
    /** Guide lines are every overlay child but the transformer itself. */
    function visibleGuides(): Konva.Node[] {
      return transformer
        .getLayer()!
        .getChildren()
        .filter((child) => (child as Konva.Node) !== transformer && child.visible());
    }

    it('should round a dragged node to the grid', () => {
      const node = place(shapeElement({ x: 10, y: 20, width: 50, height: 50 }));

      node.fire('dragstart', { evt: pointerEvent() }, true);
      node.position({ x: 111, y: 129 });
      node.fire('dragmove', { evt: pointerEvent() }, true);

      expect(node.position()).toEqual({ x: 120, y: 120 });
    });

    it('should snap to another element and draw a guide for it', () => {
      place(shapeElement({ x: 200, y: 0, width: 100, height: 40 }));
      const node = place(shapeElement({ x: 10, y: 300, width: 50, height: 50 }));
      transformer.nodes([node as Konva.Shape]);

      node.fire('dragstart', { evt: pointerEvent() }, true);
      node.position({ x: 198, y: 300 });
      node.fire('dragmove', { evt: pointerEvent() }, true);

      expect(node.x()).toBe(200);
      expect(visibleGuides().length).toBe(1);
    });

    it('should ignore snapping entirely once both settings are off', () => {
      settings.toggleSnap();
      settings.toggleGuides();
      const node = place(shapeElement({ x: 10, y: 20, width: 50, height: 50 }));

      node.position({ x: 111, y: 129 });
      node.fire('dragmove', { evt: pointerEvent() }, true);

      expect(node.position()).toEqual({ x: 111, y: 129 });
    });

    it('should carry the snap adjustment over to the rest of a dragged group', () => {
      // Konva's real Transformer only mirrors the pointer-driven node's
      // movement onto every other attached node once, on the first dragmove
      // after dragstart (see `_proxyDrag` in `Transformer.js`) — it does not
      // keep mirroring on every tick. B's position below is left for that
      // real, live Transformer to move on its own; this only sets A's,
      // exactly as a native drag would.
      const a = place(shapeElement({ x: 10, y: 20, width: 50, height: 50 }));
      const b = place(shapeElement({ x: 110, y: 120, width: 50, height: 50 }));
      transformer.nodes([a as Konva.Shape, b as Konva.Shape]);

      a.fire('dragstart', { evt: pointerEvent() }, true);
      a.position({ x: 111, y: 129 });
      a.fire('dragmove', { evt: pointerEvent() }, true);

      expect(a.position()).toEqual({ x: 120, y: 120 });
      expect(b.position()).toEqual({ x: 220, y: 220 });
    });

    it('should clear the guides once the drag ends', () => {
      place(shapeElement({ x: 200, y: 0, width: 100, height: 40 }));
      const node = place(shapeElement({ x: 10, y: 300, width: 50, height: 50 }));

      node.position({ x: 198, y: 300 });
      node.fire('dragmove', { evt: pointerEvent() }, true);
      node.fire('dragend', { evt: pointerEvent() }, true);

      expect(visibleGuides()).toEqual([]);
    });
  });

  describe('transforming', () => {
    it('should turn the scale left by a resize into a size on the element', () => {
      const element = shapeElement({ width: 100, height: 60 });
      const node = place(element);
      transformer.nodes([node as Konva.Shape]);

      node.scale({ x: 2, y: 0.5 });
      node.position({ x: 30, y: 40 });
      transformer.fire('transformend');

      expect(canvas.elementById(element.id)).toMatchObject({
        width: 200,
        height: 30,
        x: 30,
        y: 40,
      });
    });

    it('should reset the node scale, so the size is not applied twice', () => {
      const node = place(shapeElement({ width: 100, height: 60 }));
      transformer.nodes([node as Konva.Shape]);

      node.scale({ x: 2, y: 2 });
      transformer.fire('transformend');

      expect(node.scaleX()).toBe(1);
      expect(node.scaleY()).toBe(1);
      expect(node.width()).toBe(200);
    });

    it('should commit a rotation', () => {
      const element = shapeElement();
      const node = place(element);
      transformer.nodes([node as Konva.Shape]);

      node.rotation(45);
      transformer.fire('transformend');

      expect(canvas.elementById(element.id)).toMatchObject({ rotation: 45 });
    });

    it('should re-measure a text box rather than stretching it', () => {
      const element = textElement({ width: 100, height: 40, fontSize: 20, lineHeight: 1.5 });
      const node = place(element);
      transformer.nodes([node as Konva.Shape]);

      node.scale({ x: 2, y: 1 });
      transformer.fire('transformend');

      const updated = canvas.elementById(element.id)!;
      expect(updated.width).toBe(200);
      // Height follows the wrapped text, so it is measured rather than scaled.
      expect(updated.height).toBe(Math.round(node.height()));
      expect(updated.height).toBeGreaterThan(0);
    });

    it('should make a resize undoable in one step', () => {
      const element = shapeElement({ width: 100, height: 60 });
      const node = place(element);
      transformer.nodes([node as Konva.Shape]);

      node.scale({ x: 3, y: 3 });
      transformer.fire('transformend');
      expect(history.depth()).toBe(1);

      TestBed.inject(CommandBus).undo();
      expect(canvas.elementById(element.id)).toMatchObject({ width: 100, height: 60 });
    });
  });

  describe('double-click to edit', () => {
    it('should select a text box and open it for editing', () => {
      const element = textElement();
      const node = place(element);

      node.fire('dblclick', { evt: {} }, true);

      expect(selection.selectedIds()).toEqual([element.id]);
      expect(TestBed.inject(TextEditingStore).editingId()).toBe(element.id);
    });

    it('should ignore a double-click on a non-text element', () => {
      const node = place(shapeElement());

      node.fire('dblclick', { evt: {} }, true);

      expect(TestBed.inject(TextEditingStore).editingId()).toBeNull();
    });

    it('should ignore a double-click on a locked text box', () => {
      const element = textElement({ locked: true });
      const node = place(element);

      node.fire('dblclick', { evt: {} }, true);

      expect(TestBed.inject(TextEditingStore).editingId()).toBeNull();
    });
  });

  describe('groups', () => {
    function group(): { a: CanvasElement; b: CanvasElement; nodeA: ElementNode } {
      const a = shapeElement();
      const b = shapeElement();
      const nodeA = place(a);
      place(b);
      canvas.groupElements(groupElement({ id: 'g1', childIds: [a.id, b.id] }), [a.id, b.id]);
      return { a, b, nodeA };
    }

    it('should select the whole group on a plain click', () => {
      const { nodeA } = group();

      nodeA.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.selectedIds()).toEqual(['g1']);
    });

    it('should enter the group on double-click and select the clicked member directly', () => {
      const { a, nodeA } = group();

      nodeA.fire('dblclick', { evt: {} }, true);

      expect(selection.enteredGroupId()).toBe('g1');
      expect(selection.selectedIds()).toEqual([a.id]);
    });

    it('should exit the group when clicking outside it', () => {
      group();
      const outsider = shapeElement();
      const outsiderNode = place(outsider);
      selection.enterGroup('g1');

      outsiderNode.fire('pointerdown', { evt: pointerEvent() }, true);

      expect(selection.enteredGroupId()).toBeNull();
      expect(selection.selectedIds()).toEqual([outsider.id]);
    });
  });

  it('should stop responding once detached', () => {
    const element = shapeElement();
    const node = place(element);

    interactions.detach();
    node.fire('pointerdown', { evt: pointerEvent() }, true);

    expect(selection.selectedIds()).toEqual([]);
  });
});
