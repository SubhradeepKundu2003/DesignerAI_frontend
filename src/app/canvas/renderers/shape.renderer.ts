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
      arcOrientation: element.arcOrientation,
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

/**
 * Ellipse center/radii/sweep for a half-ellipse filling the shape's whole
 * box, oriented so its flat (diameter) edge sits on the box edge named by
 * `orientation` and the dome bulges toward the opposite edge. Both arc
 * endpoints always land on the flat edge, so `closePath()` after the arc
 * draws that straight edge for free — no separate line back to center needed.
 */
function semicircleGeometry(width: number, height: number, orientation: string) {
  switch (orientation) {
    case 'down': // flat edge on top, dome bulges down
      return { cx: width / 2, cy: 0, rx: width / 2, ry: height, start: 0, end: Math.PI };
    case 'left': // flat edge on the right, dome bulges left
      return { cx: width, cy: height / 2, rx: width, ry: height / 2, start: Math.PI / 2, end: (3 * Math.PI) / 2 };
    case 'right': // flat edge on the left, dome bulges right
      return { cx: 0, cy: height / 2, rx: width, ry: height / 2, start: -Math.PI / 2, end: Math.PI / 2 };
    case 'up': // flat edge on the bottom, dome bulges up
    default:
      return { cx: width / 2, cy: height, rx: width / 2, ry: height, start: Math.PI, end: 2 * Math.PI };
  }
}

function drawShape(context: Konva.Context, shape: Konva.Shape): void {
  const width = shape.width();
  const height = shape.height();
  const kind = shape.getAttr('shape');

  context.beginPath();
  if (kind === 'circle') {
    context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (kind === 'semicircle') {
    const { cx, cy, rx, ry, start, end } = semicircleGeometry(width, height, shape.getAttr('arcOrientation') ?? 'up');
    context.ellipse(cx, cy, rx, ry, 0, start, end);
  } else {
    // Konva's own rounded-rect path, so radii clamp exactly as Konva.Rect does.
    Konva.Util.drawRoundedRectPath(context, width, height, shape.getAttr('cornerRadius') ?? 0);
  }
  context.closePath();

  context.fillStrokeShape(shape);
}
