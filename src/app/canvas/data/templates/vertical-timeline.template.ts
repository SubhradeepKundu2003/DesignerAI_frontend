import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, connector, mergeFixedList, text, translate } from './template-kit';

const WIDTH = 698;
const ROW_HEIGHT = 86;
const NODE_D = 44;

const STEPS: { title: string; body: string }[] = [
  { title: 'Research', body: 'Understand the problem before proposing a fix.' },
  { title: 'Concept', body: 'Sketch a few directions worth exploring.' },
  { title: 'Prototype', body: 'Build the smallest version that proves it out.' },
  { title: 'Refine', body: 'Tighten it up based on what you learned.' },
  { title: 'Ship', body: 'Release it, then watch how it actually gets used.' },
];

const HEIGHT = STEPS.length * ROW_HEIGHT;

export interface VerticalTimelineContent {
  /** Positionally merged onto the default 5 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: VerticalTimelineContent): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const elements: CanvasElement[] = [];
  const nodeCx = NODE_D / 2;
  const firstCy = ROW_HEIGHT / 2;
  const lastCy = (steps.length - 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

  elements.push(
    connector({ x: nodeCx, y: firstCy }, { x: nodeCx, y: lastCy }, { name: 'Spine', stroke: BORDER, strokeRef: 'border', strokeWidth: 3 }),
  );

  steps.forEach((step, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const rowTop = i * ROW_HEIGHT;
    const cy = rowTop + ROW_HEIGHT / 2;

    elements.push(
      circle({ x: 0, y: cy - NODE_D / 2, diameter: NODE_D, fill: accent.solid, fillRef: accentRef(accentIndex, 'solid'), name: `Milestone ${i + 1}` }),
      text({
        x: 0,
        y: cy - 11,
        width: NODE_D,
        height: 22,
        text: String(i + 1).padStart(2, '0'),
        name: `Milestone ${i + 1} label`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.2,
      }),
      text({
        x: NODE_D + 22,
        y: rowTop + 14,
        width: WIDTH - NODE_D - 22 - 10,
        height: 20,
        text: step.title,
        name: `Milestone ${i + 1} title`,
        fontSize: 16,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: NODE_D + 22,
        y: rowTop + 38,
        width: WIDTH - NODE_D - 22 - 10,
        height: 36,
        text: step.body,
        name: `Milestone ${i + 1} body`,
        fontSize: 13,
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.35,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<line x1="${NODE_D / 2}" y1="${ROW_HEIGHT / 2}" x2="${NODE_D / 2}" y2="${(STEPS.length - 1) * ROW_HEIGHT + ROW_HEIGHT / 2}" stroke="${BORDER}" stroke-width="3"/>` +
  STEPS.map((_, i) => {
    const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
    return `<circle cx="${NODE_D / 2}" cy="${cy}" r="${NODE_D / 2}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}"/><rect x="${NODE_D + 22}" y="${cy - 8}" width="300" height="16" rx="4" fill="${BORDER}"/>`;
  }).join('') +
  `</svg>`;

export const VERTICAL_TIMELINE_TEMPLATE: InfographicTemplate = {
  id: 'template-vertical-timeline',
  label: 'Five-step vertical timeline',
  tags: ['timeline', 'steps', 'milestones', 'vertical'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
