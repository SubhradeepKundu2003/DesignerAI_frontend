import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENTS, BORDER, INK, MUTED } from './palette';
import { circle, connector, frame, icon, mergeFixedList, text, translate } from './template-kit';

const COL_WIDTH = 310;
const GAP = 78;
const WIDTH = COL_WIDTH * 2 + GAP;

const HEADER_PADDING = 16;
const HEADER_GAP = 12;
const ICON_SIZE = 24;
const HEADER_H = ICON_SIZE + HEADER_PADDING * 2;

const BULLET_D = 10;
const ITEM_TEXT_HEIGHT = 32;
const BULLET_GAP = 8;
const ITEM_GAP = 8;
const ROW_START_Y = HEADER_H + 24;

interface ColumnMeta {
  title: string;
  iconName: IconName;
  accent: { solid: string; tint: string };
  accentRef: `accent-${number}-solid`;
}

interface ColumnItem {
  text: string;
}

interface Column extends ColumnMeta {
  items: ColumnItem[];
}

const LEFT_META: ColumnMeta = { title: 'Option A', iconName: 'check', accent: ACCENTS.teal, accentRef: 'accent-1-solid' };
const RIGHT_META: ColumnMeta = { title: 'Option B', iconName: 'star', accent: ACCENTS.indigo, accentRef: 'accent-0-solid' };

// Two items per column, not the old three -- lines up with every other
// `bullet_list` pool member's exact 4-slot content contract (see
// `card-grid.template.ts`'s matching comment). The column headers
// (`LEFT_META`/`RIGHT_META`) stay fixed placeholder copy either way: a flat
// 4-item `dataPoints` list has no natural "column name" to map onto them.
const LEFT_ITEMS: ColumnItem[] = [{ text: 'Lower upfront cost' }, { text: 'Faster to set up' }];
const RIGHT_ITEMS: ColumnItem[] = [{ text: 'Scales to more users' }, { text: 'Deeper customization' }];
const DEFAULT_ITEMS: ColumnItem[] = [...LEFT_ITEMS, ...RIGHT_ITEMS];

const ITEMS_HEIGHT = LEFT_ITEMS.length * ITEM_TEXT_HEIGHT + (LEFT_ITEMS.length - 1) * ITEM_GAP;
const HEIGHT = ROW_START_Y + ITEMS_HEIGHT + 16;

/**
 * Rebuilt on Frames (Track D3): each column is now a `row` header frame
 * (icon + title, `background` doing the job the old standalone header `rect`
 * did) stacked above a `column` frame of `row` frames (bullet + item text) —
 * a genuine flex hierarchy, safe to nest now that `CanvasStore.layoutFrame`
 * cascades into a repositioned child frame's own children (see the fix in
 * `canvas.store.ts`). The VS badge and divider stay hand-placed: a one-off
 * decoration, not a repeating structure a frame would help with.
 */
function buildColumn(col: Column, index: number): CanvasElement[] {
  const headerIcon = icon({ x: 0, y: 0, size: ICON_SIZE, name: col.iconName, color: '#ffffff', label: `Column ${index + 1} icon` });
  const headerTitle = text({
    x: 0,
    y: 0,
    width: COL_WIDTH - HEADER_PADDING * 2 - ICON_SIZE - HEADER_GAP,
    height: ICON_SIZE,
    text: col.title,
    name: `Column ${index + 1} title`,
    fontSize: 17,
    fontStyle: 'bold',
    fill: '#ffffff',
    lineHeight: ICON_SIZE / 17,
  });
  const header = frame({
    x: 0,
    y: 0,
    name: `Column ${index + 1} header`,
    layout: 'row',
    gap: HEADER_GAP,
    padding: HEADER_PADDING,
    background: col.accent.solid,
    fillRef: col.accentRef,
    children: [headerIcon, headerTitle],
  });

  const rows = col.items.map((item, i) => {
    const bullet = circle({ x: 0, y: 0, diameter: BULLET_D, fill: col.accent.solid, fillRef: col.accentRef, name: `Column ${index + 1} bullet ${i + 1}` });
    const label = text({
      x: 0,
      y: 0,
      width: COL_WIDTH - BULLET_D - BULLET_GAP,
      height: ITEM_TEXT_HEIGHT,
      text: item.text,
      name: `Column ${index + 1} item ${i + 1}`,
      fontSize: 14,
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.3,
    });
    return frame({ x: 0, y: 0, name: `Column ${index + 1} row ${i + 1}`, layout: 'row', gap: BULLET_GAP, padding: 0, children: [bullet, label] });
  });

  const list = frame({
    x: 0,
    y: ROW_START_Y,
    name: `Column ${index + 1} items`,
    layout: 'column',
    gap: ITEM_GAP,
    padding: 0,
    children: rows.map((row) => row[0]),
  });
  const [listFrame, ...positionedRows] = list;

  // Each row was built at its own local origin (0, 0); shifting the whole
  // bundle by where `list` decided that row's frame belongs moves the row's
  // bullet/text along with it, without needing the live store's runtime cascade.
  const rowElements = rows.flatMap((rowBundle, i) => translate(rowBundle, positionedRows[i]));

  return [...header, listFrame, ...rowElements];
}

export interface ComparisonColumnsContent {
  /** Positionally merged onto the default 4 items (2 left, 2 right, in that
   * order) — see `mergeFixedList`. Column headers stay fixed placeholder copy. */
  readonly items?: readonly Partial<{ text: string }>[];
}

function build(origin: { x: number; y: number }, content?: ComparisonColumnsContent): CanvasElement[] {
  const items = mergeFixedList<ColumnItem>(DEFAULT_ITEMS, content?.items);
  const left: Column = { ...LEFT_META, items: items.slice(0, LEFT_ITEMS.length) };
  const right: Column = { ...RIGHT_META, items: items.slice(LEFT_ITEMS.length) };

  const rightX = COL_WIDTH + GAP;
  const midX = COL_WIDTH + GAP / 2;
  const badgeD = 40;

  const elements: CanvasElement[] = [
    ...buildColumn(left, 0),
    ...translate(buildColumn(right, 1), { x: rightX, y: 0 }),
    connector({ x: midX, y: 0 }, { x: midX, y: HEIGHT }, { name: 'Divider', stroke: BORDER, strokeRef: 'border', strokeWidth: 2 }),
    circle({ x: midX - badgeD / 2, y: HEADER_H / 2 - badgeD / 2, diameter: badgeD, fill: INK, fillRef: 'ink', name: 'VS badge' }),
    text({
      x: midX - badgeD / 2,
      y: HEADER_H / 2 - 9,
      width: badgeD,
      height: 18,
      text: 'VS',
      name: 'VS label',
      fontSize: 13,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
    }),
  ];

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect x="0" y="0" width="${COL_WIDTH}" height="${HEADER_H}" rx="14" fill="${LEFT_META.accent.solid}"/>` +
  `<rect x="${COL_WIDTH + GAP}" y="0" width="${COL_WIDTH}" height="${HEADER_H}" rx="14" fill="${RIGHT_META.accent.solid}"/>` +
  `<line x1="${COL_WIDTH + GAP / 2}" y1="0" x2="${COL_WIDTH + GAP / 2}" y2="${HEIGHT}" stroke="${MUTED}" stroke-width="2"/>` +
  `</svg>`;

export const COMPARISON_COLUMNS_TEMPLATE: InfographicTemplate = {
  id: 'template-comparison-columns',
  label: 'Two-column comparison',
  tags: ['comparison', 'versus', 'columns', 'pros-cons'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
