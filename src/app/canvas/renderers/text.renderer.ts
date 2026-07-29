import { Text } from 'konva/lib/shapes/Text';

import { TextElement } from '../models/canvas-element.model';
import { ElementRenderer } from './element-renderer';

/**
 * Draws a text box.
 *
 * The box's width is authored; its height is measured. Text wraps to the width
 * the user set, and how tall that turns out to be is a consequence of the font
 * and the words — so `height: 'auto'` lets Konva answer it, and the interaction
 * layer writes the measurement back into the document after an edit.
 */
export class TextRenderer implements ElementRenderer<TextElement, Text> {
  create(element: TextElement): Text {
    const node = new Text({ perfectDrawEnabled: false });
    this.update(node, element);
    return node;
  }

  update(node: Text, element: TextElement): void {
    node.setAttrs({
      text: element.text,
      width: element.width,
      // No stored height: Konva measures the wrapped text instead, and
      // `node.height()` is then the answer the document records after an edit.
      height: undefined,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontStyle: element.fontStyle,
      fill: element.fill,
      align: element.align,
      letterSpacing: element.letterSpacing,
      lineHeight: element.lineHeight,
      wrap: 'word',
      verticalAlign: 'top',
    });
  }
}
