import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, accentRef } from './palette';
import { circle, icon, mergeFixedList, rect, text, translate } from './template-kit';

const CARD_W = 166;
const PHOTO_H = 170;
const FOOTER_H = 190;
const GAP = 10;
const BADGE_D = 76;

const WIDTH = CARD_W * 4 + GAP * 3;
const HEIGHT = PHOTO_H + FOOTER_H;

const CARDS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Discover', body: 'A short line introducing this feature or story.', iconName: 'compass' },
  { title: 'Support', body: 'A short line introducing this feature or story.', iconName: 'chat' },
  { title: 'Build', body: 'A short line introducing this feature or story.', iconName: 'gear' },
  { title: 'Connect', body: 'A short line introducing this feature or story.', iconName: 'globe' },
];

/**
 * A row of photo feature cards — the editable counterpart to the flattened
 * "Four-card photo feature row" PNG (`infographic-02`). The photo is a plain
 * placeholder rectangle (this phase has no photo library), left flush
 * against the footer panel exactly like the source rather than rounded, so
 * swapping it for a real `ImageElement` later is a drop-in replacement.
 */
export interface PhotoFeatureRowContent {
  /** Positionally merged onto the default 4 cards — see `mergeFixedList`. */
  readonly cards?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: PhotoFeatureRowContent): CanvasElement[] {
  const cards = mergeFixedList<(typeof CARDS)[number]>(CARDS, content?.cards);
  const elements: CanvasElement[] = [];

  cards.forEach((card, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const x = i * (CARD_W + GAP);

    elements.push(
      rect({ x, y: 0, width: CARD_W, height: PHOTO_H, fill: BORDER, fillRef: 'border', name: `Card ${i + 1} photo placeholder` }),
      rect({ x, y: PHOTO_H, width: CARD_W, height: FOOTER_H, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Card ${i + 1} footer` }),
      circle({ x: x + CARD_W / 2 - BADGE_D / 2, y: PHOTO_H - BADGE_D / 2, diameter: BADGE_D, fill: '#ffffff', name: `Card ${i + 1} badge` }),
      icon({ x: x + CARD_W / 2 - 18, y: PHOTO_H - 18, size: 36, name: card.iconName, color: accent.solid, fillRef: accentRef(i, 'solid'), label: `Card ${i + 1} icon` }),
      text({
        x: x + 16,
        y: PHOTO_H + BADGE_D / 2 + 18,
        width: CARD_W - 32,
        height: 24,
        text: card.title,
        name: `Card ${i + 1} title`,
        fontSize: 17,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: x + 16,
        y: PHOTO_H + BADGE_D / 2 + 48,
        width: CARD_W - 32,
        height: 70,
        text: card.body,
        name: `Card ${i + 1} body`,
        fontSize: 13,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.35,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  CARDS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const x = i * (CARD_W + GAP);
    return `<rect x="${x}" y="0" width="${CARD_W}" height="${PHOTO_H}" fill="${BORDER}"/><rect x="${x}" y="${PHOTO_H}" width="${CARD_W}" height="${FOOTER_H}" fill="${accent.solid}"/><circle cx="${x + CARD_W / 2}" cy="${PHOTO_H}" r="${BADGE_D / 2}" fill="#fff"/>`;
  }).join('') +
  `</svg>`;

export const PHOTO_FEATURE_ROW_TEMPLATE: InfographicTemplate = {
  id: 'template-photo-feature-row',
  label: 'Four-card photo feature row',
  tags: ['cards', 'photo', 'feature', 'row'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
