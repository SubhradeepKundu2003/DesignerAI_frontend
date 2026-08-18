import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENTS, MUTED, accentRef } from './palette';
import { mergeFixedList, rect, text, translate } from './template-kit';

const ROW_LABEL_W = 70;
const COL_LABEL_H = 26;
const CELL_W = 310;
const CELL_H = 170;
const GAP = 6;

const GRID_X = ROW_LABEL_W;
const GRID_Y = COL_LABEL_H;
const WIDTH = GRID_X + CELL_W * 2 + GAP;
const HEIGHT = GRID_Y + CELL_H * 2 + GAP;

interface Quadrant {
  title: string;
  body: string;
  accent: { solid: string; tint: string };
  /** Index into `ACCENT_CYCLE` (indigo, teal, amber, rose) matching `accent`, for its `ThemeColorRef`. */
  accentIndex: number;
}

const QUADRANTS: Quadrant[] = [
  { title: 'Strengths', body: 'Skilled team\nStrong brand recognition\nLoyal customer base', accent: ACCENTS.teal, accentIndex: 1 },
  { title: 'Weaknesses', body: 'Limited budget\nSlow onboarding\nThin documentation', accent: ACCENTS.rose, accentIndex: 3 },
  { title: 'Opportunities', body: 'New markets to enter\nPartnership potential', accent: ACCENTS.indigo, accentIndex: 0 },
  { title: 'Threats', body: 'New competitors\nRising costs', accent: ACCENTS.amber, accentIndex: 2 },
];

const COL_LABELS = ['Helpful', 'Harmful'];
const ROW_LABELS = ['Internal', 'External'];

export interface Matrix2x2Content {
  /** Positionally merged onto the default 4 quadrants — see `mergeFixedList`. */
  readonly quadrants?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: Matrix2x2Content): CanvasElement[] {
  const quadrants = mergeFixedList<(typeof QUADRANTS)[number]>(QUADRANTS, content?.quadrants);
  const elements: CanvasElement[] = [];

  COL_LABELS.forEach((label, col) => {
    elements.push(
      text({
        x: GRID_X + col * (CELL_W + GAP),
        y: 0,
        width: CELL_W,
        height: COL_LABEL_H,
        text: label.toUpperCase(),
        name: `Column label ${col + 1}`,
        fontSize: 11,
        fontStyle: 'bold',
        align: 'center',
        letterSpacing: 1,
        fill: MUTED,
        fillRef: 'muted',
      }),
    );
  });

  ROW_LABELS.forEach((label, row) => {
    elements.push(
      text({
        x: 0,
        y: GRID_Y + row * (CELL_H + GAP) + CELL_H / 2 - 8,
        width: ROW_LABEL_W,
        height: 16,
        text: label.toUpperCase(),
        name: `Row label ${row + 1}`,
        fontSize: 10,
        fontStyle: 'bold',
        align: 'center',
        letterSpacing: 0.5,
        fill: MUTED,
        fillRef: 'muted',
      }),
    );
  });

  quadrants.forEach((quadrant, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = GRID_X + col * (CELL_W + GAP);
    const y = GRID_Y + row * (CELL_H + GAP);

    elements.push(
      rect({ x, y, width: CELL_W, height: CELL_H, fill: quadrant.accent.tint, fillRef: accentRef(quadrant.accentIndex, 'tint'), cornerRadius: 14, name: `Quadrant ${i + 1}` }),
      rect({ x, y, width: 6, height: CELL_H, fill: quadrant.accent.solid, fillRef: accentRef(quadrant.accentIndex, 'solid'), cornerRadius: 3, name: `Quadrant ${i + 1} accent` }),
      text({
        x: x + 22,
        y: y + 16,
        width: CELL_W - 40,
        height: 22,
        text: quadrant.title,
        name: `Quadrant ${i + 1} title`,
        fontSize: 17,
        fontStyle: 'bold',
        fill: quadrant.accent.solid,
        fillRef: accentRef(quadrant.accentIndex, 'solid'),
      }),
      text({
        x: x + 22,
        y: y + 46,
        width: CELL_W - 40,
        height: CELL_H - 60,
        text: quadrant.body,
        name: `Quadrant ${i + 1} body`,
        fontSize: 13,
        fill: '#1c1f24',
        fillRef: 'ink',
        lineHeight: 1.6,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  QUADRANTS.map((q, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = GRID_X + col * (CELL_W + GAP);
    const y = GRID_Y + row * (CELL_H + GAP);
    return `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="14" fill="${q.accent.tint}"/>`;
  }).join('') +
  `</svg>`;

export const MATRIX_2X2_TEMPLATE: InfographicTemplate = {
  id: 'template-matrix-2x2',
  label: 'SWOT 2x2 matrix',
  tags: ['matrix', 'swot', 'quadrant', 'grid'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
