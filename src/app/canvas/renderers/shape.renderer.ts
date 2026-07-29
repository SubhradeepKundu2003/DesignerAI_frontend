import Konva from 'konva/lib/Core';

import { ShapeElement } from '../models/canvas-element.model';
import { ElementRenderer } from './element-renderer';

/**
 * Draws rectangles and ellipses.
 *
 * Both go through one custom `Konva.Shape` rather than `Konva.Rect` plus
 * `Konva.Ellipse`. That buys two things: the shape is drawn inside the element's
 * own 0…width / 0…height box, so `x`/`y` mean the top-left corner and rotation
 * pivots there for every element type alike; and switching a rectangle to a
 * circle in the properties panel is an attribute change rather than a node
 * swap, which keeps the reconciler free of special cases.
 */
export class ShapeRenderer implements ElementRenderer<ShapeElement, Konva.Shape> {
  create(element: ShapeElement): Konva.Shape {
    const node = new Konva.Shape({
      perfectDrawEnabled: false,
      sceneFunc: drawShape,
    });
    this.update(node, element);
    return node;
  }

  update(node: Konva.Shape, element: ShapeElement): void {
    node.setAttrs({
      width: element.width,
      height: element.height,
      shape: element.shape,
      cornerRadius: element.cornerRadius,
      fill: element.fill,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      // A zero-width stroke would still cost Konva a stroke pass, and would
      // make `hasStroke()` true for the transformer's bounding box.
      strokeEnabled: element.strokeWidth > 0,
    });
  }
}

function drawShape(context: Konva.Context, shape: Konva.Shape): void {
  const width = shape.width();
  const height = shape.height();

  context.beginPath();
  if (shape.getAttr('shape') === 'circle') {
    context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    // Konva's own rounded-rect path, so radii clamp exactly as Konva.Rect does.
    Konva.Util.drawRoundedRectPath(context, width, height, shape.getAttr('cornerRadius') ?? 0);
  }
  context.closePath();

  context.fillStrokeShape(shape);
}
