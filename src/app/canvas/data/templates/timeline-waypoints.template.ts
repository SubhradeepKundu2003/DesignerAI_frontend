import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { connector, halfCircle, mergeFixedList, text, translate } from './template-kit';

const WIDTH = 698;
const ROW_HEIGHT = 86;
const NODE_W = 48;
const NODE_H = 36;

const STEPS: { title: string; body: string }[] = [
  { title: 'Kickoff', body: 'Align stakeholders and lock the brief.' },
  { title: 'Draft', body: 'Put the first version in front of readers.' },
  { title: 'Review', body: 'Gather feedback from every stakeholder.' },
  { title: 'Polish', body: 'Tighten copy, design and data together.' },
  { title: 'Publish', body: 'Send it out and track how it lands.' },
];

const HEIGHT = STEPS.length * ROW_HEIGHT;

/**
 * A vertical timeline whose waypoint markers are half-circle "signpost"
 * shapes rather than `vertical-timeline.template.ts`'s plain filled dots —
 * a second look for the `timeline` shape pool.
 */
export interface TimelineWaypointsContent {
  /** Positionally merged onto the default 5 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: TimelineWaypointsContent): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const elements: CanvasElement[] = [];
  const spineX = NODE_W / 2;
  const firstCy = ROW_HEIGHT / 2;
  const lastCy = (steps.length - 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

  elements.push(
    connector({ x: spineX, y: firstCy }, { x: spineX, y: lastCy }, { name: 'Spine', stroke: '#e2e4e9', strokeRef: 'border', strokeWidth: 3 }),
  );

  steps.forEach((step, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const rowTop = i * ROW_HEIGHT;
    const cy = rowTop + ROW_HEIGHT / 2;

    elements.push(
      halfCircle({
        x: 0,
        y: cy - NODE_H,
        width: NODE_W,
        height: NODE_H,
        orientation: 'up',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        name: `Waypoint ${i + 1} marker`,
      }),
      text({
        x: 0,
        y: cy - NODE_H + 6,
        width: NODE_W,
        height: 20,
        text: String(i + 1).padStart(2, '0'),
        name: `Waypoint ${i + 1} number`,
        fontSize: 13,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.2,
      }),
      text({
        x: NODE_W + 22,
        y: rowTop + 14,
        width: WIDTH - NODE_W - 22 - 10,
        height: 20,
        text: step.title,
        name: `Waypoint ${i + 1} title`,
        fontSize: 16,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: NODE_W + 22,
        y: rowTop + 38,
        width: WIDTH - NODE_W - 22 - 10,
        height: 36,
        text: step.body,
        name: `Waypoint ${i + 1} body`,
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
  `<line x1="${NODE_W / 2}" y1="${ROW_HEIGHT / 2}" x2="${NODE_W / 2}" y2="${(STEPS.length - 1) * ROW_HEIGHT + ROW_HEIGHT / 2}" stroke="${BORDER}" stroke-width="3"/>` +
  STEPS.map((_, i) => {
    const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return (
      `<path d="M0 ${cy} v-${NODE_H} h${NODE_W} v${NODE_H} a${NODE_W / 2} ${NODE_H} 0 0 1 -${NODE_W} 0 Z" fill="${accent.solid}"/>` +
      `<rect x="${NODE_W + 22}" y="${cy - 8}" width="300" height="16" rx="4" fill="${BORDER}"/>`
    );
  }).join('') +
  `</svg>`;

export const TIMELINE_WAYPOINTS_TEMPLATE: InfographicTemplate = {
  id: 'template-timeline-waypoints',
  label: 'Timeline with waypoint markers',
  tags: ['timeline', 'steps', 'milestones', 'waypoints'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
