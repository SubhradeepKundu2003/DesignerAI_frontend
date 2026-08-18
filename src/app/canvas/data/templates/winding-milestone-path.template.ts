import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, accentRef } from './palette';
import { circle, mergeFixedList, rect, text, translate } from './template-kit';

/**
 * The connecting path zigzags through six non-collinear waypoints, which a
 * straight `DividerElement` can't express — so the path itself is one
 * decorative SVG polyline behind the native, editable node circles and
 * milestone cards.
 */

const SPACING = 111;
const COUNT = 6;
const TOP_Y = 90;
// A top-row card sits *below* `TOP_Y` (`TOP_Y + CARD_GAP + CARD_H`) and a
// bottom-row card sits *above* `BOTTOM_Y` (`BOTTOM_Y - CARD_GAP - CARD_H`) --
// each pair of adjacent milestones alternates rows, so the two bands need to
// be at least `2 * (CARD_GAP + CARD_H)` apart or the cards collide in the
// middle regardless of their (already-separated) x positions. `260` used to
// leave the two rows just 170px apart against a 268px requirement.
const NODE_D = 36;
const CARD_W = 160;
const CARD_H = 108;
const CARD_GAP = 26;
const BOTTOM_Y = TOP_Y + 2 * (CARD_GAP + CARD_H) + 20;

const WIDTH = (COUNT - 1) * SPACING + 60 + CARD_W / 2;
const HEIGHT = BOTTOM_Y + CARD_H + CARD_GAP + 30;

const MILESTONES: { title: string; body: string }[] = Array.from({ length: COUNT }, () => ({
  title: 'Lorem',
  body: 'A short line of supporting detail for this milestone.',
}));

function waypoint(i: number): { x: number; y: number } {
  return { x: 30 + i * SPACING, y: i % 2 === 0 ? TOP_Y : BOTTOM_Y };
}

function pathSvg(): string {
  const points = Array.from({ length: COUNT }, (_, i) => waypoint(i));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><path d="${d}" fill="none" stroke="#c7ccd6" stroke-width="4" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface WindingMilestonePathContent {
  /** Positionally merged onto the default 6 milestones — see `mergeFixedList`. */
  readonly milestones?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: WindingMilestonePathContent): CanvasElement[] {
  const milestones = mergeFixedList<(typeof MILESTONES)[number]>(MILESTONES, content?.milestones);
  const elements: CanvasElement[] = [];

  const path: ImageElement = {
    id: generateId(),
    name: 'Winding path',
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: pathSvg(),
  };
  elements.push(path);

  milestones.forEach((milestone, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const point = waypoint(i);
    const cardAbove = point.y === BOTTOM_Y;
    const cardY = cardAbove ? point.y - CARD_GAP - CARD_H : point.y + CARD_GAP;
    const cardX = point.x - CARD_W / 2;

    elements.push(
      circle({ x: point.x - NODE_D / 2, y: point.y - NODE_D / 2, diameter: NODE_D, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), stroke: '#ffffff', strokeWidth: 3, name: `Node ${i + 1}` }),
      rect({ x: cardX, y: cardY, width: CARD_W, height: CARD_H, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), cornerRadius: 4, name: `Milestone ${i + 1} card` }),
      text({
        x: cardX + 16,
        y: cardY + 14,
        width: CARD_W - 32,
        height: 22,
        text: milestone.title,
        name: `Milestone ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: cardX + 16,
        y: cardY + 40,
        width: CARD_W - 32,
        height: CARD_H - 56,
        text: milestone.body,
        name: `Milestone ${i + 1} body`,
        fontSize: 12,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.35,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  Array.from({ length: COUNT }, (_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const point = waypoint(i);
    return `<circle cx="${point.x}" cy="${point.y}" r="${NODE_D / 2}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const WINDING_MILESTONE_PATH_TEMPLATE: InfographicTemplate = {
  id: 'template-winding-milestone-path',
  label: 'Winding milestone path',
  tags: ['timeline', 'path', 'milestones'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
