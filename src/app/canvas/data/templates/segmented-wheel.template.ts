import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { IconName, iconDataUrl } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { mergeFixedList, text, translate } from './template-kit';

/**
 * A five-segment donut with a live icon baked into each wedge — the wedges
 * and their icons can't be native shapes (a pie slice isn't a rectangle or
 * circle), so the whole ring is one decorative SVG; the centre label and the
 * five surrounding callouts stay native, editable text.
 */

const OUTER_R = 95;
const INNER_R = 42;
const WHEEL_BOX = OUTER_R * 2 + 10;
const CALLOUT_W = 235;
const GAP = 14;
const TOP_H = 130;
const BOTTOM_H = 130;
const BOTTOM_CALLOUT_H = 100;
const WHEEL_Y = 10;
const BOTTOM_ROW_GAP = 30;

const WIDTH = CALLOUT_W * 2 + GAP * 2 + WHEEL_BOX;
// The true bottom edge is the bottom-centre callout's own bottom (`build()`'s
// `slots[3]`, the one slot stacked *below* the bottom row rather than beside
// the wheel) -- `Math.max(WHEEL_BOX - TOP_H, BOTTOM_H) + BOTTOM_CALLOUT_H`
// undercounted this by not including `WHEEL_Y`/`BOTTOM_ROW_GAP` at all,
// leaving the declared template height ~100px short of what `build()`
// actually renders regardless of content length.
const HEIGHT = WHEEL_Y + WHEEL_BOX + BOTTOM_ROW_GAP + BOTTOM_H + BOTTOM_CALLOUT_H;

const WEDGES: { iconName: IconName; title: string; body: string }[] = [
  { iconName: 'globe', title: 'Lorem ipsum', body: 'A short paragraph describing this segment.' },
  { iconName: 'chat', title: 'Lorem ipsum', body: 'A short paragraph describing this segment.' },
  { iconName: 'users', title: 'Lorem ipsum', body: 'A short paragraph describing this segment.' },
  { iconName: 'search', title: 'Lorem ipsum', body: 'A short paragraph describing this segment.' },
  { iconName: 'lightbulb', title: 'Lorem ipsum', body: 'A short paragraph describing this segment.' },
];

function wheelSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const cx = WHEEL_BOX / 2;
  const cy = WHEEL_BOX / 2;
  const ringR = (OUTER_R + INNER_R) / 2;
  const ringStroke = OUTER_R - INNER_R;
  const circumference = 2 * Math.PI * ringR;
  const segFull = circumference / WEDGES.length;
  const seg = segFull - 5;
  const iconR = ringR;

  const arcs = WEDGES.map((_, i) => {
    const accent = palette[i % palette.length];
    const offset = -(i * segFull);
    return `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${accent.solid}" stroke-width="${ringStroke}" stroke-dasharray="${seg} ${circumference - seg}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join('');

  const icons = WEDGES.map((wedge, i) => {
    const mid = ((-90 + (i * 360) / WEDGES.length + 180 / WEDGES.length) * Math.PI) / 180;
    const x = cx + iconR * Math.cos(mid) - 12;
    const y = cy + iconR * Math.sin(mid) - 12;
    return `<g transform="translate(${x} ${y})">${rawIcon(wedge.iconName)}</g>`;
  }).join('');

  const hole = `<circle cx="${cx}" cy="${cy}" r="${INNER_R - 4}" fill="#ffffff" stroke="${BORDER}" stroke-width="1"/>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${WHEEL_BOX}" height="${WHEEL_BOX}" viewBox="0 0 ${WHEEL_BOX} ${WHEEL_BOX}">${arcs}${hole}${icons}</svg>`)}`;
}

function rawIcon(name: IconName): string {
  const src = iconDataUrl(name, '#ffffff', 24);
  const svgText = decodeURIComponent(src.slice('data:image/svg+xml;utf8,'.length));
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svgText);
  return match ? match[1] : '';
}

export interface SegmentedWheelContent {
  readonly centerLabel?: string;
  /** Positionally merged onto the default 5 wedges — see `mergeFixedList`. */
  readonly wedges?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: SegmentedWheelContent, theme?: DesignTheme): CanvasElement[] {
  const wedges = mergeFixedList<(typeof WEDGES)[number]>(WEDGES, content?.wedges);
  const accents = theme?.colors.accents ?? ACCENT_CYCLE;
  const elements: CanvasElement[] = [];

  const wheelX = CALLOUT_W + GAP;
  const wheelY = WHEEL_Y;
  const wheelImage: ImageElement = {
    id: generateId(),
    name: 'Segmented wheel',
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

  const cx = wheelX + WHEEL_BOX / 2;
  const cy = wheelY + WHEEL_BOX / 2;
  elements.push(
    text({
      x: cx - INNER_R + 6,
      y: cy - 24,
      width: (INNER_R - 6) * 2,
      height: 48,
      text: content?.centerLabel ?? 'Lorem\nipsum',
      name: 'Center label',
      fontSize: 12,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.2,
    }),
  );

  const slots: { x: number; y: number; align: 'left' | 'right' | 'center'; width: number; height: number }[] = [
    { x: 0, y: 0, align: 'right', width: CALLOUT_W, height: TOP_H },
    { x: wheelX + WHEEL_BOX + GAP, y: 0, align: 'left', width: CALLOUT_W, height: TOP_H },
    { x: wheelX + WHEEL_BOX + GAP, y: wheelY + WHEEL_BOX + BOTTOM_ROW_GAP, align: 'left', width: CALLOUT_W, height: BOTTOM_H },
    { x: wheelX - 40, y: wheelY + WHEEL_BOX + BOTTOM_ROW_GAP + BOTTOM_H, align: 'center', width: WHEEL_BOX + 80, height: BOTTOM_CALLOUT_H },
    { x: 0, y: wheelY + WHEEL_BOX + BOTTOM_ROW_GAP, align: 'right', width: CALLOUT_W, height: BOTTOM_H },
  ];

  wedges.forEach((wedge, i) => {
    const accent = accents[i % accents.length];
    const slot = slots[i];

    elements.push(
      text({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: 22,
        text: wedge.title,
        name: `Wedge ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        align: slot.align,
        fill: accent.solid,
        fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'),
      }),
      text({
        x: slot.x,
        y: slot.y + 26,
        width: slot.width,
        height: slot.height - 26,
        text: wedge.body,
        name: `Wedge ${i + 1} body`,
        fontSize: 12.5,
        align: slot.align,
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
  `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>` +
  `<circle cx="${CALLOUT_W + GAP + WHEEL_BOX / 2}" cy="${WHEEL_BOX / 2 + 10}" r="${OUTER_R}" fill="none" stroke="${INK}" stroke-width="24" stroke-dasharray="1 16"/>` +
  `</svg>`;

export const SEGMENTED_WHEEL_TEMPLATE: InfographicTemplate = {
  id: 'template-segmented-wheel',
  label: 'Five-segment exploded pie wheel',
  tags: ['wheel', 'pie', 'icons', 'segments'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
