import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, connector, mergeFixedList, text, translate } from './template-kit';

const NODE_D = 44;
const COL_WIDTH = 156;
const WIDTH = 4 * COL_WIDTH;
const NODE_Y = 0;
const LABEL_Y = NODE_D + 18;
const HEIGHT = LABEL_Y + 60;

const STEPS: { title: string; body: string }[] = [
  { title: 'Sign up', body: 'Create an account in under a minute' },
  { title: 'Connect', body: 'Link your existing tools and data' },
  { title: 'Configure', body: 'Set the rules that fit your team' },
  { title: 'Launch', body: 'Go live and track results' },
];

/**
 * A straight horizontal progress stepper — numbered nodes on one connecting
 * line, the onboarding/checkout-flow shape. Distinct from
 * `arc-process.template.ts` (bulging ribbon connectors, icon nodes) and the
 * zigzag/vertical timelines: every node sits on one unbroken straight line.
 */
export interface StepTrackerContent {
  /** Positionally merged onto the default 4 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: StepTrackerContent): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const elements: CanvasElement[] = [];
  const centerY = NODE_D / 2;
  const centers = steps.map((_, i) => i * COL_WIDTH + COL_WIDTH / 2);

  elements.push(
    connector(
      { x: centers[0], y: centerY },
      { x: centers[centers.length - 1], y: centerY },
      { name: 'Connector line', stroke: BORDER, strokeRef: 'border', strokeWidth: 3 },
    ),
  );

  steps.forEach((step, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const cx = centers[i];

    elements.push(
      circle({
        x: cx - NODE_D / 2,
        y: NODE_Y,
        diameter: NODE_D,
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        stroke: '#ffffff',
        strokeWidth: 3,
        name: `Step ${i + 1} node`,
      }),
      text({
        x: cx - NODE_D / 2,
        y: NODE_Y + NODE_D / 2 - 10,
        width: NODE_D,
        height: 20,
        text: String(i + 1),
        name: `Step ${i + 1} number`,
        fontSize: 17,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: cx - COL_WIDTH / 2 + 8,
        y: LABEL_Y,
        width: COL_WIDTH - 16,
        height: 20,
        text: step.title,
        name: `Step ${i + 1} title`,
        fontSize: 14.5,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: cx - COL_WIDTH / 2 + 8,
        y: LABEL_Y + 22,
        width: COL_WIDTH - 16,
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

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<line x1="${COL_WIDTH / 2}" y1="${NODE_D / 2}" x2="${WIDTH - COL_WIDTH / 2}" y2="${NODE_D / 2}" stroke="${BORDER}" stroke-width="3"/>` +
  STEPS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const cx = i * COL_WIDTH + COL_WIDTH / 2;
    return `<circle cx="${cx}" cy="${NODE_D / 2}" r="${NODE_D / 2}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const STEP_TRACKER_TEMPLATE: InfographicTemplate = {
  id: 'template-step-tracker',
  label: 'Horizontal step tracker',
  tags: ['process', 'steps', 'onboarding', 'progress', 'numbered'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
