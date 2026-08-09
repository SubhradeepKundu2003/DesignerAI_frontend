import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, MUTED, accentRef } from './palette';
import { connector, mergeFixedList, rect, text, translate } from './template-kit';

const BAR_WIDTH = 64;
const GAP = 44;
const PLOT_HEIGHT = 200;
const LABEL_HEIGHT = 22;
const VALUE_GAP = 8;

const ITEMS: { label: string; value: number }[] = [
  { label: 'Q1', value: 42 },
  { label: 'Q2', value: 58 },
  { label: 'Q3', value: 51 },
  { label: 'Q4', value: 76 },
];

const WIDTH = ITEMS.length * BAR_WIDTH + (ITEMS.length - 1) * GAP;
const HEIGHT = PLOT_HEIGHT + LABEL_HEIGHT + 8;

export interface BarChartContent {
  /** Positionally merged onto the default 4 bars — see `mergeFixedList`. */
  readonly items?: readonly Partial<{ label: string; value: number }>[];
}

/**
 * A vertical column chart — the up-axis counterpart to
 * `percentage-bar-ranking.template.ts`'s horizontal, labelled-track bars.
 * Bars sit on a shared baseline rather than a frame row, since their heights
 * (not just their presence) are what the layout is communicating.
 */
function build(origin: { x: number; y: number }, content?: BarChartContent): CanvasElement[] {
  const items = mergeFixedList<(typeof ITEMS)[number]>(ITEMS, content?.items);
  const maxValue = Math.max(...items.map((item) => item.value));
  const elements: CanvasElement[] = [];
  const baselineY = PLOT_HEIGHT;

  elements.push(
    connector({ x: 0, y: baselineY }, { x: WIDTH, y: baselineY }, { name: 'Baseline', stroke: BORDER, strokeRef: 'border', strokeWidth: 1.5 }),
  );

  items.forEach((item, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const barHeight = Math.max(6, (PLOT_HEIGHT - 40) * (item.value / maxValue));
    const x = i * (BAR_WIDTH + GAP);
    const barY = baselineY - barHeight;

    elements.push(
      text({
        x,
        y: barY - LABEL_HEIGHT - VALUE_GAP,
        width: BAR_WIDTH,
        height: LABEL_HEIGHT,
        text: String(item.value),
        name: `Bar ${i + 1} value`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
      }),
      rect({
        x,
        y: barY,
        width: BAR_WIDTH,
        height: barHeight,
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        cornerRadius: 6,
        name: `Bar ${i + 1}`,
      }),
      text({
        x,
        y: baselineY + 8,
        width: BAR_WIDTH,
        height: LABEL_HEIGHT,
        text: item.label,
        name: `Bar ${i + 1} label`,
        fontSize: 13,
        align: 'center',
        fill: MUTED,
        fillRef: 'muted',
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL_MAX_VALUE = Math.max(...ITEMS.map((item) => item.value));
const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  ITEMS.map((item, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const barHeight = Math.max(6, (PLOT_HEIGHT - 40) * (item.value / THUMBNAIL_MAX_VALUE));
    const x = i * (BAR_WIDTH + GAP);
    const barY = PLOT_HEIGHT - barHeight;
    return `<rect x="${x}" y="${barY}" width="${BAR_WIDTH}" height="${barHeight}" rx="6" fill="${accent.solid}"/>`;
  }).join('') +
  `<line x1="0" y1="${PLOT_HEIGHT}" x2="${WIDTH}" y2="${PLOT_HEIGHT}" stroke="${BORDER}"/>` +
  `</svg>`;

export const BAR_CHART_TEMPLATE: InfographicTemplate = {
  id: 'template-bar-chart',
  label: 'Quarterly bar chart',
  tags: ['chart', 'bars', 'comparison', 'metrics', 'quarterly'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
