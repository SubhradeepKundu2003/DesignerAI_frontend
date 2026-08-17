import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { DesignTheme } from '../../models/design-theme.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { generateId } from '../../utils/id.util';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { icon, mergeFixedList, text, translate } from './template-kit';

/**
 * The three overlapping arrow banners can't be a native rectangle (each has
 * a triangular tip), so they're one decorative SVG behind the (native,
 * editable) title/body text laid on top of each banner's body.
 */

const LEFT_W = 330;
const GAP = 40;
const RIGHT_X = LEFT_W + GAP;
const BANNER_W = 360;
const BANNER_H = 84;
const TIP = 40;
const OVERLAP = 28;
const STEP = BANNER_H - OVERLAP;

const WIDTH = RIGHT_X + BANNER_W + TIP;
const HEIGHT = BANNER_H + STEP * 2 + 60;

const BANNERS: { title: string; body: string; direction: 'right' | 'left' }[] = [
  { title: 'This is a sample text', body: 'Insert your desired text here because this is the dummy text.', direction: 'right' },
  { title: 'This is a sample text', body: 'Insert your desired text here because this is the dummy text.', direction: 'left' },
  { title: 'This is a sample text', body: 'Insert your desired text here because this is the dummy text.', direction: 'right' },
];

function bannerPoints(direction: 'left' | 'right', y: number): string {
  const x0 = RIGHT_X;
  return direction === 'right'
    ? `${x0},${y} ${x0 + BANNER_W},${y} ${x0 + BANNER_W + TIP},${y + BANNER_H / 2} ${x0 + BANNER_W},${y + BANNER_H} ${x0},${y + BANNER_H}`
    : `${x0 + BANNER_W},${y} ${x0},${y} ${x0 - TIP},${y + BANNER_H / 2} ${x0},${y + BANNER_H} ${x0 + BANNER_W},${y + BANNER_H}`;
}

function bannersSvg(accents: readonly { readonly solid: string }[]): string {
  const palette = accents.length > 0 ? accents : ACCENT_CYCLE;
  const polys = BANNERS.map((banner, i) => {
    const y = i * STEP;
    const accent = palette[i % palette.length];
    return `<polygon points="${bannerPoints(banner.direction, y)}" fill="${accent.solid}" opacity="0.94"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${polys}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ChevronFanContent {
  readonly heading?: string;
  readonly body?: string;
  /** Positionally merged onto the default 3 banners — see `mergeFixedList`. */
  readonly banners?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: ChevronFanContent, theme?: DesignTheme): CanvasElement[] {
  const banners = mergeFixedList<(typeof BANNERS)[number]>(BANNERS, content?.banners);
  const elements: CanvasElement[] = [];

  elements.push(
    text({
      x: 0,
      y: 0,
      width: LEFT_W,
      height: 60,
      text: content?.heading ?? 'This is a sample heading',
      name: 'Heading',
      fontSize: 22,
      fontStyle: 'bold',
      fill: ACCENT_CYCLE[2].solid,
      fillRef: 'accent-2-solid',
      lineHeight: 1.25,
    }),
    text({
      x: 0,
      y: 76,
      width: LEFT_W,
      height: HEIGHT - 76,
      text:
        content?.body ??
        'This is a sample dummy text. Insert your desired text here because this is the dummy text. This is a sample dummy text. Insert your desired text here.',
      name: 'Body',
      fontSize: 14,
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.5,
    }),
  );

  const bulbCx = RIGHT_X + BANNER_W / 2;
  const bulbY = BANNER_H + STEP * 2 - 10;
  elements.push(icon({ x: bulbCx - 45, y: bulbY, size: 90, name: 'lightbulb', color: MUTED, fillRef: 'muted', label: 'Lightbulb' }));

  const banner: ImageElement = {
    id: generateId(),
    name: 'Banners',
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: bannersSvg(theme?.colors.accents ?? ACCENT_CYCLE),
  };
  elements.push(banner);

  banners.forEach((item, i) => {
    const y = i * STEP;
    const bodyX = item.direction === 'right' ? RIGHT_X : RIGHT_X + TIP;
    const bodyW = BANNER_W - TIP;

    elements.push(
      text({
        x: bodyX + 16,
        y: y + 14,
        width: bodyW - 32,
        height: 22,
        text: item.title,
        name: `Banner ${i + 1} title`,
        fontSize: 16,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: bodyX + 16,
        y: y + 38,
        width: bodyW - 32,
        height: 40,
        text: item.body,
        name: `Banner ${i + 1} body`,
        fontSize: 12,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.3,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect width="${LEFT_W}" height="16" y="10" fill="${ACCENT_CYCLE[2].solid}"/>` +
  BANNERS.map((banner, i) => `<polygon points="${bannerPoints(banner.direction, i * STEP)}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}"/>`).join('') +
  `</svg>`;

export const CHEVRON_FAN_TEMPLATE: InfographicTemplate = {
  id: 'template-chevron-fan',
  label: 'Overlapping chevron banners',
  tags: ['banners', 'chevron', 'fan', 'idea'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
