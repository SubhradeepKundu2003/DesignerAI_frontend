import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENTS, BORDER, INK, MUTED } from './palette';
import { halfCircle, rect, text, translate } from './template-kit';

const WIDTH = 420;
const HEIGHT = 280;
const PADDING = 32;
const DOME_HEIGHT = 150;

const ACCENT = ACCENTS.indigo;
const STAT = '3.2x';
const STAT_LABEL = 'return on the pilot investment';
const HEADLINE = 'Growth at a glance';

/**
 * A single big stat sitting against a half-circle accent dome instead of
 * `stat-callout.template.ts`'s bordered side-panel layout — a second, more
 * graphic look for the `stat` shape pool so every one-number highlight in a
 * document doesn't render identically.
 */
export interface StatSpotlightContent {
  readonly stat?: string;
  readonly statLabel?: string;
  readonly headline?: string;
}

function build(origin: { x: number; y: number }, content?: StatSpotlightContent): CanvasElement[] {
  const stat = content?.stat ?? STAT;
  const statLabel = content?.statLabel ?? STAT_LABEL;
  const headline = content?.headline ?? HEADLINE;
  const elements: CanvasElement[] = [];

  elements.push(
    rect({ x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#ffffff', fillRef: 'surface', stroke: BORDER, strokeRef: 'border', strokeWidth: 1, cornerRadius: 20, name: 'Spotlight panel' }),
    halfCircle({
      x: 20,
      y: HEIGHT - DOME_HEIGHT,
      width: WIDTH - 40,
      height: DOME_HEIGHT,
      orientation: 'up',
      fill: ACCENT.tint,
      fillRef: 'accent-0-tint',
      name: 'Spotlight dome',
    }),
    text({
      x: PADDING,
      y: 26,
      width: WIDTH - PADDING * 2,
      height: 24,
      text: headline,
      name: 'Headline',
      fontSize: 15,
      fontStyle: 'bold',
      align: 'center',
      fill: MUTED,
      fillRef: 'muted',
    }),
    text({
      x: PADDING,
      y: 86,
      width: WIDTH - PADDING * 2,
      height: 76,
      text: stat,
      name: 'Stat value',
      fontSize: 64,
      fontStyle: 'bold',
      align: 'center',
      fill: ACCENT.solid,
      fillRef: 'accent-0-solid',
      lineHeight: 1,
    }),
    text({
      x: PADDING,
      y: 172,
      width: WIDTH - PADDING * 2,
      height: 46,
      text: statLabel,
      name: 'Stat label',
      fontSize: 15,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.3,
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20" fill="#ffffff" stroke="${BORDER}"/>` +
  `<path d="M20 ${HEIGHT - DOME_HEIGHT} h${WIDTH - 40} v${DOME_HEIGHT} a${(WIDTH - 40) / 2} ${DOME_HEIGHT} 0 0 1 -${WIDTH - 40} 0 Z" fill="${ACCENT.tint}"/>` +
  `<text x="${WIDTH / 2}" y="150" text-anchor="middle" font-family="Houschka Rounded Alt" font-size="64" font-weight="700" fill="${ACCENT.solid}">${STAT}</text>` +
  `</svg>`;

export const STAT_SPOTLIGHT_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-spotlight',
  label: 'Stat spotlight dome',
  tags: ['stat', 'spotlight', 'highlight', 'metric'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
