import { ICON_GLYPHS, IconGlyphPart, IconName } from '../../../shared/icons/icon-registry';

export type { IconName };

/**
 * A self-contained SVG data URL, ready for an `ImageElement.src`.
 *
 * Templates still bake icons into a flattened image (unlike `IconElement`,
 * which draws the same {@link ICON_GLYPHS} live on Konva and so can be
 * recoloured by a theme swap) — this renders the shared glyph data as real
 * SVG markup rather than duplicating it as a second, driftable copy.
 */
export function iconDataUrl(name: IconName, color: string, size = 32): string {
  const body = ICON_GLYPHS[name].map((part) => partMarkup(part, color)).join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function partMarkup(part: IconGlyphPart, color: string): string {
  switch (part.kind) {
    case 'path':
      return `<path d="${part.d}"/>`;
    case 'circle':
      return part.filled
        ? `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" fill="${color}" stroke="none"/>`
        : `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}"/>`;
    case 'rect':
      return `<rect x="${part.x}" y="${part.y}" width="${part.width}" height="${part.height}" rx="3"/>`;
  }
}
