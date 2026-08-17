import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, BORDER, INK } from './palette';
import { mergeFixedList, text, translate } from './template-kit';

/**
 * The hexagon outline and the arrow-tag banners pointing into it can't be
 * native shapes (no hexagon or triangle-tip `ShapeKind`), so both are one
 * decorative SVG; the centre label and every banner's heading/body stay
 * native, editable text laid on top.
 */

const BANNER_W = 270;
const TIP = 34;
const GAP = 40;
const HEX_R = 85;

const HEX_LEFT_X = BANNER_W + TIP + GAP;
const HUB_CX = HEX_LEFT_X + HEX_R;
const HEX_RIGHT_X = HUB_CX + HEX_R;
const RIGHT_TIP_X = HEX_RIGHT_X + GAP;
const RIGHT_BODY_X0 = RIGHT_TIP_X + TIP;

const WIDTH = RIGHT_BODY_X0 + BANNER_W;
const HEIGHT = 560;
const HUB_CY = HEIGHT / 2;

const LEFT: { title: string; body: string }[] = [
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
];

const RIGHT: { title: string; body: string }[] = [
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
  { title: 'Lorem', body: 'A short paragraph of supporting detail for this point.' },
];

const DEFAULTS = [...LEFT, ...RIGHT];

function hexagonPoints(): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    return `${HUB_CX + HEX_R * Math.cos(angle)},${HUB_CY + HEX_R * Math.sin(angle)}`;
  }).join(' ');
}

function bannerPoints(x0: number, w: number, y: number, h: number, tipDirection: 'left' | 'right'): string {
  return tipDirection === 'right'
    ? `${x0},${y} ${x0 + w},${y} ${x0 + w + TIP},${y + h / 2} ${x0 + w},${y + h} ${x0},${y + h}`
    : `${x0 + w},${y} ${x0},${y} ${x0 - TIP},${y + h / 2} ${x0},${y + h} ${x0 + w},${y + h}`;
}

function artworkSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const leftRowH = HEIGHT / LEFT.length;
  const rightRowH = HEIGHT / RIGHT.length;

  const leftBanners = LEFT.map((_, i) => `<polygon points="${bannerPoints(0, BANNER_W, i * leftRowH, leftRowH, 'right')}" fill="${palette[i % palette.length].solid}" opacity="0.95"/>`).join('');
  const rightBanners = RIGHT.map((_, i) => `<polygon points="${bannerPoints(RIGHT_BODY_X0, BANNER_W, i * rightRowH, rightRowH, 'left')}" fill="${palette[(i + 1) % palette.length].solid}" opacity="0.95"/>`).join('');
  const hex = `<polygon points="${hexagonPoints()}" fill="#ffffff" stroke="${INK}" stroke-width="4"/>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${leftBanners}${rightBanners}${hex}</svg>`)}`;
}

export interface HexagonBannerHubContent {
  readonly hubLabel?: string;
  /** Positionally merged onto the default 7 items (3 left, 4 right, in that order) — see `mergeFixedList`. */
  readonly items?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: HexagonBannerHubContent, theme?: DesignTheme): CanvasElement[] {
  const items = mergeFixedList<(typeof DEFAULTS)[number]>(DEFAULTS, content?.items);
  const left = items.slice(0, LEFT.length);
  const right = items.slice(LEFT.length);
  const accents = theme?.colors.accents ?? ACCENT_CYCLE;
  const elements: CanvasElement[] = [];

  const artwork: ImageElement = {
    id: generateId(),
    name: 'Hexagon and banners',
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: artworkSvg(accents),
  };
  elements.push(artwork);

  elements.push(
    text({
      x: HUB_CX - HEX_R + 12,
      y: HUB_CY - 12,
      width: (HEX_R - 12) * 2,
      height: 24,
      text: content?.hubLabel ?? 'Lorem',
      name: 'Hub label',
      fontSize: 18,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
    }),
  );

  const leftRowH = HEIGHT / LEFT.length;
  left.forEach((item, i) => {
    const y = i * leftRowH;
    elements.push(
      text({ x: 20, y: y + 16, width: BANNER_W - 40, height: 22, text: item.title, name: `Left ${i + 1} title`, fontSize: 15, fontStyle: 'bold', align: 'center', fill: INK }),
      text({ x: 20, y: y + 42, width: BANNER_W - 40, height: leftRowH - 56, text: item.body, name: `Left ${i + 1} body`, fontSize: 12.5, align: 'center', fill: INK, lineHeight: 1.35 }),
    );
  });

  const rightRowH = HEIGHT / RIGHT.length;
  right.forEach((item, i) => {
    const y = i * rightRowH;
    elements.push(
      text({ x: RIGHT_BODY_X0 + 20, y: y + 16, width: BANNER_W - 40, height: 22, text: item.title, name: `Right ${i + 1} title`, fontSize: 15, fontStyle: 'bold', align: 'center', fill: INK }),
      text({ x: RIGHT_BODY_X0 + 20, y: y + 42, width: BANNER_W - 40, height: rightRowH - 56, text: item.body, name: `Right ${i + 1} body`, fontSize: 12.5, align: 'center', fill: INK, lineHeight: 1.35 }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>` +
  `<polygon points="${hexagonPoints()}" fill="none" stroke="${BORDER}" stroke-width="6"/>` +
  `</svg>`;

export const HEXAGON_BANNER_HUB_TEMPLATE: InfographicTemplate = {
  id: 'template-hexagon-banner-hub',
  label: 'Hexagon hub with banner arrows',
  tags: ['hub', 'hexagon', 'banners'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
