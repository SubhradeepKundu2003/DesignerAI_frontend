import { Text } from 'konva/lib/shapes/Text';

import { TextElement } from '../models/canvas-element.model';

/** The attributes of a `TextElement` that affect how tall it wraps. */
export type TextMeasureAttrs = Pick<
  TextElement,
  'text' | 'width' | 'fontFamily' | 'fontSize' | 'fontStyle' | 'letterSpacing' | 'lineHeight'
>;

/**
 * A single off-stage `Konva.Text` reused for measurement — same trick the
 * text renderer relies on to size the real node, just never attached to a
 * layer so nothing about it is ever painted.
 */
let measurer: Text | null = null;

/** How tall `attrs.text` wraps at `attrs.width`, matching `TextRenderer` exactly. */
export function measureTextHeight(attrs: TextMeasureAttrs): number {
  measurer ??= new Text({ perfectDrawEnabled: false });
  measurer.setAttrs({ ...attrs, wrap: 'word', verticalAlign: 'top', height: undefined });
  return Math.max(1, Math.round(measurer.height()));
}
