import { Injectable } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Image as KonvaImage } from 'konva/lib/shapes/Image';
import { Rect } from 'konva/lib/shapes/Rect';

import { CanvasElement, isImageElement } from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { ElementRendererRegistry } from './element-renderer.registry';
import { applyBaseAttrs } from './element-renderer';

/** Kept small: a project-file thumbnail is a filmstrip image, not a print asset. */
export const THUMBNAIL_PIXEL_RATIO = 0.25;

/**
 * A stuck or unfired decode (a data URL a test environment never actually
 * rasterises, a slow/broken remote image once `src` is more than a data URL)
 * must not hang the whole export — draw that one picture empty instead.
 */
const IMAGE_LOAD_TIMEOUT_MS = 2000;

/**
 * Renders a page to a PNG data URL, using a Konva stage that is never
 * attached to the DOM. Originally built for the `.dzn` project file's
 * `thumbnail.png` (low-res filmstrip image); Track F's PDF/PNG export reuses
 * the same stage-building logic at a higher `pixelRatio` for print-quality
 * output — one offscreen-render implementation, two consumers.
 *
 * Deliberately doesn't reuse `Reconciler`/`PageRenderer`: those are wired to a
 * live, mounted stage and `CanvasStore` (for group visibility cascading),
 * neither of which a one-shot offscreen render needs. `ImageElement` bitmaps
 * are loaded directly here (awaited before `toDataURL`) rather than through
 * `ImageRenderer`'s cache, so the snapshot never races a bitmap that hasn't
 * decoded yet.
 */
@Injectable({ providedIn: 'root' })
export class ThumbnailSnapshotService {
  async snapshot(page: Page, pixelRatio: number = THUMBNAIL_PIXEL_RATIO): Promise<string> {
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width: Math.max(page.width, 1),
      height: Math.max(page.height, 1),
    });
    const layer = new Konva.Layer({ listening: false });
    stage.add(layer);

    try {
      layer.add(
        new Rect({ x: 0, y: 0, width: page.width, height: page.height, fill: page.background }),
      );

      const registry = new ElementRendererRegistry();
      const visible = page.elements.filter((element) => element.visible);
      const bitmaps = await loadImageBitmaps(visible);

      for (const element of visible) {
        const node = isImageElement(element)
          ? imageNode(element, bitmaps.get(element.src))
          : registry.create(element);
        applyBaseAttrs(node, element);
        layer.add(node as Konva.Shape);
      }

      layer.draw();
      return stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
    } finally {
      stage.destroy();
    }
  }
}

function imageNode(element: { width: number; height: number }, bitmap: HTMLImageElement | undefined): KonvaImage {
  return new KonvaImage({ image: bitmap, width: element.width, height: element.height, perfectDrawEnabled: false });
}

async function loadImageBitmaps(elements: readonly CanvasElement[]): Promise<Map<string, HTMLImageElement>> {
  const sources = new Set(elements.filter(isImageElement).map((element) => element.src));
  const bitmaps = new Map<string, HTMLImageElement>();

  await Promise.all(
    [...sources].map(
      (src) =>
        new Promise<void>((resolve) => {
          if (!src || typeof Image === 'undefined') {
            resolve();
            return;
          }
          const timer = setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS);
          const bitmap = new Image();
          bitmap.onload = () => {
            clearTimeout(timer);
            bitmaps.set(src, bitmap);
            resolve();
          };
          // A broken/unreachable image is drawn as empty rather than failing the whole snapshot.
          bitmap.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
          bitmap.src = src;
        }),
    ),
  );

  return bitmaps;
}
