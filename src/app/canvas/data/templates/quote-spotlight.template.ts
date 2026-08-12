import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENTS, INK, MUTED } from './palette';
import { halfCircle, text, translate } from './template-kit';

const WIDTH = 640;
const HEIGHT = 240;
const MEDALLION = { x: 40, y: 65, width: 150, height: 110 };
const TEXT_X = 220;

const ACCENT = ACCENTS.rose;
const QUOTE = 'This platform took our concept from a rough brief to a client-ready newsletter in an afternoon instead of a week.';
const NAME = 'Attributed Name';
const ROLE = 'Role, Team or Client';

export interface QuoteSpotlightContent {
  readonly quote?: string;
  readonly name?: string;
  readonly role?: string;
}

/**
 * A pull-quote with the opening-quote glyph set inside a half-circle
 * medallion instead of `quote-callout.template.ts`'s side accent bar — a
 * second look for the `quote` shape pool.
 */
function build(origin: { x: number; y: number }, content?: QuoteSpotlightContent): CanvasElement[] {
  const quoteText = content?.quote ?? QUOTE;
  const name = content?.name ?? NAME;
  const role = content?.role ?? ROLE;
  const elements: CanvasElement[] = [];

  elements.push(
    halfCircle({
      x: MEDALLION.x,
      y: MEDALLION.y,
      width: MEDALLION.width,
      height: MEDALLION.height,
      orientation: 'up',
      fill: ACCENT.solid,
      fillRef: 'accent-3-solid',
      name: 'Quote medallion',
    }),
    text({
      x: MEDALLION.x,
      y: MEDALLION.y + 18,
      width: MEDALLION.width,
      height: 90,
      text: '“',
      name: 'Quote mark',
      fontFamily: 'Georgia',
      fontSize: 64,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
      lineHeight: 1,
    }),
    text({
      x: TEXT_X,
      y: 44,
      width: WIDTH - TEXT_X - 32,
      height: 116,
      text: quoteText,
      name: 'Quote text',
      fontSize: 18,
      fontStyle: 'italic',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.4,
    }),
    text({
      x: TEXT_X,
      y: 178,
      width: WIDTH - TEXT_X - 32,
      height: 22,
      text: name,
      name: 'Attribution name',
      fontSize: 15,
      fontStyle: 'bold',
      fill: INK,
      fillRef: 'ink',
    }),
    text({
      x: TEXT_X,
      y: 200,
      width: WIDTH - TEXT_X - 32,
      height: 18,
      text: role,
      name: 'Attribution role',
      fontSize: 13,
      fill: MUTED,
      fillRef: 'muted',
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<path d="M${MEDALLION.x} ${MEDALLION.y} h${MEDALLION.width} v${MEDALLION.height} a${MEDALLION.width / 2} ${MEDALLION.height} 0 0 1 -${MEDALLION.width} 0 Z" fill="${ACCENT.solid}"/>` +
  `<text x="${MEDALLION.x + MEDALLION.width / 2}" y="${MEDALLION.y + 70}" text-anchor="middle" font-family="Georgia" font-size="64" font-weight="700" fill="#ffffff">&#8220;</text>` +
  `<rect x="${TEXT_X}" y="60" width="${WIDTH - TEXT_X - 32}" height="14" rx="4" fill="#e2e4e9"/>` +
  `<rect x="${TEXT_X}" y="82" width="${WIDTH - TEXT_X - 96}" height="14" rx="4" fill="#e2e4e9"/>` +
  `</svg>`;

export const QUOTE_SPOTLIGHT_TEMPLATE: InfographicTemplate = {
  id: 'template-quote-spotlight',
  label: 'Quote medallion spotlight',
  tags: ['quote', 'testimonial', 'spotlight', 'attribution'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
