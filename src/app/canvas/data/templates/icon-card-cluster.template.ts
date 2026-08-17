import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, icon, mergeFixedList, rect, text, translate } from './template-kit';

const CARD_W = 210;
const CARD_H = 180;
const GAP = 26;
const ROW_GAP = 44;
const BADGE_D = 60;
const TAB_H = 10;
const TITLE_Y = 22;
const BODY_Y = 50;

const WIDTH = CARD_W * 3 + GAP * 2;
const HEIGHT = CARD_H * 2 + ROW_GAP + BADGE_D / 2;

const CARDS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Lorem', body: 'A short line of supporting detail for this card goes here.', iconName: 'users' },
  { title: 'Ipsum', body: 'A short line of supporting detail for this card goes here.', iconName: 'award' },
  { title: 'Dolor', body: 'A short line of supporting detail for this card goes here.', iconName: 'target' },
  { title: 'Sit', body: 'A short line of supporting detail for this card goes here.', iconName: 'book' },
  { title: 'Amet', body: 'A short line of supporting detail for this card goes here.', iconName: 'trendUp' },
];

const POSITIONS = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
];

/**
 * A 2-over-3 cluster of icon cards — the editable counterpart to the
 * flattened "Five-icon card cluster" PNG (`infographic-09`). Each card is a
 * bordered rectangle with a notch icon badge overhanging the top edge and a
 * thin accent tab at the bottom, all native shapes.
 */
export interface IconCardClusterContent {
  /** Positionally merged onto the default 5 cards — see `mergeFixedList`. */
  readonly cards?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: IconCardClusterContent): CanvasElement[] {
  const cards = mergeFixedList<(typeof CARDS)[number]>(CARDS, content?.cards);
  const elements: CanvasElement[] = [];

  cards.forEach((card, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const { col, row } = POSITIONS[i];
    const x = col * (CARD_W + GAP);
    const y = row * (CARD_H + ROW_GAP) + BADGE_D / 2;

    elements.push(
      rect({ x, y, width: CARD_W, height: CARD_H, fill: '#ffffff', fillRef: 'surface', stroke: BORDER, strokeRef: 'border', strokeWidth: 1.5, cornerRadius: 18, name: `Card ${i + 1} panel` }),
      circle({ x: x + CARD_W / 2 - BADGE_D / 2, y: y - BADGE_D / 2, diameter: BADGE_D, fill: '#ffffff', stroke: BORDER, strokeRef: 'border', strokeWidth: 1.5, name: `Card ${i + 1} badge` }),
      icon({ x: x + CARD_W / 2 - 16, y: y - BADGE_D / 2 + 14, size: 32, name: card.iconName, color: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), label: `Card ${i + 1} icon` }),
      text({
        x: x + 16,
        y: y + TITLE_Y,
        width: CARD_W - 32,
        height: 22,
        text: card.title,
        name: `Card ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: x + 16,
        y: y + BODY_Y,
        width: CARD_W - 32,
        height: CARD_H - BODY_Y - TAB_H - 10,
        text: card.body,
        name: `Card ${i + 1} body`,
        fontSize: 12.5,
        align: 'center',
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.4,
      }),
      rect({ x: x + CARD_W / 2 - 30, y: y + CARD_H - TAB_H, width: 60, height: TAB_H, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), cornerRadius: 0, name: `Card ${i + 1} tab` }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  CARDS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const { col, row } = POSITIONS[i];
    const x = col * (CARD_W + GAP);
    const y = row * (CARD_H + ROW_GAP) + BADGE_D / 2;
    return `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="#ffffff" stroke="${BORDER}"/><circle cx="${x + CARD_W / 2}" cy="${y}" r="${BADGE_D / 2}" fill="#fff" stroke="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const ICON_CARD_CLUSTER_TEMPLATE: InfographicTemplate = {
  id: 'template-icon-card-cluster',
  label: 'Five-icon card cluster',
  tags: ['cards', 'icons', 'cluster', 'grid'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
