import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { frame, icon, mergeFixedList, text, translate } from './template-kit';

const COLS = 2;
const ROWS = 2;
const CARD = { width: 260, height: 154 };
const GAP = 24;
const WIDTH = COLS * CARD.width + (COLS - 1) * GAP;
const HEIGHT = ROWS * CARD.height + (ROWS - 1) * GAP;

const CARD_PADDING = 18;
const CARD_GAP = 8;
const CONTENT_WIDTH = CARD.width - CARD_PADDING * 2;
const ICON_SIZE = 24;

const KPIS: { value: string; label: string; trend: string; iconName: IconName }[] = [
  { value: '+8.3%', label: 'Revenue growth', trend: 'Year over year', iconName: 'trendUp' },
  { value: '600K+', label: 'Global associates', trend: 'Across 55+ countries', iconName: 'users' },
  { value: '150+', label: 'Active client accounts', trend: 'Enterprise & mid-market', iconName: 'target' },
  { value: '4.6/5', label: 'Client satisfaction', trend: 'Internal survey average', iconName: 'star' },
];

/**
 * Four big-number dashboard tiles in a 2x2 grid — distinct from
 * `stat-row.template.ts` (a single row of three badge+value stats) in that
 * each tile is its own bordered card carrying a third line of supporting
 * context, closer to a KPI dashboard widget than an inline stat strip.
 */
function buildCard(kpi: (typeof KPIS)[number], index: number): CanvasElement[] {
  const accentIndex = index % ACCENT_CYCLE.length;
  const accent = ACCENT_CYCLE[accentIndex];

  const cardIcon = icon({
    x: 0,
    y: 0,
    size: ICON_SIZE,
    name: kpi.iconName,
    color: accent.solid,
    fillRef: accentRef(accentIndex, 'solid'),
    label: `KPI ${index + 1} icon`,
  });
  const value = text({
    x: 0,
    y: 0,
    width: CONTENT_WIDTH,
    height: 36,
    text: kpi.value,
    name: `KPI ${index + 1} value`,
    fontSize: 30,
    fontStyle: 'bold',
    fill: accent.solid,
    fillRef: accentRef(accentIndex, 'solid'),
    lineHeight: 1.1,
  });
  const label = text({
    x: 0,
    y: 0,
    width: CONTENT_WIDTH,
    height: 18,
    text: kpi.label,
    name: `KPI ${index + 1} label`,
    fontSize: 14,
    fontStyle: 'bold',
    fill: INK,
    fillRef: 'ink',
    lineHeight: 1.2,
  });
  const trend = text({
    x: 0,
    y: 0,
    width: CONTENT_WIDTH,
    height: 16,
    text: kpi.trend,
    name: `KPI ${index + 1} trend`,
    fontSize: 11.5,
    fill: MUTED,
    fillRef: 'muted',
    lineHeight: 1.3,
  });

  return frame({
    x: 0,
    y: 0,
    name: `KPI card ${index + 1}`,
    layout: 'column',
    gap: CARD_GAP,
    padding: CARD_PADDING,
    background: '#ffffff',
    fillRef: 'surface',
    children: [cardIcon, value, label, trend],
  });
}

function buildRow(kpis: readonly (typeof KPIS)[number][], rowIndex: number): CanvasElement[] {
  const cardBundles = kpis.map((kpi, i) => buildCard(kpi, rowIndex * COLS + i));
  const row = frame({
    x: 0,
    y: 0,
    name: `KPI row ${rowIndex + 1}`,
    layout: 'row',
    gap: GAP,
    padding: 0,
    children: cardBundles.map((bundle) => bundle[0]),
  });
  const [rowFrame, ...positionedCards] = row;

  const cardElements = cardBundles.flatMap((bundle, i) => translate(bundle, positionedCards[i]));

  return [rowFrame, ...cardElements];
}

export interface KpiDashboardContent {
  /** Positionally merged onto the default 4 tiles — see `mergeFixedList`. */
  readonly kpis?: readonly Partial<{ value: string; label: string; trend: string }>[];
}

function build(origin: { x: number; y: number }, content?: KpiDashboardContent): CanvasElement[] {
  const kpis = mergeFixedList<(typeof KPIS)[number]>(KPIS, content?.kpis);
  const rows = [buildRow(kpis.slice(0, COLS), 0), buildRow(kpis.slice(COLS), 1)];
  const outer = frame({
    x: 0,
    y: 0,
    name: 'KPI dashboard',
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
  KPIS.map((_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (CARD.width + GAP);
    const y = row * (CARD.height + GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return (
      `<rect x="${x}" y="${y}" width="${CARD.width}" height="${CARD.height}" rx="12" fill="#ffffff" stroke="${BORDER}"/>` +
      `<circle cx="${x + 30}" cy="${y + 28}" r="10" fill="${accent.solid}"/>` +
      `<rect x="${x + 18}" y="${y + 52}" width="90" height="26" rx="4" fill="${accent.solid}"/>` +
      `<rect x="${x + 18}" y="${y + 88}" width="${CARD.width - 36}" height="10" rx="3" fill="${BORDER}"/>`
    );
  }).join('') +
  `</svg>`;

export const KPI_DASHBOARD_TEMPLATE: InfographicTemplate = {
  id: 'template-kpi-dashboard',
  label: 'Four-tile KPI dashboard',
  tags: ['stats', 'kpi', 'dashboard', 'grid', 'metrics'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
