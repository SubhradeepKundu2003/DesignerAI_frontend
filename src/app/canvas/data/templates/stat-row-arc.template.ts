import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, MUTED, accentRef } from './palette';
import { connector, halfCircle, mergeFixedList, text, translate } from './template-kit';

const COLS = 3;
const COL_WIDTH = 216;
const GAP = 25;
const WIDTH = COLS * COL_WIDTH + (COLS - 1) * GAP;
const HEIGHT = 150;
const ARC_WIDTH = 140;

const STATS: { value: string; label: string }[] = [
  { value: '12%', label: 'Cost reduction' },
  { value: '3.4x', label: 'Faster turnaround' },
  { value: '98%', label: 'On-time delivery' },
];

/**
 * Three stats, each underlined by a shallow half-circle arc instead of
 * `stat-row.template.ts`'s icon badges — a leaner alternative for the
 * `stat_row` shape pool.
 */
export interface StatRowArcContent {
  /** Positionally merged onto the default 3 stats — see `mergeFixedList`. */
  readonly stats?: readonly Partial<{ value: string; label: string }>[];
}

function build(origin: { x: number; y: number }, content?: StatRowArcContent): CanvasElement[] {
  const stats = mergeFixedList<(typeof STATS)[number]>(STATS, content?.stats);
  const elements: CanvasElement[] = [];

  stats.forEach((stat, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const colX = i * (COL_WIDTH + GAP);

    elements.push(
      text({
        x: colX,
        y: 16,
        width: COL_WIDTH,
        height: 48,
        text: stat.value,
        name: `Stat ${i + 1} value`,
        fontSize: 36,
        fontStyle: 'bold',
        align: 'center',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        lineHeight: 1.1,
      }),
      halfCircle({
        x: colX + (COL_WIDTH - ARC_WIDTH) / 2,
        y: 74,
        width: ARC_WIDTH,
        height: 10,
        orientation: 'down',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        name: `Stat ${i + 1} arc`,
      }),
      text({
        x: colX,
        y: 96,
        width: COL_WIDTH,
        height: 40,
        text: stat.label,
        name: `Stat ${i + 1} label`,
        fontSize: 13,
        align: 'center',
        fill: MUTED,
        fillRef: 'muted',
      }),
    );

    if (i > 0) {
      const gapX = colX - GAP / 2;
      elements.push(
        connector({ x: gapX, y: 12 }, { x: gapX, y: HEIGHT - 12 }, { name: `Divider ${i}`, stroke: '#e2e4e9', strokeRef: 'border', strokeWidth: 1 }),
      );
    }
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  STATS.map((stat, i) => {
    const colX = i * (COL_WIDTH + GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return (
      `<text x="${colX + COL_WIDTH / 2}" y="60" text-anchor="middle" font-family="Houschka Rounded Alt" font-size="36" font-weight="700" fill="${accent.solid}">${stat.value}</text>` +
      `<path d="M${colX + (COL_WIDTH - ARC_WIDTH) / 2} 74 h${ARC_WIDTH} a${ARC_WIDTH / 2} 10 0 0 1 -${ARC_WIDTH} 0 Z" fill="${accent.solid}"/>`
    );
  }).join('') +
  `</svg>`;

export const STAT_ROW_ARC_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-row-arc',
  label: 'Three-stat arc row',
  tags: ['stats', 'metrics', 'row', 'arc'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
