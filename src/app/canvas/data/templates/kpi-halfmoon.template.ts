import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, MUTED, accentRef } from './palette';
import { halfCircle, mergeFixedList, text, translate } from './template-kit';

const COLS = 2;
const ROWS = 2;
const CARD = { width: 260, height: 170 };
const GAP = 24;
const WIDTH = COLS * CARD.width + (COLS - 1) * GAP;
const HEIGHT = ROWS * CARD.height + (ROWS - 1) * GAP;
const PEDESTAL_HEIGHT = 56;

const KPIS: { value: string; label: string; trend: string }[] = [
  { value: '42', label: 'Markets served', trend: 'Up from 28 last year' },
  { value: '6.1M', label: 'Newsletter reach', trend: 'Across all channels' },
  { value: '3.9', label: 'Avg. open rate', trend: 'Per subscriber, monthly' },
  { value: '18', label: 'New product launches', trend: 'This fiscal year' },
];

/**
 * Four KPI tiles, each number resting on its own small half-circle pedestal
 * instead of `kpi-dashboard.template.ts`'s bordered icon cards — a flatter,
 * more graphic look for the `kpi` shape pool.
 */
export interface KpiHalfmoonContent {
  /** Positionally merged onto the default 4 tiles — see `mergeFixedList`. */
  readonly kpis?: readonly Partial<{ value: string; label: string; trend: string }>[];
}

function build(origin: { x: number; y: number }, content?: KpiHalfmoonContent): CanvasElement[] {
  const kpis = mergeFixedList<(typeof KPIS)[number]>(KPIS, content?.kpis);
  const elements: CanvasElement[] = [];

  kpis.forEach((kpi, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tileX = col * (CARD.width + GAP);
    const tileY = row * (CARD.height + GAP);

    elements.push(
      halfCircle({
        x: tileX + 24,
        y: tileY + CARD.height - PEDESTAL_HEIGHT,
        width: CARD.width - 48,
        height: PEDESTAL_HEIGHT,
        orientation: 'up',
        fill: accent.tint,
        fillRef: accentRef(accentIndex, 'tint'),
        name: `KPI ${i + 1} pedestal`,
      }),
      text({
        x: tileX,
        y: tileY + 16,
        width: CARD.width,
        height: 54,
        text: kpi.value,
        name: `KPI ${i + 1} value`,
        fontSize: 40,
        fontStyle: 'bold',
        align: 'center',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        lineHeight: 1,
      }),
      text({
        x: tileX,
        y: tileY + CARD.height - PEDESTAL_HEIGHT + 8,
        width: CARD.width,
        height: 22,
        text: kpi.label,
        name: `KPI ${i + 1} label`,
        fontSize: 14,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: tileX,
        y: tileY + CARD.height - PEDESTAL_HEIGHT + 32,
        width: CARD.width,
        height: 18,
        text: kpi.trend,
        name: `KPI ${i + 1} trend`,
        fontSize: 11,
        align: 'center',
        fill: MUTED,
        fillRef: 'muted',
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  KPIS.map((kpi, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD.width + GAP);
    const y = row * (CARD.height + GAP);
    return (
      `<path d="M${x + 24} ${y + CARD.height - PEDESTAL_HEIGHT} h${CARD.width - 48} v${PEDESTAL_HEIGHT} a${(CARD.width - 48) / 2} ${PEDESTAL_HEIGHT} 0 0 1 -${CARD.width - 48} 0 Z" fill="${accent.tint}"/>` +
      `<text x="${x + CARD.width / 2}" y="${y + 60}" text-anchor="middle" font-family="Inter" font-size="40" font-weight="700" fill="${accent.solid}">${kpi.value}</text>`
    );
  }).join('') +
  `</svg>`;

export const KPI_HALFMOON_TEMPLATE: InfographicTemplate = {
  id: 'template-kpi-halfmoon',
  label: 'KPI half-moon grid',
  tags: ['stats', 'kpi', 'dashboard', 'grid', 'metrics'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
