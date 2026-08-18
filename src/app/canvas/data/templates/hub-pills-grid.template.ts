import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, accentRef } from './palette';
import { circle, connector, mergeFixedList, rect, text, translate } from './template-kit';

const HUB_R = 85;
const HUB_CY = 170;
const ROW_GAP = 90;
const PILL_W = 190;
const PILL_H = 54;
const PILL_GAP = 50;

const GRID_COLS = 3;
const GRID_ROWS = 2;
const CELL_W = 219;
const CELL_H = 110;
const CELL_GAP = 20;

const WIDTH = GRID_COLS * CELL_W + (GRID_COLS - 1) * CELL_GAP;
const HUB_CX = WIDTH / 2;
const HUB_ACCENT = ACCENT_CYCLE[1];

const GRID_Y = HUB_CY + ROW_GAP + PILL_H / 2 + 20 + 50;
const HEIGHT = GRID_Y + GRID_ROWS * CELL_H + (GRID_ROWS - 1) * CELL_GAP;

const PILLS: { label: string }[] = Array.from({ length: 6 }, () => ({ label: 'Edit Text Here' }));
const CELLS: { body: string }[] = Array.from({ length: 6 }, () => ({
  body: 'This is a sample text. Insert your desired text here.',
}));

/**
 * A centred hub with six pill-shaped branch labels (three per side) above a
 * 2x3 grid of highlight cells — the editable counterpart to the flattened
 * "Hub with six pill branches and grid" PNG (`infographic-17`).
 */
export interface HubPillsGridContent {
  readonly hubLabel?: string;
  /** Positionally merged onto the default 6 pills — see `mergeFixedList`. */
  readonly pills?: readonly Partial<{ label: string }>[];
  /** Positionally merged onto the default 6 grid cells — see `mergeFixedList`. */
  readonly cells?: readonly Partial<{ body: string }>[];
}

function build(origin: { x: number; y: number }, content?: HubPillsGridContent): CanvasElement[] {
  const pills = mergeFixedList<(typeof PILLS)[number]>(PILLS, content?.pills);
  const cells = mergeFixedList<(typeof CELLS)[number]>(CELLS, content?.cells);
  const elements: CanvasElement[] = [];

  elements.push(
    circle({ x: HUB_CX - HUB_R, y: HUB_CY - HUB_R, diameter: HUB_R * 2, fill: HUB_ACCENT.solid, fillRef: accentRef(1, 'solid'), name: 'Hub' }),
    text({
      x: HUB_CX - HUB_R + 14,
      y: HUB_CY - 30,
      width: HUB_R * 2 - 28,
      height: 60,
      text: content?.hubLabel ?? 'This is a sample text',
      name: 'Hub label',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
      lineHeight: 1.25,
    }),
    text({
      x: HUB_CX - 160,
      y: HUB_CY + ROW_GAP + PILL_H / 2 + 20,
      width: 320,
      height: 28,
      text: 'This is a sample text',
      name: 'Caption',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
    }),
  );

  const left = pills.slice(0, 3);
  const right = pills.slice(3);
  const sides: { pills: (typeof PILLS)[number][]; x: number; align: 'left' | 'right' }[] = [
    { pills: left, x: HUB_CX - HUB_R - PILL_GAP - PILL_W, align: 'left' },
    { pills: right, x: HUB_CX + HUB_R + PILL_GAP, align: 'left' },
  ];

  sides.forEach((side) => {
    side.pills.forEach((pill, i) => {
      const cy = HUB_CY + (i - 1) * ROW_GAP;
      const pillCenter = { x: side.x + PILL_W / 2, y: cy };
      const hubEdge = {
        x: HUB_CX + ((pillCenter.x - HUB_CX) / Math.hypot(pillCenter.x - HUB_CX, pillCenter.y - HUB_CY)) * HUB_R,
        y: HUB_CY + ((pillCenter.y - HUB_CY) / Math.hypot(pillCenter.x - HUB_CX, pillCenter.y - HUB_CY)) * HUB_R,
      };
      const pillEdgeX = side.x < HUB_CX ? side.x + PILL_W : side.x;

      elements.push(
        connector(hubEdge, { x: pillEdgeX, y: cy }, { name: `Pill ${side.align} row ${i + 1} connector`, stroke: '#c7ccd6', strokeWidth: 6 }),
        rect({ x: side.x, y: cy - PILL_H / 2, width: PILL_W, height: PILL_H, fill: '#eef0f3', cornerRadius: PILL_H / 2, name: `Pill ${side.align} row ${i + 1}` }),
        text({
          x: side.x + 12,
          y: cy - 9,
          width: PILL_W - 24,
          height: 20,
          text: pill.label,
          name: `Pill ${side.align} row ${i + 1} label`,
          fontSize: 14,
          align: 'center',
          fill: INK,
          fillRef: 'ink',
        }),
      );
    });
  });

  cells.forEach((cell, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = col * (CELL_W + CELL_GAP);
    const y = GRID_Y + row * (CELL_H + CELL_GAP);

    elements.push(
      rect({ x, y, width: CELL_W, height: CELL_H, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), cornerRadius: 4, name: `Cell ${i + 1}` }),
      text({
        x: x + 18,
        y: y + 20,
        width: CELL_W - 36,
        height: CELL_H - 40,
        text: cell.body,
        name: `Cell ${i + 1} body`,
        fontSize: 13,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.4,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<circle cx="${HUB_CX}" cy="${HUB_CY}" r="${HUB_R}" fill="${HUB_ACCENT.solid}"/>` +
  CELLS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = col * (CELL_W + CELL_GAP);
    const y = GRID_Y + row * (CELL_H + CELL_GAP);
    return `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const HUB_PILLS_GRID_TEMPLATE: InfographicTemplate = {
  id: 'template-hub-pills-grid',
  label: 'Hub with pill branches and grid',
  tags: ['hub', 'branches', 'grid'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
