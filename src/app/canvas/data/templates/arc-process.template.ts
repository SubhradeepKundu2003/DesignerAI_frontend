import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { generateId } from '../../utils/id.util';
import { circle, icon, mergeFixedList, text, translate } from './template-kit';

/**
 * The ribbons linking each pair of nodes are thick bezier strokes that bulge
 * alternately above/below the row — not expressible as a native rectangle or
 * circle, so they're one decorative SVG behind the (native, editable) nodes
 * and labels.
 */

const WIDTH = 698;
const HEIGHT = 300;
const CENTER_Y = 150;
const NODE_D = 84;
const MARGIN_X = 70;
const BULGE = 60;

const XS = [0, 1, 2, 3].map((i) => MARGIN_X + i * ((WIDTH - MARGIN_X * 2) / 3));

const STEPS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Align', body: 'Agree on the goal and who owns it.', iconName: 'flag' },
  { title: 'Explore', body: 'Sketch a few directions worth trying.', iconName: 'lightbulb' },
  { title: 'Focus', body: 'Pick the one that fits the goal best.', iconName: 'target' },
  { title: 'Grow', body: 'Ship it and build on what works.', iconName: 'trendUp' },
];

function ribbonSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const arcs = [0, 1, 2].map((i) => {
    const dy = i % 2 === 0 ? -BULGE : BULGE;
    const x1 = XS[i];
    const x2 = XS[i + 1];
    const midX = (x1 + x2) / 2;
    const accent = palette[i % palette.length];
    return `<path d="M ${x1} ${CENTER_Y} Q ${midX} ${CENTER_Y + dy} ${x2} ${CENTER_Y}" stroke="${accent.solid}" stroke-width="34" fill="none" stroke-linecap="round"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${arcs}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ArcProcessContent {
  /** Positionally merged onto the default 4 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: ArcProcessContent, theme?: DesignTheme): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const elements: CanvasElement[] = [];

  const ribbons: ImageElement = {
    id: generateId(),
    name: 'Connecting ribbons',
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: ribbonSvg(theme?.colors.accents ?? ACCENT_CYCLE),
  };
  elements.push(ribbons);

  steps.forEach((step, i) => {
    const cx = XS[i];
    const above = i % 2 === 1;
    const labelY = above ? CENTER_Y - NODE_D / 2 - 74 : CENTER_Y + NODE_D / 2 + 16;

    elements.push(
      circle({ x: cx - NODE_D / 2, y: CENTER_Y - NODE_D / 2, diameter: NODE_D, fill: '#ffffff', fillRef: 'surface', stroke: '#e2e4e9', strokeRef: 'border', strokeWidth: 3, name: `Node ${i + 1}` }),
      icon({ x: cx - 18, y: CENTER_Y - 18, size: 36, name: step.iconName, color: INK, fillRef: 'ink', label: `Node ${i + 1} icon` }),
      text({
        x: cx - 90,
        y: labelY,
        width: 180,
        height: 22,
        text: step.title,
        name: `Step ${i + 1} title`,
        fontSize: 16,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: cx - 90,
        y: labelY + 24,
        width: 180,
        height: 44,
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
  [0, 1, 2].map((i) => {
    const dy = i % 2 === 0 ? -BULGE : BULGE;
    const x1 = XS[i];
    const x2 = XS[i + 1];
    const midX = (x1 + x2) / 2;
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return `<path d="M ${x1} ${CENTER_Y} Q ${midX} ${CENTER_Y + dy} ${x2} ${CENTER_Y}" stroke="${accent.solid}" stroke-width="34" fill="none" stroke-linecap="round"/>`;
  }).join('') +
  XS.map((cx) => `<circle cx="${cx}" cy="${CENTER_Y}" r="${NODE_D / 2}" fill="#ffffff" stroke="#e2e4e9" stroke-width="3"/>`).join('') +
  `</svg>`;

export const ARC_PROCESS_TEMPLATE: InfographicTemplate = {
  id: 'template-arc-process',
  label: 'Interlocking arc process',
  tags: ['process', 'arc', 'ribbon', 'steps'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
