import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, connector, text, translate } from './template-kit';

const WIDTH = 698;
const HEIGHT = 280;
const CENTER_Y = 140;
const MARGIN_X = 40;
const NODE_D = 56;
const CALLOUT = { width: 180, height: 90 };

const NODE_X = [0, 1, 2, 3].map((i) => MARGIN_X + i * ((WIDTH - MARGIN_X * 2) / 3));

const STEPS: { title: string; body: string }[] = [
  { title: 'Kickoff', body: 'Align on scope, owners and the deadline.' },
  { title: 'Build', body: 'Do the core work in short, reviewable passes.' },
  { title: 'Test', body: 'Check it against the goal before it ships.' },
  { title: 'Launch', body: 'Release it and hand off what comes next.' },
];

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  elements.push(
    connector({ x: NODE_X[0], y: CENTER_Y }, { x: NODE_X[3], y: CENTER_Y }, { name: 'Spine', stroke: BORDER, strokeRef: 'border', strokeWidth: 3 }),
  );

  STEPS.forEach((step, i) => {
    const accent = ACCENT_CYCLE[i];
    const cx = NODE_X[i];
    const above = i % 2 === 0;
    const calloutY = above ? 6 : CENTER_Y + NODE_D / 2 + 16;
    const stubFrom = { x: cx, y: above ? CENTER_Y - NODE_D / 2 : CENTER_Y + NODE_D / 2 };
    const stubTo = { x: cx, y: above ? calloutY + CALLOUT.height : calloutY };

    elements.push(
      connector(stubFrom, stubTo, { name: `Stub ${i + 1}`, stroke: accent.solid, strokeRef: accentRef(i, 'solid'), strokeWidth: 2 }),
      circle({ x: cx - NODE_D / 2, y: CENTER_Y - NODE_D / 2, diameter: NODE_D, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Node ${i + 1}` }),
      text({
        x: cx - NODE_D / 2,
        y: CENTER_Y - 13,
        width: NODE_D,
        height: 26,
        text: String(i + 1).padStart(2, '0'),
        name: `Node ${i + 1} label`,
        fontSize: 18,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.2,
      }),
      text({
        x: cx - CALLOUT.width / 2,
        y: calloutY,
        width: CALLOUT.width,
        height: 20,
        text: step.title,
        name: `Step ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: cx - CALLOUT.width / 2,
        y: calloutY + 22,
        width: CALLOUT.width,
        height: 50,
        text: step.body,
        name: `Step ${i + 1} body`,
        fontSize: 12.5,
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
  `<line x1="${NODE_X[0]}" y1="${CENTER_Y}" x2="${NODE_X[3]}" y2="${CENTER_Y}" stroke="${BORDER}" stroke-width="3"/>` +
  NODE_X.map((cx, i) => `<circle cx="${cx}" cy="${CENTER_Y}" r="${NODE_D / 2}" fill="${ACCENT_CYCLE[i].solid}"/>`).join('') +
  `</svg>`;

export const ZIGZAG_TIMELINE_TEMPLATE: InfographicTemplate = {
  id: 'template-zigzag-timeline',
  label: 'Four-step zigzag timeline',
  tags: ['timeline', 'process', 'steps'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
