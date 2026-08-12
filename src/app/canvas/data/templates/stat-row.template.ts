import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, MUTED, accentRef } from './palette';
import { circle, connector, frame, icon, mergeFixedList, text, translate } from './template-kit';

const COLS = 3;
const COL_WIDTH = 216;
const GAP = 25;
const WIDTH = COLS * COL_WIDTH + (COLS - 1) * GAP;
const HEIGHT = 180;

const BADGE_DIAMETER = 56;
// Badges are narrower than a column, so their row needs a wider gap than the
// value/label rows to land on the same column centres — see the worked
// example in this template's build() below.
const BADGE_ROW_X = (COL_WIDTH - BADGE_DIAMETER) / 2;
const BADGE_GAP = COL_WIDTH + GAP - BADGE_DIAMETER;

const STATS: { value: string; label: string; iconName: IconName }[] = [
  { value: '150+', label: 'New clients', iconName: 'users' },
  { value: '24/7', label: 'Support coverage', iconName: 'trendUp' },
  { value: '99%', label: 'Satisfaction', iconName: 'check' },
];

export interface StatRowContent {
  /** Positionally merged onto the default 3 stats — see `mergeFixedList`. */
  readonly stats?: readonly Partial<{ value: string; label: string }>[];
}

/**
 * Rebuilt on Frames (Track D3): three flat, single-axis row-frames — badges,
 * values, labels — rather than one frame per column, because a badge's icon
 * *overlaps* its circle rather than stacking after it, and `FrameElement`
 * (v1) only ever stacks children sequentially along one axis, never overlaid.
 * Icons ride along as siblings positioned from the badges row's own resolved
 * output, not frame children themselves — this is the same "auto-layout row
 * plus a pinned overlay" split real design tools use for a badge-in-circle.
 */
function build(origin: { x: number; y: number }, content?: StatRowContent): CanvasElement[] {
  const stats = mergeFixedList<(typeof STATS)[number]>(STATS, content?.stats);
  const elements: CanvasElement[] = [];

  const badges = stats.map((_, i) =>
    circle({
      x: 0,
      y: 0,
      diameter: BADGE_DIAMETER,
      fill: ACCENT_CYCLE[i].tint,
      fillRef: accentRef(i, 'tint'),
      name: `Stat ${i + 1} badge`,
    }),
  );
  const badgeRow = frame({
    x: BADGE_ROW_X,
    y: 20,
    name: 'Stat badges',
    layout: 'row',
    gap: BADGE_GAP,
    padding: 0,
    children: badges,
  });
  const positionedBadges = badgeRow.slice(1);

  const values = stats.map((stat, i) =>
    text({
      x: 0,
      y: 0,
      width: COL_WIDTH,
      height: 42,
      text: stat.value,
      name: `Stat ${i + 1} value`,
      fontSize: 32,
      fontStyle: 'bold',
      align: 'center',
      fill: ACCENT_CYCLE[i].solid,
      fillRef: accentRef(i, 'solid'),
      lineHeight: 1.1,
    }),
  );
  const valueRow = frame({
    x: 0,
    y: 20 + BADGE_DIAMETER + 12,
    name: 'Stat values',
    layout: 'row',
    gap: GAP,
    padding: 0,
    children: values,
  });

  const labels = stats.map((stat, i) =>
    text({
      x: 0,
      y: 0,
      width: COL_WIDTH,
      height: 20,
      text: stat.label,
      name: `Stat ${i + 1} label`,
      fontSize: 13,
      align: 'center',
      fill: MUTED,
      fillRef: 'muted',
    }),
  );
  const labelRow = frame({
    x: 0,
    y: 20 + BADGE_DIAMETER + 12 + 42,
    name: 'Stat labels',
    layout: 'row',
    gap: GAP,
    padding: 0,
    children: labels,
  });

  elements.push(...badgeRow, ...valueRow, ...labelRow);

  stats.forEach((stat, i) => {
    const badge = positionedBadges[i];
    elements.push(
      icon({
        x: badge.x + (BADGE_DIAMETER - 28) / 2,
        y: badge.y + (BADGE_DIAMETER - 28) / 2,
        size: 28,
        name: stat.iconName,
        color: ACCENT_CYCLE[i].solid,
        fillRef: accentRef(i, 'solid'),
        label: `Stat ${i + 1} icon`,
      }),
    );

    if (i > 0) {
      const gapX = i * (COL_WIDTH + GAP) - GAP / 2;
      elements.push(
        connector(
          { x: gapX, y: 12 },
          { x: gapX, y: HEIGHT - 12 },
          { name: `Divider ${i}`, stroke: BORDER, strokeRef: 'border', strokeWidth: 1 },
        ),
      );
    }
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  STATS.map((_, i) => {
    const colX = i * (COL_WIDTH + GAP);
    const accent = ACCENT_CYCLE[i];
    return `<circle cx="${colX + COL_WIDTH / 2}" cy="48" r="28" fill="${accent.tint}"/><rect x="${colX}" y="100" width="${COL_WIDTH}" height="30" rx="6" fill="${accent.tint}"/>`;
  }).join('') +
  `</svg>`;

export const STAT_ROW_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-row',
  label: 'Three-stat highlight row',
  tags: ['stats', 'metrics', 'row'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
