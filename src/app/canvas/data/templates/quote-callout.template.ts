import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENTS, BORDER, INK, MUTED } from './palette';
import { connector, rect, text, translate } from './template-kit';

const WIDTH = 640;
const HEIGHT = 264;
const PADDING = 48;

const ACCENT = ACCENTS.indigo;
const QUOTE = 'This platform took our concept from a rough brief to a client-ready newsletter in an afternoon instead of a week.';
const NAME = 'Attributed Name';
const ROLE = 'Role, Team or Client';

export interface QuoteCalloutContent {
  readonly quote?: string;
  readonly name?: string;
  readonly role?: string;
}

/**
 * A testimonial/pull-quote panel — manually positioned like
 * `stat-callout.template.ts` (a bordered card, not a `frame`) since a giant
 * decorative quotation glyph sitting *behind* the wrapped quote text isn't a
 * single-axis stack a `FrameElement` can express.
 */
function build(origin: { x: number; y: number }, content?: QuoteCalloutContent): CanvasElement[] {
  const quoteText = content?.quote ?? QUOTE;
  const name = content?.name ?? NAME;
  const role = content?.role ?? ROLE;
  const elements: CanvasElement[] = [];

  elements.push(
    rect({ x: 0, y: 0, width: WIDTH, height: HEIGHT, fill: '#ffffff', fillRef: 'surface', stroke: BORDER, strokeRef: 'border', strokeWidth: 1, cornerRadius: 20, name: 'Quote panel' }),
    rect({ x: 0, y: 0, width: 8, height: HEIGHT, fill: ACCENT.solid, fillRef: 'accent-0-solid', cornerRadius: 4, name: 'Accent bar' }),

    text({
      x: PADDING - 8,
      y: 12,
      width: 60,
      height: 64,
      text: '“',
      name: 'Quote mark',
      fontFamily: 'Georgia',
      fontSize: 76,
      fontStyle: 'bold',
      fill: ACCENT.solid,
      fillRef: 'accent-0-solid',
      lineHeight: 1,
    }),
    text({
      x: PADDING,
      y: 90,
      width: WIDTH - PADDING * 2,
      height: 88,
      text: quoteText,
      name: 'Quote text',
      fontSize: 19,
      fontStyle: 'italic',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.4,
    }),

    connector({ x: PADDING, y: 196 }, { x: PADDING + 40, y: 196 }, { name: 'Attribution rule', stroke: ACCENT.solid, strokeRef: 'accent-0-solid', strokeWidth: 3 }),
    text({
      x: PADDING,
      y: 208,
      width: 320,
      height: 22,
      text: name,
      name: 'Attribution name',
      fontSize: 15,
      fontStyle: 'bold',
      fill: INK,
      fillRef: 'ink',
    }),
    text({
      x: PADDING,
      y: 230,
      width: 320,
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
  `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20" fill="#ffffff" stroke="${BORDER}"/>` +
  `<rect x="0" y="0" width="8" height="${HEIGHT}" rx="4" fill="${ACCENT.solid}"/>` +
  `<text x="40" y="90" font-family="Georgia" font-size="76" font-weight="700" fill="${ACCENT.solid}">&#8220;</text>` +
  `<rect x="48" y="104" width="${WIDTH - 96}" height="14" rx="4" fill="${BORDER}"/>` +
  `<rect x="48" y="126" width="${WIDTH - 160}" height="14" rx="4" fill="${BORDER}"/>` +
  `</svg>`;

export const QUOTE_CALLOUT_TEMPLATE: InfographicTemplate = {
  id: 'template-quote-callout',
  label: 'Testimonial quote callout',
  tags: ['quote', 'testimonial', 'callout', 'attribution'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
