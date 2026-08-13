import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENTS, MUTED } from './palette';
import { circle, text, translate } from './template-kit';

const CIRCLE_D = 260;
const OVERLAP = 90;
const WIDTH = CIRCLE_D * 2 - OVERLAP;
const HEIGHT = CIRCLE_D + 70;

const LEFT = { title: 'Design', body: 'Craft, taste,\nuser empathy' };
const RIGHT = { title: 'Engineering', body: 'Systems, rigor,\nscale' };
const CENTER_LABEL = 'Product';
const CAPTION = 'Where taste and rigor overlap is where the product actually gets built.';

export interface VennDiagramContent {
  readonly left?: { readonly title?: string; readonly body?: string };
  readonly right?: { readonly title?: string; readonly body?: string };
  readonly centerLabel?: string;
  readonly caption?: string;
}

/**
 * Two overlapping tinted circles with a shared centre label — the "where A
 * and B meet" shape no existing template covers (matrix-2x2 is a four-way
 * grid, not a two-set overlap). Blending relies on `opacity`, not a shared
 * blend-mode primitive the element model doesn't have, so the overlap band
 * reads as a third, slightly darker tint wherever the two discs cross.
 */
function build(origin: { x: number; y: number }, content?: VennDiagramContent): CanvasElement[] {
  const left = { ...LEFT, ...content?.left };
  const right = { ...RIGHT, ...content?.right };
  const centerLabel = content?.centerLabel ?? CENTER_LABEL;
  const caption = content?.caption ?? CAPTION;
  const elements: CanvasElement[] = [];
  const leftX = 0;
  const rightX = WIDTH - CIRCLE_D;
  const circleY = 0;

  elements.push(
    { ...circle({ x: leftX, y: circleY, diameter: CIRCLE_D, fill: ACCENTS.indigo.solid, name: 'Left set' }), opacity: 0.72 },
    { ...circle({ x: rightX, y: circleY, diameter: CIRCLE_D, fill: ACCENTS.teal.solid, name: 'Right set' }), opacity: 0.72 },
  );

  elements.push(
    text({
      x: leftX + CIRCLE_D / 2 - 200,
      y: circleY + CIRCLE_D / 2 - 60,
      width: 190,
      height: 24,
      text: left.title,
      name: 'Left label title',
      fontSize: 18,
      fontStyle: 'bold',
      align: 'right',
      fill: '#ffffff',
    }),
    text({
      x: leftX + CIRCLE_D / 2 - 200,
      y: circleY + CIRCLE_D / 2 - 32,
      width: 190,
      height: 40,
      text: left.body,
      name: 'Left label body',
      fontSize: 12.5,
      align: 'right',
      fill: '#ffffff',
      lineHeight: 1.4,
    }),
    text({
      x: rightX + CIRCLE_D / 2 + 10,
      y: circleY + CIRCLE_D / 2 - 60,
      width: 190,
      height: 24,
      text: right.title,
      name: 'Right label title',
      fontSize: 18,
      fontStyle: 'bold',
      align: 'left',
      fill: '#ffffff',
    }),
    text({
      x: rightX + CIRCLE_D / 2 + 10,
      y: circleY + CIRCLE_D / 2 - 32,
      width: 190,
      height: 40,
      text: right.body,
      name: 'Right label body',
      fontSize: 12.5,
      align: 'left',
      fill: '#ffffff',
      lineHeight: 1.4,
    }),
    text({
      x: WIDTH / 2 - 70,
      y: circleY + CIRCLE_D / 2 - 10,
      width: 140,
      height: 24,
      text: centerLabel,
      name: 'Overlap label',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
    }),
    text({
      x: 0,
      y: CIRCLE_D + 20,
      width: WIDTH,
      height: 24,
      text: caption,
      name: 'Caption',
      fontSize: 13,
      align: 'center',
      fill: MUTED,
      fillRef: 'muted',
    }),
  );

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<circle cx="${CIRCLE_D / 2}" cy="${CIRCLE_D / 2}" r="${CIRCLE_D / 2}" fill="${ACCENTS.indigo.solid}" opacity="0.72"/>` +
  `<circle cx="${WIDTH - CIRCLE_D / 2}" cy="${CIRCLE_D / 2}" r="${CIRCLE_D / 2}" fill="${ACCENTS.teal.solid}" opacity="0.72"/>` +
  `</svg>`;

export const VENN_DIAGRAM_TEMPLATE: InfographicTemplate = {
  id: 'template-venn-diagram',
  label: 'Two-set Venn diagram',
  tags: ['venn', 'overlap', 'comparison', 'sets'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
