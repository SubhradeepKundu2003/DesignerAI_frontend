import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, accentRef } from './palette';
import { halfCircle, mergeFixedList, rect, text, translate } from './template-kit';

const COLS = 3;
const ROWS = 2;
const CARD_W = 210;
const ARCH_H = 90;
const BODY_H = 170;
const GAP = 24;
const ROW_GAP = 30;

const WIDTH = COLS * CARD_W + (COLS - 1) * GAP;
const HEIGHT = ROWS * (ARCH_H + BODY_H) + (ROWS - 1) * ROW_GAP;

const CARDS: { body: string }[] = Array.from({ length: 6 }, () => ({
  body: 'A short paragraph of supporting detail goes here for this card.',
}));

/**
 * A two-row, three-column grid of arch-topped photo cards — the editable
 * counterpart to the flattened "Six-card grid" PNG (`infographic-14`). The
 * arch is a native `semicircle` shape (`halfCircle`), and the photo is a
 * plain placeholder rectangle rather than a real `ImageElement`, ready to be
 * swapped for an uploaded photo later.
 */
export interface PhotoArchGridContent {
  /** Positionally merged onto the default 6 cards — see `mergeFixedList`. */
  readonly cards?: readonly Partial<{ body: string }>[];
}

function build(origin: { x: number; y: number }, content?: PhotoArchGridContent): CanvasElement[] {
  const cards = mergeFixedList<(typeof CARDS)[number]>(CARDS, content?.cards);
  const elements: CanvasElement[] = [];

  cards.forEach((card, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD_W + GAP);
    const y = row * (ARCH_H + BODY_H + ROW_GAP);

    elements.push(
      halfCircle({ x, y, width: CARD_W, height: ARCH_H, orientation: 'down', fill: BORDER, fillRef: 'border', name: `Card ${i + 1} photo placeholder` }),
      rect({ x, y: y + ARCH_H, width: CARD_W, height: BODY_H, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), name: `Card ${i + 1} body panel` }),
      text({
        x: x + 18,
        y: y + ARCH_H + 22,
        width: CARD_W - 36,
        height: BODY_H - 40,
        text: card.body,
        name: `Card ${i + 1} body`,
        fontSize: 13,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.4,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  CARDS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD_W + GAP);
    const y = row * (ARCH_H + BODY_H + ROW_GAP);
    return `<rect x="${x}" y="${y}" width="${CARD_W}" height="${ARCH_H}" fill="${BORDER}"/><rect x="${x}" y="${y + ARCH_H}" width="${CARD_W}" height="${BODY_H}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const PHOTO_ARCH_GRID_TEMPLATE: InfographicTemplate = {
  id: 'template-photo-arch-grid',
  label: 'Six-card photo grid',
  tags: ['grid', 'cards', 'photo', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
