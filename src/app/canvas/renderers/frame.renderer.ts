import Konva from 'konva/lib/Core';

import { FrameElement } from '../models/canvas-element.model';
import { ElementRenderer } from './element-renderer';

/**
 * Draws a frame's own box: its `background`, or nothing visible at all.
 *
 * A frame with no `background` still draws a closed path and runs it through
 * `fillStrokeShape` — Konva's hit canvas fills any `fillEnabled` shape
 * regardless of whether a colour was actually set, so an empty, colourless
 * frame stays clickable over its whole area instead of only where a child
 * happens to sit. Layout itself (`x`/`y`/`width`/`height` of `childIds`) is
 * computed by `CanvasStore.layoutFrame`, not here — this renderer only ever
 * draws the frame's own rectangle, the same division of labour `GroupElement`
 * already has between the store (owns the box) and the renderer (draws it).
 */
export class FrameRenderer implements ElementRenderer<FrameElement, Konva.Shape> {
  create(element: FrameElement): Konva.Shape {
    const node = new Konva.Shape({
      perfectDrawEnabled: false,
      sceneFunc: drawFrame,
    });
    this.update(node, element);
    return node;
  }

  update(node: Konva.Shape, element: FrameElement): void {
    node.setAttrs({
      width: element.width,
      height: element.height,
      fill: element.background ?? undefined,
    });
  }
}

function drawFrame(context: Konva.Context, shape: Konva.Shape): void {
  context.beginPath();
  context.rect(0, 0, shape.width(), shape.height());
  context.closePath();
  context.fillStrokeShape(shape);
}
