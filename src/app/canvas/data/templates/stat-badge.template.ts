import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENTS, BORDER, MUTED } from './palette';
import { circle, halfCircle, icon, rect, text, translate } from './template-kit';

const WIDTH = 320;
const HEIGHT = 200;
const PADDING = 28;
const BADGE_D = 52;

const ACCENT = ACCENTS.teal;
const ICON_NAME: IconName = 'award';
const STAT = '92%';
const STAT_LABEL = 'renewal rate this year';

/**
 * A compact boxed stat, capped by a small half-circle flourish in the corner
 * — a smaller, denser alternative to `stat-spotlight.template.ts` for the
 * `stat` shape pool, meant for grids of several stats side by side.
 */
export interface StatBadgeContent {
  readonly stat?: string;
  readonly statLabel?: string;
}

function build(origin: { x: number; y: number }, content?: StatBadgeContent): CanvasElement[] {
  const stat = content?.stat ?? STAT;
  const statLabel = content?.statLabel ?? STAT_LABEL;
  const elements: CanvasElement[] = [];

  elements.push(
    rect({ x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#ffffff', fillRef: 'surface', stroke: BORDER, strokeRef: 'border', strokeWidth: 1, cornerRadius: 16, name: 'Badge panel' }),
    halfCircle({
      x: WIDTH - 80,
      y: 0,
      width: 80,
      height: 40,
      orientation: 'down',
      fill: ACCENT.tint,
      fillRef: 'accent-1-tint',
      name: 'Corner flourish',
    }),
    circle({ x: PADDING, y: PADDING, diameter: BADGE_D, fill: ACCENT.tint, fillRef: 'accent-1-tint', name: 'Icon badge' }),
    icon({
      x: PADDING + (BADGE_D - 28) / 2,
      y: PADDING + (BADGE_D - 28) / 2,
      size: 28,
      name: ICON_NAME,
      color: ACCENT.solid,
      fillRef: 'accent-1-solid',
      label: 'Stat icon',
    }),
    text({
      x: PADDING,
      y: PADDING + BADGE_D + 16,
      width: WIDTH - PADDING * 2,
      height: 56,
      text: stat,
      name: 'Stat value',
      fontSize: 44,
      fontStyle: 'bold',
      fill: ACCENT.solid,
      fillRef: 'accent-1-solid',
      lineHeight: 1,
    }),
    text({
      x: PADDING,
      y: PADDING + BADGE_D + 76,
      width: WIDTH - PADDING * 2,
      height: 24,
      text: statLabel,
      name: 'Stat label',
      fontSize: 13,
      fill: MUTED,
      fillRef: 'muted',
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff" stroke="${BORDER}"/>` +
  `<circle cx="${WIDTH - 40}" cy="0" r="40" fill="${ACCENT.tint}"/>` +
  `<circle cx="${PADDING + BADGE_D / 2}" cy="${PADDING + BADGE_D / 2}" r="${BADGE_D / 2}" fill="${ACCENT.tint}"/>` +
  `<text x="${PADDING}" y="150" font-family="Houschka Rounded Alt" font-size="44" font-weight="700" fill="${ACCENT.solid}">${STAT}</text>` +
  `</svg>`;

export const STAT_BADGE_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-badge',
  label: 'Compact stat badge',
  tags: ['stat', 'badge', 'compact', 'metric'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
