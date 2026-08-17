import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, accentRef } from './palette';
import { halfCircle, icon, mergeFixedList, rect, text, translate } from './template-kit';

const COLS = 3;
const ROWS = 2;
const CARD_W = 210;
const ARCH_H = 90;
const BODY_H = 170;
const GAP = 24;
const ROW_GAP = 30;

const WIDTH = COLS * CARD_W + (COLS - 1) * GAP;
const HEIGHT = ROWS * (ARCH_H + BODY_H) + (ROWS - 1) * ROW_GAP;

const CARDS: { body: string; iconName: IconName }[] = [
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'users' },
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'heart' },
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'target' },
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'book' },
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'lightbulb' },
  { body: 'A short paragraph of supporting detail goes here for this card.', iconName: 'trendUp' },
];

/**
 * A two-row, three-column grid of arch-topped icon badge cards — the
 * editable counterpart to the flattened "Six-icon badge grid" PNG
 * (`infographic-15`). Same arch construction as `photo-arch-grid.template.ts`
 * (a native `semicircle`), with a live icon in place of the photo placeholder.
 */
export interface IconArchGridContent {
  /** Positionally merged onto the default 6 cards — see `mergeFixedList`. */
  readonly cards?: readonly Partial<{ body: string }>[];
}

function build(origin: { x: number; y: number }, content?: IconArchGridContent): CanvasElement[] {
  const cards = mergeFixedList<(typeof CARDS)[number]>(CARDS, content?.cards);
  const elements: CanvasElement[] = [];

  cards.forEach((card, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD_W + GAP);
    const y = row * (ARCH_H + BODY_H + ROW_GAP);

    elements.push(
      halfCircle({ x, y, width: CARD_W, height: ARCH_H, orientation: 'down', fill: '#ffffff', stroke: BORDER, strokeRef: 'border', strokeWidth: 1.5, name: `Card ${i + 1} arch` }),
      icon({ x: x + CARD_W / 2 - 18, y: y + ARCH_H - 46, size: 36, name: card.iconName, color: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), label: `Card ${i + 1} icon` }),
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
    return `<rect x="${x}" y="${y}" width="${CARD_W}" height="${ARCH_H}" fill="#fff" stroke="${BORDER}"/><rect x="${x}" y="${y + ARCH_H}" width="${CARD_W}" height="${BODY_H}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const ICON_ARCH_GRID_TEMPLATE: InfographicTemplate = {
  id: 'template-icon-arch-grid',
  label: 'Six-icon badge grid',
  tags: ['grid', 'cards', 'icons', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
