import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { circle, connector, icon, mergeFixedList, text, translate } from './template-kit';

const WIDTH = 780;
const NODE_D = 88;
const ARC_R = NODE_D / 2 + 14;
const COL_W = WIDTH / 5;
const CENTER_Y = 210;
const CALLOUT_W = COL_W - 14;
const STUB = 26;
const DOT_D = 8;

const STEPS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Insert text', body: 'A short line for this milestone.', iconName: 'flag' },
  { title: 'Insert text', body: 'A short line for this milestone.', iconName: 'compass' },
  { title: 'Insert text', body: 'A short line for this milestone.', iconName: 'lightbulb' },
  { title: 'Insert text', body: 'A short line for this milestone.', iconName: 'trendUp' },
  { title: 'Insert text', body: 'A short line for this milestone.', iconName: 'award' },
];

/**
 * Each node gets a partial-ring "bracket" behind its icon circle — not
 * expressible as a native shape (a `ShapeElement` circle has no partial
 * sweep), so the five brackets are one decorative SVG behind the native,
 * editable icon nodes and their stem-and-dot labels.
 */
function bracketsSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const circumference = 2 * Math.PI * ARC_R;
  const sweep = circumference * 0.72;
  const rings = STEPS.map((_, i) => {
    const cx = i * COL_W + COL_W / 2;
    const accent = palette[i % palette.length];
    return `<circle cx="${cx}" cy="${CENTER_Y}" r="${ARC_R}" fill="none" stroke="${accent.solid}" stroke-width="9" stroke-dasharray="${sweep} ${circumference - sweep}" stroke-dashoffset="${circumference * 0.14}" transform="rotate(90 ${cx} ${CENTER_Y})"/>`;
  }).join('');
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${CENTER_Y * 2}" viewBox="0 0 ${WIDTH} ${CENTER_Y * 2}">${rings}</svg>`)}`;
}

export interface CircularStepTimelineContent {
  /** Positionally merged onto the default 5 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: CircularStepTimelineContent, theme?: DesignTheme): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const accents = theme?.colors.accents ?? ACCENT_CYCLE;
  const elements: CanvasElement[] = [];

  const brackets: ImageElement = {
    id: generateId(),
    name: 'Node brackets',
    x: 0,
    y: 0,
    width: WIDTH,
    height: CENTER_Y * 2,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: bracketsSvg(accents),
  };
  elements.push(brackets);

  steps.forEach((step, i) => {
    const accent = accents[i % accents.length];
    const cx = i * COL_W + COL_W / 2;
    const above = i % 2 === 0;
    const stemFrom = { x: cx, y: above ? CENTER_Y - ARC_R : CENTER_Y + ARC_R };
    const stemTo = { x: cx, y: above ? stemFrom.y - STUB : stemFrom.y + STUB };
    const calloutY = above ? stemTo.y - 62 : stemTo.y + 12;

    elements.push(
      circle({ x: cx - NODE_D / 2, y: CENTER_Y - NODE_D / 2, diameter: NODE_D, fill: '#ffffff', stroke: accent.solid, strokeWidth: 3, name: `Node ${i + 1}` }),
      icon({ x: cx - 18, y: CENTER_Y - 18, size: 36, name: step.iconName, color: accent.solid, label: `Node ${i + 1} icon` }),
      connector(stemFrom, stemTo, { name: `Node ${i + 1} stem`, stroke: '#c7ccd6', strokeWidth: 2 }),
      circle({ x: stemTo.x - DOT_D / 2, y: stemTo.y - DOT_D / 2, diameter: DOT_D, fill: '#ffffff', stroke: '#c7ccd6', strokeWidth: 2, name: `Node ${i + 1} stem dot` }),
      text({
        x: cx - CALLOUT_W / 2,
        y: calloutY,
        width: CALLOUT_W,
        height: 20,
        text: step.title,
        name: `Step ${i + 1} title`,
        fontSize: 14,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: cx - CALLOUT_W / 2,
        y: calloutY + 22,
        width: CALLOUT_W,
        height: 36,
        text: step.body,
        name: `Step ${i + 1} body`,
        fontSize: 11.5,
        align: 'center',
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.3,
      }),
    );
  });

  return translate(elements, origin);
}

const HEIGHT = CENTER_Y * 2;

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  STEPS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const cx = i * COL_W + COL_W / 2;
    return `<circle cx="${cx}" cy="${CENTER_Y}" r="${NODE_D / 2}" fill="#fff" stroke="${accent.solid}" stroke-width="4"/>`;
  }).join('') +
  `</svg>`;

export const CIRCULAR_STEP_TIMELINE_TEMPLATE: InfographicTemplate = {
  id: 'template-circular-step-timeline',
  label: 'Five-step circular timeline',
  tags: ['timeline', 'steps', 'icons', 'circular'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
