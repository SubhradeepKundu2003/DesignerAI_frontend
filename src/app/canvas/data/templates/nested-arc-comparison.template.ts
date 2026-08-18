import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { connector, mergeFixedList, text, translate } from './template-kit';

/**
 * Five nested bands curling out of a shared point and opening into stacked
 * horizontal bars — the curl can't be a native rectangle, so the whole
 * ribbon cluster is one decorative SVG; the numbered labels and the
 * subheading callouts hanging off each band stay native, editable text.
 */

const CURL_W = 160;
const BAR_H = 46;
const BAR_GAP = 4;
const BAR_START_X = CURL_W - 40;
const BAR_MAX_W = 538;
const CALLOUT_W = 150;
/** Vertical spacing between one band's callout and the next -- tall enough
 * that a label+body pair (20px label + 70px body + margin) never overlaps
 * its neighbour the way the old `i * 4` near-flat stagger always did,
 * regardless of the two callouts' horizontal overlap (their `stubX`
 * positions can sit closer together than `CALLOUT_W`, especially for
 * adjacent bands). */
const CALLOUT_ROW_GAP = 100;
const CALLOUT_TOP_MARGIN = 20;

const BANDS: { label: string; body: string; barWidth: number }[] = [
  { label: 'Subheading', body: 'A short description for this item goes here.', barWidth: 227 },
  { label: 'Subheading', body: 'A short description for this item goes here.', barWidth: 311 },
  { label: 'Subheading', body: 'A short description for this item goes here.', barWidth: 395 },
  { label: 'Subheading', body: 'A short description for this item goes here.', barWidth: 478 },
  { label: 'Subheading', body: 'A short description for this item goes here.', barWidth: BAR_MAX_W },
];

const BARS_HEIGHT = BANDS.length * (BAR_H + BAR_GAP);
const CALLOUTS_TOP = BARS_HEIGHT + CALLOUT_TOP_MARGIN;
const HEIGHT = CALLOUTS_TOP + BANDS.length * CALLOUT_ROW_GAP;
const WIDTH = BAR_START_X + BAR_MAX_W + 40;

function ribbonSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const rows = BANDS.map((band, i) => {
    const accent = palette[i % palette.length];
    const y = i * (BAR_H + BAR_GAP);
    const curlR = CURL_W - i * (CURL_W / BANDS.length) * 0.55;
    const path =
      `M ${BAR_START_X} ${y} ` +
      `H ${BAR_START_X + band.barWidth} V ${y + BAR_H} H ${BAR_START_X} ` +
      `A ${curlR} ${curlR} 0 0 1 ${BAR_START_X - curlR} ${y + BAR_H / 2} ` +
      `A ${curlR} ${curlR} 0 0 1 ${BAR_START_X} ${y} Z`;
    return `<path d="${path}" fill="${accent.solid}"/>`;
  }).join('');
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${rows}</svg>`)}`;
}

export interface NestedArcComparisonContent {
  /** Positionally merged onto the default 5 bands — see `mergeFixedList`. */
  readonly bands?: readonly Partial<{ label: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: NestedArcComparisonContent, theme?: DesignTheme): CanvasElement[] {
  const bands = mergeFixedList<(typeof BANDS)[number]>(BANDS, content?.bands);
  const elements: CanvasElement[] = [];

  const ribbon: ImageElement = {
    id: generateId(),
    name: 'Nested bands',
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
  elements.push(ribbon);

  bands.forEach((band, i) => {
    const y = i * (BAR_H + BAR_GAP);
    const barWidth = BANDS[i].barWidth;
    const stubX = BAR_START_X + barWidth - 40;
    const stubBottomY = CALLOUTS_TOP + i * CALLOUT_ROW_GAP;

    elements.push(
      text({
        x: BAR_START_X + 16,
        y: y + BAR_H / 2 - 20,
        width: 40,
        height: 20,
        text: String(i + 1).padStart(2, '0'),
        name: `Band ${i + 1} number`,
        fontSize: 12,
        fill: 'rgba(255,255,255,0.55)',
      }),
      connector({ x: stubX, y: y + BAR_H }, { x: stubX, y: stubBottomY }, { name: `Band ${i + 1} stub`, stroke: '#c7ccd6', strokeWidth: 1.5 }),
      text({
        x: stubX - CALLOUT_W / 2,
        y: stubBottomY + 10,
        width: CALLOUT_W,
        height: 20,
        text: band.label,
        name: `Band ${i + 1} label`,
        fontSize: 14,
        fontStyle: 'bold',
        align: 'center',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: stubX - CALLOUT_W / 2,
        y: stubBottomY + 32,
        width: CALLOUT_W,
        height: 70,
        text: band.body,
        name: `Band ${i + 1} body`,
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
  BANDS.map((band, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const y = i * (BAR_H + BAR_GAP);
    return `<rect x="${BAR_START_X}" y="${y}" width="${band.barWidth}" height="${BAR_H}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const NESTED_ARC_COMPARISON_TEMPLATE: InfographicTemplate = {
  id: 'template-nested-arc-comparison',
  label: 'Five-band fanned comparison',
  tags: ['comparison', 'fan', 'bands', 'ranking'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
