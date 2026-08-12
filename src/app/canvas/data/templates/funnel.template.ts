import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, MUTED } from './palette';
import { generateId } from '../../utils/id.util';
import { mergeFixedList, text, translate } from './template-kit';

/**
 * The tapering stages can't be native rectangles (each row is a trapezoid),
 * so the funnel body is one decorative SVG; the stage labels and side
 * descriptions on top are ordinary text so their copy stays editable.
 */

const FUNNEL_WIDTH = 320;
const STAGE_H = 68;
const STAGE_GAP = 5;
const TOP_WIDTH = 320;
const BOTTOM_WIDTH = 110;
const DESC_X = FUNNEL_WIDTH + 40;
const DESC_WIDTH = 300;
const WIDTH = DESC_X + DESC_WIDTH;

const STAGES: { title: string; body: string }[] = [
  { title: 'Awareness', body: 'People discover the brand for the first time.' },
  { title: 'Interest', body: 'They stick around and check out what you offer.' },
  { title: 'Consideration', body: 'They compare you against the alternatives.' },
  { title: 'Purchase', body: 'They commit and become a paying customer.' },
  { title: 'Loyalty', body: 'They come back and tell other people about it.' },
];

const HEIGHT = STAGES.length * STAGE_H + (STAGES.length - 1) * STAGE_GAP;

function trapezoid(index: number): { topW: number; bottomW: number; y: number } {
  const topW = TOP_WIDTH + (BOTTOM_WIDTH - TOP_WIDTH) * (index / STAGES.length);
  const bottomW = TOP_WIDTH + (BOTTOM_WIDTH - TOP_WIDTH) * ((index + 1) / STAGES.length);
  const y = index * (STAGE_H + STAGE_GAP);
  return { topW, bottomW, y };
}

function funnelSvg(): string {
  const cx = FUNNEL_WIDTH / 2;
  const shapes = STAGES.map((_, i) => {
    const { topW, bottomW, y } = trapezoid(i);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const points = [
      `${cx - topW / 2},${y}`,
      `${cx + topW / 2},${y}`,
      `${cx + bottomW / 2},${y + STAGE_H}`,
      `${cx - bottomW / 2},${y + STAGE_H}`,
    ].join(' ');
    return `<polygon points="${points}" fill="${accent.solid}"/>`;
  }).join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FUNNEL_WIDTH}" height="${HEIGHT}" viewBox="0 0 ${FUNNEL_WIDTH} ${HEIGHT}">` +
    shapes +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface FunnelContent {
  /** Positionally merged onto the default 5 stages — see `mergeFixedList`. */
  readonly stages?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: FunnelContent): CanvasElement[] {
  const stages = mergeFixedList<(typeof STAGES)[number]>(STAGES, content?.stages);
  const elements: CanvasElement[] = [];

  const funnelImage: ImageElement = {
    id: generateId(),
    name: 'Funnel',
    x: 0,
    y: 0,
    width: FUNNEL_WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: funnelSvg(),
  };
  elements.push(funnelImage);

  stages.forEach((stage, i) => {
    const { y } = trapezoid(i);
    const rowCenterY = y + STAGE_H / 2;

    elements.push(
      text({
        x: 0,
        y: rowCenterY - 11,
        width: FUNNEL_WIDTH,
        height: 22,
        text: stage.title,
        name: `Stage ${i + 1} label`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: DESC_X,
        y: rowCenterY - 20,
        width: DESC_WIDTH,
        height: 40,
        text: stage.body,
        name: `Stage ${i + 1} description`,
        fontSize: 13,
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
  STAGES.map((_, i) => {
    const { topW, bottomW, y } = trapezoid(i);
    const cx = FUNNEL_WIDTH / 2;
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const points = [
      `${cx - topW / 2},${y}`,
      `${cx + topW / 2},${y}`,
      `${cx + bottomW / 2},${y + STAGE_H}`,
      `${cx - bottomW / 2},${y + STAGE_H}`,
    ].join(' ');
    return `<polygon points="${points}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const FUNNEL_TEMPLATE: InfographicTemplate = {
  id: 'template-funnel',
  label: 'Five-stage funnel',
  tags: ['funnel', 'stages', 'conversion', 'pyramid'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
