import Konva from 'konva/lib/Core';

import { IconElement } from '../models/canvas-element.model';
import { IconRenderer } from './icon.renderer';

/** Crisp at the icon sizes typical of a slide, without inflating export size unreasonably. */
const ICON_EXPORT_PIXEL_RATIO = 4;

/**
 * Rasterizes one icon glyph to a PNG data URL, for output formats with no
 * vector-icon primitive of their own (PPTX). Reuses `IconRenderer`'s scene
 * function against a one-shot offscreen stage — the same live glyph the
 * canvas draws, not a second SVG-synthesis implementation of `ICON_GLYPHS`.
 */
export function rasterizeIcon(element: IconElement): string {
  const size = Math.max(element.width, element.height, 1);
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: size,
    height: size,
  });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  try {
    const node = new IconRenderer().create({ ...element, width: size, height: size });
    layer.add(node);
    layer.draw();
    return stage.toDataURL({ pixelRatio: ICON_EXPORT_PIXEL_RATIO, mimeType: 'image/png' });
  } finally {
    stage.destroy();
  }
}
