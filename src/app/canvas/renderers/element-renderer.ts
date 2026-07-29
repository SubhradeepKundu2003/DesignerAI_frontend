import Konva from 'konva/lib/Core';

import { CanvasElement } from '../models/canvas-element.model';

/**
 * What an element is drawn as. Deliberately the base node type: the reconciler
 * and the interaction layer treat every element the same way, and only the
 * renderer that made a node knows — or needs to know — which kind it is.
 */
export type ElementNode = Konva.Node;

/**
 * Turns one kind of canvas element into pixels.
 *
 * A renderer is told what the element looks like and reflects it — it never
 * reads the stores, never dispatches commands, and holds no state about the
 * document. The node it returns carries only what {@link update} put there, so
 * the reconciler can throw the node away at any time without losing anything.
 */
export interface ElementRenderer<T extends CanvasElement, N extends ElementNode = ElementNode> {
  /** Builds a node for `element`, already reflecting it. */
  create(element: T): N;

  /** Reflects `element` onto an existing node. Must be idempotent. */
  update(node: N, element: T): void;
}

/** Marks a node as element-owned, so delegated handlers can recognise it. */
export const ELEMENT_NODE_NAME = 'canvas-element';

/** Konva attribute recording which element type drew a node. */
export const ELEMENT_TYPE_ATTR = 'elementType';

/**
 * Applies the properties every element shares, so no renderer has to repeat
 * them and none of them can disagree about what `locked` or `opacity` mean.
 *
 * Size is deliberately *not* here: a text box, an ellipse and a rule each
 * express their extent differently, and forcing a common attribute would only
 * push the difference somewhere less obvious.
 */
export function applyBaseAttrs(node: ElementNode, element: CanvasElement): void {
  node.setAttrs({
    id: element.id,
    name: ELEMENT_NODE_NAME,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: element.visible,
    // Locked elements stay on the page but drop out of hit testing entirely, so
    // they cannot be grabbed, dragged or selected by clicking through to them.
    draggable: !element.locked,
    listening: !element.locked,
  });
}
