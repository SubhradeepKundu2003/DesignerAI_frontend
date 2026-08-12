import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { frame, icon, mergeFixedList, text, translate } from './template-kit';

const COLS = 2;
const ROWS = 2;
const CARD = { width: 216, height: 150 };
const GAP = 25;
const WIDTH = COLS * CARD.width + (COLS - 1) * GAP;
const HEIGHT = ROWS * CARD.height + (ROWS - 1) * GAP;

const CONTENT_WIDTH = 184;
const CARD_PADDING = 16;
const CARD_GAP = 10;
const ICON_SIZE = 28;

// Four cards, not the old six -- lines up with every other `bullet_list`
// pool member's exact 4-slot content contract (`mergeFixedList`/
// `SHAPE_DATA_POINT_COUNT.bullet_list` in `newsletter-assembler.service.ts`),
// so real extracted content covers every card instead of the last two
// silently staying this file's hardcoded placeholder copy.
const CARDS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Point one', body: 'A short line backing up this highlight.', iconName: 'star' },
  { title: 'Point two', body: 'A short line backing up this highlight.', iconName: 'check' },
  { title: 'Point three', body: 'A short line backing up this highlight.', iconName: 'users' },
  { title: 'Point four', body: 'A short line backing up this highlight.', iconName: 'trendUp' },
];

/**
 * Rebuilt on Frames (Track D3), a grid two levels deep: an outer `column`
 * frame of `row` frames, each holding two `column` "card" frames (icon,
 * title, body). `CARD_PADDING`/`CARD_GAP`/`CONTENT_WIDTH` are chosen so each
 * card frame hugs its content to exactly `CARD.width`x`CARD.height` — no
 * pixel-position bookkeeping left in this file at all, unlike the old version.
 * Known v1 trade-off: `FrameElement` has no stroke/corner-radius, so the card
 * panel is a flat `surface`-tinted rectangle rather than the old bordered,
 * rounded one — a fair swap for panels that now recolour with the theme.
 */
function buildCard(card: (typeof CARDS)[number], index: number): CanvasElement[] {
  const accent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
  const cardIcon = icon({
    x: 0,
    y: 0,
    size: ICON_SIZE,
    name: card.iconName,
    color: accent.solid,
    fillRef: accentRef(index % ACCENT_CYCLE.length, 'solid'),
    label: `Card ${index + 1} icon`,
  });
  const title = text({
    x: 0,
    y: 0,
    width: CONTENT_WIDTH,
    height: 20,
    text: card.title,
    name: `Card ${index + 1} title`,
    fontSize: 15,
    fontStyle: 'bold',
    fill: INK,
    fillRef: 'ink',
    lineHeight: 1.2,
  });
  const body = text({
    x: 0,
    y: 0,
    width: CONTENT_WIDTH,
    height: 50,
    text: card.body,
    name: `Card ${index + 1} body`,
    fontSize: 12.5,
    fill: MUTED,
    fillRef: 'muted',
    lineHeight: 1.3,
  });

  return frame({
    x: 0,
    y: 0,
    name: `Card ${index + 1}`,
    layout: 'column',
    gap: CARD_GAP,
    padding: CARD_PADDING,
    background: '#ffffff',
    fillRef: 'surface',
    children: [cardIcon, title, body],
  });
}

function buildRow(cards: readonly (typeof CARDS)[number][], rowIndex: number): CanvasElement[] {
  const cardBundles = cards.map((card, i) => buildCard(card, rowIndex * COLS + i));
  const row = frame({
    x: 0,
    y: 0,
    name: `Card row ${rowIndex + 1}`,
    layout: 'row',
    gap: GAP,
    padding: 0,
    children: cardBundles.map((bundle) => bundle[0]),
  });
  const [rowFrame, ...positionedCards] = row;

  // Each card was built at its own local origin; shift the whole bundle to
  // where the row frame placed it, moving the card's icon/title/body with it.
  const cardElements = cardBundles.flatMap((bundle, i) => translate(bundle, positionedCards[i]));

  return [rowFrame, ...cardElements];
}

export interface CardGridContent {
  /** Positionally merged onto the default 4 cards — see `mergeFixedList`. */
  readonly cards?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: CardGridContent): CanvasElement[] {
  const cards = mergeFixedList<(typeof CARDS)[number]>(CARDS, content?.cards);
  const rows = [buildRow(cards.slice(0, COLS), 0), buildRow(cards.slice(COLS), 1)];
  const outer = frame({
    x: 0,
    y: 0,
    name: 'Card grid',
    layout: 'column',
    gap: GAP,
    padding: 0,
    children: rows.map((row) => row[0]),
  });
  const [outerFrame, ...positionedRows] = outer;
  const rowElements = rows.flatMap((row, i) => translate(row, positionedRows[i]));

  return translate([outerFrame, ...rowElements], origin);
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
  label: 'Four-card grid',
  tags: ['grid', 'cards', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
