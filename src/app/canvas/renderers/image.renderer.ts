import { Image as KonvaImage } from 'konva/lib/shapes/Image';

import { ImageElement } from '../models/canvas-element.model';
import { ElementRenderer } from './element-renderer';

/** Konva attribute holding the source the node's bitmap was decoded from. */
const LOADED_SRC_ATTR = 'loadedSrc';

/**
 * Draws a picture.
 *
 * Konva wants a decoded bitmap, but the document only holds a source string, so
 * this is the one renderer whose work is asynchronous. Decoded bitmaps are
 * cached by source: the same picture used twice, or an element re-created by
 * the reconciler, costs one decode rather than one per node.
 */
export class ImageRenderer implements ElementRenderer<ImageElement, KonvaImage> {
  private readonly decoded = new Map<string, HTMLImageElement>();

  create(element: ImageElement): KonvaImage {
    const node = new KonvaImage({ image: undefined, perfectDrawEnabled: false });
    this.update(node, element);
    return node;
  }

  update(node: KonvaImage, element: ImageElement): void {
    // Set one at a time: `ImageConfig` insists on a bitmap, which is exactly
    // what this renderer may not have yet.
    node.width(element.width);
    node.height(element.height);
    this.applySource(node, element.src);
  }

  private applySource(node: KonvaImage, src: string): void {
    if (node.getAttr(LOADED_SRC_ATTR) === src) {
      return;
    }

    // Recorded before the bitmap arrives, so a source changed mid-flight is
    // detectable and the stale decode can be dropped on arrival.
    node.setAttr(LOADED_SRC_ATTR, src);

    const cached = this.decoded.get(src);
    if (cached) {
      node.image(cached);
      return;
    }

    node.image(undefined);
    if (!src || typeof Image === 'undefined') {
      return;
    }

    const bitmap = new Image();
    bitmap.onload = () => {
      this.decoded.set(src, bitmap);
      // The node may have been destroyed, or pointed at something else, while
      // the bitmap was loading; either way this result is no longer wanted.
      if (node.getAttr(LOADED_SRC_ATTR) !== src) {
        return;
      }

      node.image(bitmap);
      node.getLayer()?.batchDraw();
    };
    bitmap.src = src;
  }
}
