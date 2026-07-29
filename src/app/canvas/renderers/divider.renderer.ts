import { Line } from 'konva/lib/shapes/Line';

import { DividerElement } from '../models/canvas-element.model';
import { ElementRenderer } from './element-renderer';

/** Clickable width of the rule, in page px, regardless of how thin it is drawn. */
const HIT_WIDTH = 14;

/**
 * Draws a horizontal rule.
 *
 * The line sits down the middle of the element's box, so a divider whose stroke
 * grows stays centred on the same baseline instead of creeping downwards. Its
 * box is only as tall as the stroke, which would be near impossible to hit, so
 * the hit area is widened independently of what is painted.
 */
export class DividerRenderer implements ElementRenderer<DividerElement, Line> {
  create(element: DividerElement): Line {
    const node = new Line({
      perfectDrawEnabled: false,
      lineCap: 'butt',
      hitStrokeWidth: HIT_WIDTH,
    });
    this.update(node, element);
    return node;
  }

  update(node: Line, element: DividerElement): void {
    node.setAttrs({
      points: [0, element.height / 2, element.width, element.height / 2],
      stroke: element.stroke,
      strokeWidth: element.strokeWidth,
      dash: element.dash,
      dashEnabled: element.dash.length > 0,
    });
  }
}
