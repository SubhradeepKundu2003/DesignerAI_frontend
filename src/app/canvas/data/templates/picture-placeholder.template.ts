import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { BORDER, MUTED } from './palette';
import { rect, text, translate } from './template-kit';

const WIDTH = 698;
const PHOTO_H = 260;
const CAPTION_GAP = 14;
const CAPTION_H = 26;
const HEIGHT = PHOTO_H + CAPTION_GAP + CAPTION_H;
const GLYPH_SIZE = 64;

const DEFAULT_CAPTION = 'Add a picture here';

export interface PicturePlaceholderContent {
  readonly caption?: string;
}

function glyphSvg(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${GLYPH_SIZE}" height="${GLYPH_SIZE}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${MUTED}" stroke-width="1.5">` +
    `<rect x="2" y="3.5" width="20" height="17" rx="2"/>` +
    `<circle cx="8" cy="10" r="2"/>` +
    `<path d="M2 17l6-6 4 4 3-3 7 7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * An empty, editable "insert a picture here" slot — placed only when the
 * model proposes a `picture` block (`LlmBlock.kind`, see `app/agent/schemas.py`),
 * never auto-filled with a real image: deciding *which* picture belongs here
 * is left entirely to the user, same "asset grounding, not hallucination"
 * reasoning applied to every extracted document picture. The box, glyph and
 * caption are ordinary shape/image/text elements grouped by
 * `buildTemplatePlacement` like any other infographic — draggable, resizable
 * and deletable as one unit, and the caption stays plain editable text.
 */
function build(origin: { x: number; y: number }, content?: PicturePlaceholderContent): CanvasElement[] {
  const caption = content?.caption?.trim() || DEFAULT_CAPTION;
  const elements: CanvasElement[] = [];

  elements.push(
    rect({
      x: 0,
      y: 0,
      width: WIDTH,
      height: PHOTO_H,
      fill: '#f6f7f9',
      fillRef: 'surface',
      stroke: BORDER,
      strokeRef: 'border',
      strokeWidth: 2,
      cornerRadius: 12,
      name: 'Picture placeholder',
    }),
  );

  const glyph: ImageElement = {
    id: generateId(),
    name: 'Picture placeholder icon',
    x: WIDTH / 2 - GLYPH_SIZE / 2,
    y: PHOTO_H / 2 - GLYPH_SIZE / 2,
    width: GLYPH_SIZE,
    height: GLYPH_SIZE,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: glyphSvg(),
  };
  elements.push(glyph);

  elements.push(
    text({
      x: 0,
      y: PHOTO_H + CAPTION_GAP,
      width: WIDTH,
      height: CAPTION_H,
      text: caption,
      name: 'Picture caption',
      fontSize: 14,
      fontStyle: 'italic',
      align: 'center',
      fill: MUTED,
      fillRef: 'muted',
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect x="0" y="0" width="${WIDTH}" height="${PHOTO_H}" rx="12" fill="#f6f7f9" stroke="${BORDER}" stroke-width="2"/>` +
  `<rect x="${WIDTH / 2 - GLYPH_SIZE}" y="${PHOTO_H / 2 - GLYPH_SIZE / 2}" width="${GLYPH_SIZE * 2}" height="${GLYPH_SIZE}" fill="none"/>` +
  `<circle cx="${WIDTH / 2 - 16}" cy="${PHOTO_H / 2 - 10}" r="8" fill="${BORDER}"/>` +
  `<path d="M${WIDTH / 2 - 60} ${PHOTO_H / 2 + 30} l 40 -36 26 26 20 -20 46 46" stroke="${BORDER}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
  `</svg>`;

export const PICTURE_PLACEHOLDER_TEMPLATE: InfographicTemplate = {
  id: 'template-picture-placeholder',
  label: 'Picture placeholder',
  tags: ['photo', 'picture', 'image', 'placeholder'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
