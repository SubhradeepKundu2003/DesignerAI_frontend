import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, mergeFixedList, text, translate } from './template-kit';

/**
 * The four quadrant wedges meeting at a point can't be a native rectangle or
 * circle, so they're one decorative SVG (four pie slices with a thin white
 * gap) behind the native, editable centre label and corner text blocks —
 * same split as `quadrant-wheel.template.ts`, without that template's ring
 * hole or wedge icons.
 */

const OUTER_R = 92;
const WHEEL_BOX = OUTER_R * 2 + 20;
const CENTER_R = 54;
const CALLOUT = { width: 235, height: 130 };
const GAP = 12;
const ROW_GAP = 20;

const WIDTH = CALLOUT.width * 2 + GAP * 2 + WHEEL_BOX;
const HEIGHT = CALLOUT.height * 2 + ROW_GAP;

const CALLOUTS: { corner: 'NW' | 'NE' | 'SW' | 'SE'; wedge: number; title: string; body: string }[] = [
  { corner: 'NW', wedge: 0, title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this quadrant.' },
  { corner: 'NE', wedge: 1, title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this quadrant.' },
  { corner: 'SW', wedge: 2, title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this quadrant.' },
  { corner: 'SE', wedge: 3, title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this quadrant.' },
];

function pieSlice(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

function wheelSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const cx = WHEEL_BOX / 2;
  const cy = WHEEL_BOX / 2;
  const slices = [0, 1, 2, 3]
    .map((i) => `<path d="${pieSlice(cx, cy, OUTER_R, i * 90, (i + 1) * 90)}" fill="${palette[i % palette.length].solid}" stroke="#ffffff" stroke-width="4"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WHEEL_BOX}" height="${WHEEL_BOX}" viewBox="0 0 ${WHEEL_BOX} ${WHEEL_BOX}">${slices}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface QuadrantInfoContent {
  readonly centerLabel?: string;
  /** Positionally merged onto the default 4 callouts — see `mergeFixedList`. */
  readonly callouts?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: QuadrantInfoContent, theme?: DesignTheme): CanvasElement[] {
  const callouts = mergeFixedList<(typeof CALLOUTS)[number]>(CALLOUTS, content?.callouts);
  const accents = theme?.colors.accents ?? ACCENT_CYCLE;
  const elements: CanvasElement[] = [];

  const wheelX = CALLOUT.width + GAP;
  const wheelY = (HEIGHT - WHEEL_BOX) / 2;
  const wheelImage: ImageElement = {
    id: generateId(),
    name: 'Quadrant wedges',
    x: wheelX,
    y: wheelY,
    width: WHEEL_BOX,
    height: WHEEL_BOX,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: wheelSvg(accents),
  };
  elements.push(wheelImage);

  const centerCx = wheelX + WHEEL_BOX / 2;
  const centerCy = wheelY + WHEEL_BOX / 2;
  elements.push(
    circle({ x: centerCx - CENTER_R, y: centerCy - CENTER_R, diameter: CENTER_R * 2, fill: '#ffffff', stroke: BORDER, strokeRef: 'border', strokeWidth: 2, name: 'Center label background' }),
    text({
      x: centerCx - CENTER_R + 8,
      y: centerCy - 22,
      width: CENTER_R * 2 - 16,
      height: 44,
      text: content?.centerLabel ?? 'Center\nlabel',
      name: 'Center label',
      fontSize: 15,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.2,
    }),
  );

  callouts.forEach((callout, i) => {
    const accent = accents[callout.wedge % accents.length];
    const x = callout.corner === 'NW' || callout.corner === 'SW' ? 0 : wheelX + WHEEL_BOX + GAP;
    const y = callout.corner === 'NW' || callout.corner === 'NE' ? 0 : CALLOUT.height + ROW_GAP;

    elements.push(
      text({
        x,
        y,
        width: CALLOUT.width,
        height: 22,
        text: callout.title,
        name: `Callout ${i + 1} title`,
        fontSize: 16,
        fontStyle: 'bold',
        fill: accent.solid,
        fillRef: accentRef(callout.wedge, 'solid'),
      }),
      text({
        x,
        y: y + 28,
        width: CALLOUT.width,
        height: CALLOUT.height - 28,
        text: callout.body,
        name: `Callout ${i + 1} body`,
        fontSize: 13,
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.4,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>` +
  `<circle cx="${CALLOUT.width + GAP + WHEEL_BOX / 2}" cy="${HEIGHT / 2}" r="${OUTER_R}" fill="${INK}"/>` +
  `</svg>`;

export const QUADRANT_INFO_TEMPLATE: InfographicTemplate = {
  id: 'template-quadrant-info',
  label: 'Quadrant pinwheel with center label',
  tags: ['quadrant', 'pinwheel', 'center-label', 'wheel'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
