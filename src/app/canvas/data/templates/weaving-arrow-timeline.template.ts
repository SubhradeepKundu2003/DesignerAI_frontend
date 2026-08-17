import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { mergeFixedList, rect, text, translate } from './template-kit';

/**
 * The arrow tips poking up/down from the ribbon can't be a native shape (no
 * triangle `ShapeKind`), so the eight tips are one decorative SVG layered
 * over native, per-segment ribbon rectangles and native step labels.
 */

const SIDEBAR_W = 240;
const SIDEBAR_GAP = 50;
const SEGMENT_W = 100;
const ARROW_COUNT = 8;
const RIBBON_H = 24;
const ARROW_H = 70;
const ARROW_W = 56;
const LABEL_H = 60;

const CONTENT_X = SIDEBAR_W + SIDEBAR_GAP;
const CONTENT_W = ARROW_COUNT * SEGMENT_W;
const WIDTH = CONTENT_X + CONTENT_W;
const RIBBON_Y = LABEL_H + ARROW_H;
const HEIGHT = LABEL_H + ARROW_H + RIBBON_H + ARROW_H + LABEL_H;

const STEPS: { title: string }[] = Array.from({ length: ARROW_COUNT }, () => ({ title: 'Lorem' }));

function arrowsSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const tips = STEPS.map((_, i) => {
    const cx = CONTENT_X + i * SEGMENT_W + SEGMENT_W / 2;
    const up = i % 2 === 0;
    const accent = palette[i % palette.length];
    const tipY = up ? RIBBON_Y - ARROW_H : RIBBON_Y + RIBBON_H + ARROW_H;
    const baseY = up ? RIBBON_Y : RIBBON_Y + RIBBON_H;
    return `<polygon points="${cx - ARROW_W / 2},${baseY} ${cx + ARROW_W / 2},${baseY} ${cx},${tipY}" fill="${accent.solid}"/>`;
  }).join('');
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${tips}</svg>`)}`;
}

export interface WeavingArrowTimelineContent {
  readonly sidebarTitle?: string;
  readonly sidebarBody?: string;
  /** Positionally merged onto the default 8 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string }>[];
}

function build(origin: { x: number; y: number }, content?: WeavingArrowTimelineContent, theme?: DesignTheme): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const accents = theme?.colors.accents ?? ACCENT_CYCLE;
  const elements: CanvasElement[] = [];
  const sidebarAccent = accents[2 % accents.length];

  elements.push(
    rect({ x: 0, y: 0, width: SIDEBAR_W, height: HEIGHT, fill: sidebarAccent.solid, cornerRadius: 24, name: 'Sidebar' }),
    text({
      x: 20,
      y: 26,
      width: SIDEBAR_W - 40,
      height: 28,
      text: content?.sidebarTitle ?? 'Lorem',
      name: 'Sidebar title',
      fontSize: 18,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
    }),
    text({
      x: 20,
      y: 66,
      width: SIDEBAR_W - 40,
      height: HEIGHT - 90,
      text: content?.sidebarBody ?? 'A longer paragraph of supporting detail can live in this sidebar panel, describing the timeline at a glance.',
      name: 'Sidebar body',
      fontSize: 13,
      align: 'center',
      fill: INK,
      lineHeight: 1.5,
    }),
  );

  steps.forEach((step, i) => {
    const accent = accents[i % accents.length];
    const x = CONTENT_X + i * SEGMENT_W;
    const up = i % 2 === 0;

    elements.push(
      rect({ x, y: RIBBON_Y, width: SEGMENT_W, height: RIBBON_H, fill: accent.solid, name: `Segment ${i + 1}` }),
      text({
        x: x - 15,
        y: up ? LABEL_H - 34 : RIBBON_Y + RIBBON_H + ARROW_H + 10,
        width: SEGMENT_W + 30,
        height: 30,
        text: step.title,
        name: `Step ${i + 1} label`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
    );
  });

  const arrows: ImageElement = {
    id: generateId(),
    name: 'Arrow tips',
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: arrowsSvg(accents),
  };
  elements.push(arrows);

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect width="${SIDEBAR_W}" height="${HEIGHT}" rx="24" fill="${ACCENT_CYCLE[2].solid}"/>` +
  `<rect x="${CONTENT_X}" y="${RIBBON_Y}" width="${CONTENT_W}" height="${RIBBON_H}" fill="${MUTED}"/>` +
  `</svg>`;

export const WEAVING_ARROW_TIMELINE_TEMPLATE: InfographicTemplate = {
  id: 'template-weaving-arrow-timeline',
  label: 'Weaving arrow timeline',
  tags: ['timeline', 'arrows', 'weaving', 'process'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
