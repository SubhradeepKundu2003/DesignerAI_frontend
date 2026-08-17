import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, accentRef } from './palette';
import { circle, mergeFixedList, rect, text, translate } from './template-kit';

const COL_W = 230;
const GAP = 40;
const BLOB_W = 200;
const BLOB_H = 210;
const BADGE_D = 56;
const BLOB_Y = 64;

const WIDTH = COL_W * 3 + GAP * 2;
const HEIGHT = BLOB_Y + BLOB_H + 60;

const STEPS: { title: string; body: string }[] = [
  { title: 'Lorem', body: 'A short paragraph describing this step goes here for the reader.' },
  { title: 'Ipsum', body: 'A short paragraph describing this step goes here for the reader.' },
  { title: 'Dolor', body: 'A short paragraph describing this step goes here for the reader.' },
];

/**
 * Three soft "blob" cards — approximated as a heavily rounded rectangle
 * (native `ShapeElement`, still theme-recolourable and editable) rather than
 * a flattened organic SVG outline, the same simplification trade-off
 * `radial-process.template.ts`'s circular hub makes.
 */
export interface BlobStepsContent {
  /** Positionally merged onto the default 3 steps — see `mergeFixedList`. */
  readonly steps?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: BlobStepsContent): CanvasElement[] {
  const steps = mergeFixedList<(typeof STEPS)[number]>(STEPS, content?.steps);
  const elements: CanvasElement[] = [];

  steps.forEach((step, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const x = i * (COL_W + GAP);

    elements.push(
      text({
        x,
        y: 0,
        width: COL_W - 10,
        height: 24,
        text: step.title,
        name: `Step ${i + 1} heading`,
        fontSize: 18,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      rect({
        x,
        y: BLOB_Y,
        width: BLOB_W,
        height: BLOB_H,
        fill: accent.solid,
        fillRef: accentRef(i, 'solid'),
        cornerRadius: 90,
        name: `Step ${i + 1} blob`,
      }),
      circle({ x, y: BLOB_Y - BADGE_D / 2, diameter: BADGE_D, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Step ${i + 1} badge` }),
      text({
        x,
        y: BLOB_Y - BADGE_D / 2 + 15,
        width: BADGE_D,
        height: 26,
        text: String(i + 1).padStart(2, '0'),
        name: `Step ${i + 1} number`,
        fontSize: 18,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: x + 24,
        y: BLOB_Y + 70,
        width: BLOB_W - 48,
        height: 100,
        text: step.body,
        name: `Step ${i + 1} body`,
        fontSize: 13,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.4,
      }),
      circle({ x: x + 12, y: BLOB_Y + BLOB_H + 14, diameter: 16, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Step ${i + 1} dot large` }),
      circle({ x: x + 26, y: BLOB_Y + BLOB_H + 32, diameter: 9, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Step ${i + 1} dot small` }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  STEPS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const x = i * (COL_W + GAP);
    return `<rect x="${x}" y="${BLOB_Y}" width="${BLOB_W}" height="${BLOB_H}" rx="90" fill="${accent.solid}"/><circle cx="${x + BADGE_D / 2}" cy="${BLOB_Y}" r="${BADGE_D / 2}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const BLOB_STEPS_TEMPLATE: InfographicTemplate = {
  id: 'template-blob-steps',
  label: 'Three-step blob list',
  tags: ['steps', 'blob', 'numbered', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
