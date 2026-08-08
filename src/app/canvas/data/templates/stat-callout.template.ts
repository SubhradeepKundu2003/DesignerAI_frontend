import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENTS, BORDER, INK, MUTED } from './palette';
import { connector, icon, rect, text, translate } from './template-kit';

const WIDTH = 698;
const HEIGHT = 190;
const LEFT_WIDTH = 260;
const DIVIDER_X = LEFT_WIDTH + 18;
const RIGHT_X = DIVIDER_X + 38;

const ACCENT = ACCENTS.indigo;
const ICON_NAME: IconName = 'trendUp';
const STAT = '87%';
const STAT_LABEL = 'faster onboarding';
const HEADLINE = 'Teams that used the new template hit their first milestone in under a week.';
const BODY = 'Rolled out across 40 pilot teams over the last quarter, measured from kickoff to first shipped result.';

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  elements.push(
    rect({ x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#ffffff', fillRef: 'surface', stroke: BORDER, strokeRef: 'border', strokeWidth: 1, cornerRadius: 20, name: 'Callout panel' }),
    rect({ x: 0, y: 0, width: 8, height: HEIGHT, fill: ACCENT.solid, fillRef: 'accent-0-solid', cornerRadius: 4, name: 'Accent bar' }),

    icon({ x: 40, y: 28, size: 30, name: ICON_NAME, color: ACCENT.solid, fillRef: 'accent-0-solid', label: 'Stat icon' }),
    text({
      x: 40,
      y: 66,
      width: LEFT_WIDTH - 40,
      height: 68,
      text: STAT,
      name: 'Stat value',
      fontSize: 56,
      fontStyle: 'bold',
      fill: ACCENT.solid,
      fillRef: 'accent-0-solid',
      lineHeight: 1,
    }),
    text({
      x: 40,
      y: 138,
      width: LEFT_WIDTH - 40,
      height: 20,
      text: STAT_LABEL,
      name: 'Stat label',
      fontSize: 13.5,
      fill: MUTED,
      fillRef: 'muted',
    }),

    connector({ x: DIVIDER_X, y: 24 }, { x: DIVIDER_X, y: HEIGHT - 24 }, { name: 'Divider', stroke: BORDER, strokeRef: 'border', strokeWidth: 2 }),

    text({
      x: RIGHT_X,
      y: 30,
      width: WIDTH - RIGHT_X - 32,
      height: 68,
      text: HEADLINE,
      name: 'Headline',
      fontSize: 19,
      fontStyle: 'bold',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.3,
    }),
    text({
      x: RIGHT_X,
      y: 108,
      width: WIDTH - RIGHT_X - 32,
      height: 60,
      text: BODY,
      name: 'Supporting body',
      fontSize: 13.5,
      fill: MUTED,
      fillRef: 'muted',
      lineHeight: 1.4,
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20" fill="#ffffff" stroke="${BORDER}"/>` +
  `<rect x="0" y="0" width="8" height="${HEIGHT}" rx="4" fill="${ACCENT.solid}"/>` +
  `<text x="40" y="120" font-family="Inter" font-size="56" font-weight="700" fill="${ACCENT.solid}">${STAT}</text>` +
  `<line x1="${DIVIDER_X}" y1="24" x2="${DIVIDER_X}" y2="${HEIGHT - 24}" stroke="${BORDER}" stroke-width="2"/>` +
  `</svg>`;

export const STAT_CALLOUT_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-callout',
  label: 'Big-stat headline callout',
  tags: ['stat', 'callout', 'highlight', 'metric'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
