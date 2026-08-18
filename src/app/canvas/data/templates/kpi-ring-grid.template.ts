import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { halfCircle, mergeFixedList, rect, text, translate } from './template-kit';

const COLS = 2;
const ROWS = 2;
const CARD = { width: 250, height: 150 };
const GAP = 24;
const WIDTH = COLS * CARD.width + (COLS - 1) * GAP;
const HEIGHT = ROWS * CARD.height + (ROWS - 1) * GAP;
const TAB_WIDTH = 48;
const TAB_HEIGHT = 22;
const PANEL_TOP = 18;

const KPIS: { value: string; label: string; trend: string }[] = [
  { value: '412', label: 'Stories published', trend: 'Across every edition' },
  { value: '87%', label: 'Reader retention', trend: 'Month over month' },
  { value: '29', label: 'Contributing teams', trend: 'Company-wide' },
  { value: '5.2K', label: 'Comments & replies', trend: 'Since launch' },
];

/**
 * Four KPI tiles, each capped by a small half-circle accent tab poking above
 * its panel — a bordered-card alternative to `kpi-halfmoon.template.ts`'s
 * pedestal look, for the `kpi` shape pool.
 */
export interface KpiRingGridContent {
  /** Positionally merged onto the default 4 tiles — see `mergeFixedList`. */
  readonly kpis?: readonly Partial<{ value: string; label: string; trend: string }>[];
}

function build(origin: { x: number; y: number }, content?: KpiRingGridContent): CanvasElement[] {
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
      rect({
        x: tileX,
        y: tileY + PANEL_TOP,
        width: CARD.width,
        height: CARD.height - PANEL_TOP,
        fill: '#ffffff',
        fillRef: 'surface',
        stroke: BORDER,
        strokeRef: 'border',
        strokeWidth: 1,
        cornerRadius: 14,
        name: `KPI ${i + 1} panel`,
      }),
      halfCircle({
        x: tileX + CARD.width / 2 - TAB_WIDTH / 2,
        y: tileY,
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        orientation: 'up',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        name: `KPI ${i + 1} tab`,
      }),
      text({
        x: tileX + 20,
        y: tileY + PANEL_TOP + 20,
        width: CARD.width - 40,
        height: 40,
        text: kpi.value,
        name: `KPI ${i + 1} value`,
        fontSize: 30,
        fontStyle: 'bold',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        lineHeight: 1.1,
      }),
      text({
        x: tileX + 20,
        y: tileY + PANEL_TOP + 64,
        width: CARD.width - 40,
        height: 20,
        text: kpi.label,
        name: `KPI ${i + 1} label`,
        fontSize: 14,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: tileX + 20,
        y: tileY + PANEL_TOP + 86,
        width: CARD.width - 40,
        height: 18,
        text: kpi.trend,
        name: `KPI ${i + 1} trend`,
        fontSize: 11,
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
      `<rect x="${x}" y="${y + PANEL_TOP}" width="${CARD.width}" height="${CARD.height - PANEL_TOP}" rx="14" fill="#ffffff" stroke="${BORDER}"/>` +
      `<path d="M${x + CARD.width / 2 - TAB_WIDTH / 2} ${y + TAB_HEIGHT} h${TAB_WIDTH} a${TAB_WIDTH / 2} ${TAB_HEIGHT} 0 0 0 -${TAB_WIDTH} 0 Z" fill="${accent.solid}"/>` +
      `<text x="${x + 20}" y="${y + PANEL_TOP + 50}" font-family="Houschka Rounded Alt" font-size="30" font-weight="700" fill="${accent.solid}">${kpi.value}</text>`
    );
  }).join('') +
  `</svg>`;

export const KPI_RING_GRID_TEMPLATE: InfographicTemplate = {
  id: 'template-kpi-ring-grid',
  label: 'KPI tabbed grid',
  tags: ['stats', 'kpi', 'dashboard', 'grid', 'metrics'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
