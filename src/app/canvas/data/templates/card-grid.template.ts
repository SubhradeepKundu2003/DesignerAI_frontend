import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED } from './palette';
import { circle, icon, rect, text, translate } from './template-kit';

const COLS = 3;
const ROWS = 2;
const CARD = { width: 216, height: 150 };
const GAP = 25;
const WIDTH = COLS * CARD.width + (COLS - 1) * GAP;
const HEIGHT = ROWS * CARD.height + (ROWS - 1) * GAP;

const CARDS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Point one', body: 'A short line backing up this highlight.', iconName: 'star' },
  { title: 'Point two', body: 'A short line backing up this highlight.', iconName: 'check' },
  { title: 'Point three', body: 'A short line backing up this highlight.', iconName: 'users' },
  { title: 'Point four', body: 'A short line backing up this highlight.', iconName: 'trendUp' },
  { title: 'Point five', body: 'A short line backing up this highlight.', iconName: 'chat' },
  { title: 'Point six', body: 'A short line backing up this highlight.', iconName: 'calendar' },
];

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  CARDS.forEach((card, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD.width + GAP);
    const y = row * (CARD.height + GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const badge = { x: x + 16, y: y + 16, diameter: 40 };

    elements.push(
      rect({ x, y, width: CARD.width, height: CARD.height, fill: '#ffffff', stroke: BORDER, strokeWidth: 1, cornerRadius: 16, name: `Card ${i + 1}` }),
      rect({ x: x + (CARD.width - 48) / 2, y: y - 3, width: 48, height: 6, fill: accent.solid, cornerRadius: 3, name: `Card ${i + 1} accent` }),
      circle({ x: badge.x, y: badge.y, diameter: badge.diameter, fill: accent.solid, name: `Card ${i + 1} badge` }),
      icon({ x: badge.x + 10, y: badge.y + 10, size: 20, name: card.iconName, color: '#ffffff', label: `Card ${i + 1} icon` }),
      text({
        x: x + CARD.width - 40,
        y: y + 16,
        width: 24,
        height: 18,
        text: String(i + 1).padStart(2, '0'),
        name: `Card ${i + 1} number`,
        fontSize: 13,
        fontStyle: 'bold',
        align: 'right',
        fill: accent.solid,
      }),
      text({
        x: x + 16,
        y: y + 66,
        width: CARD.width - 32,
        height: 20,
        text: card.title,
        name: `Card ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        fill: INK,
        lineHeight: 1.2,
      }),
      text({
        x: x + 16,
        y: y + 88,
        width: CARD.width - 32,
        height: 50,
        text: card.body,
        name: `Card ${i + 1} body`,
        fontSize: 12.5,
        fill: MUTED,
        lineHeight: 1.3,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  CARDS.map((_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD.width + GAP);
    const y = row * (CARD.height + GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return `<rect x="${x}" y="${y}" width="${CARD.width}" height="${CARD.height}" rx="16" fill="#ffffff" stroke="${BORDER}"/><circle cx="${x + 36}" cy="${y + 36}" r="20" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const CARD_GRID_TEMPLATE: InfographicTemplate = {
  id: 'template-card-grid',
  label: 'Six-card grid',
  tags: ['grid', 'cards', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
