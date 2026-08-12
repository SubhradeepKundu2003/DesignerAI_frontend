import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, accentRef } from './palette';
import { halfCircle, mergeFixedList, rect, text, translate } from './template-kit';

const WIDTH = 640;
const LABEL_HEIGHT = 20;
const GAP_LABEL_BAR = 8;
const BAR_HEIGHT = 16;
const ROW_GAP = 22;
const ROW_BLOCK = LABEL_HEIGHT + GAP_LABEL_BAR + BAR_HEIGHT;
const VALUE_WIDTH = 70;
const CAP_WIDTH = BAR_HEIGHT;

const ITEMS: { label: string; pct: number }[] = [
  { label: 'Email newsletter', pct: 88 },
  { label: 'Internal portal', pct: 71 },
  { label: 'Social channels', pct: 54 },
  { label: 'Printed handout', pct: 22 },
];

const HEIGHT = ITEMS.length * ROW_BLOCK + (ITEMS.length - 1) * ROW_GAP;

/**
 * A ranked list of labelled percentage bars whose filled portion ends in an
 * explicit half-circle cap, rather than `percentage-bar-ranking.template.ts`'s
 * fully rounded pill track — a second look for the `bar_chart` shape pool.
 */
export interface BarChartCapsContent {
  /** Positionally merged onto the default 4 rows — see `mergeFixedList`. */
  readonly items?: readonly Partial<{ label: string; pct: number }>[];
}

function build(origin: { x: number; y: number }, content?: BarChartCapsContent): CanvasElement[] {
  const items = mergeFixedList<(typeof ITEMS)[number]>(ITEMS, content?.items);
  const elements: CanvasElement[] = [];

  items.forEach((item, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const rowY = i * (ROW_BLOCK + ROW_GAP);
    const barY = rowY + LABEL_HEIGHT + GAP_LABEL_BAR;
    const fillWidth = Math.max(BAR_HEIGHT, (WIDTH * item.pct) / 100);
    const fillRectWidth = Math.max(0, fillWidth - CAP_WIDTH);

    elements.push(
      text({
        x: 0,
        y: rowY,
        width: WIDTH - VALUE_WIDTH - 10,
        height: LABEL_HEIGHT,
        text: item.label,
        name: `Rank ${i + 1} label`,
        fontSize: 14,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: WIDTH - VALUE_WIDTH,
        y: rowY,
        width: VALUE_WIDTH,
        height: LABEL_HEIGHT,
        text: `${item.pct}%`,
        name: `Rank ${i + 1} value`,
        fontSize: 14,
        fontStyle: 'bold',
        align: 'right',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
      }),
      rect({
        x: 0,
        y: barY,
        width: WIDTH,
        height: BAR_HEIGHT,
        fill: accent.tint,
        fillRef: accentRef(accentIndex, 'tint'),
        cornerRadius: BAR_HEIGHT / 2,
        name: `Rank ${i + 1} track`,
      }),
      rect({
        x: 0,
        y: barY,
        width: fillRectWidth,
        height: BAR_HEIGHT,
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        name: `Rank ${i + 1} fill`,
      }),
      halfCircle({
        x: fillRectWidth,
        y: barY,
        width: CAP_WIDTH,
        height: BAR_HEIGHT,
        orientation: 'right',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        name: `Rank ${i + 1} fill cap`,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  ITEMS.map((item, i) => {
    const rowY = i * (ROW_BLOCK + ROW_GAP);
    const barY = rowY + LABEL_HEIGHT + GAP_LABEL_BAR;
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const fillWidth = Math.max(BAR_HEIGHT, (WIDTH * item.pct) / 100);
    return (
      `<rect x="0" y="${rowY}" width="200" height="12" rx="3" fill="${INK}"/>` +
      `<rect x="0" y="${barY}" width="${WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${accent.tint}"/>` +
      `<rect x="0" y="${barY}" width="${fillWidth}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${accent.solid}"/>`
    );
  }).join('') +
  `</svg>`;

export const BAR_CHART_CAPS_TEMPLATE: InfographicTemplate = {
  id: 'template-bar-chart-caps',
  label: 'Bar ranking with rounded caps',
  tags: ['ranking', 'bars', 'percentage', 'comparison', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
