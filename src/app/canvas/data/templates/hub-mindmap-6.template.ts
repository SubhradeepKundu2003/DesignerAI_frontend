import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, connector, mergeFixedList, text, translate } from './template-kit';

const ROWS = 3;
const ROW_H = 140;
const HUB_R = 83;
const NODE_D = 64;
const RING_D = 26;
const LABEL_WIDTH = 200;
const LABEL_GAP = 14;

const LEFT_CX = LABEL_WIDTH + LABEL_GAP + NODE_D / 2;
const RIGHT_CX_OFFSET = LEFT_CX;

const WIDTH = LEFT_CX * 2 + HUB_R * 2 + 40;
const HUB_CX = WIDTH / 2;
const RIGHT_CX = WIDTH - RIGHT_CX_OFFSET;
const HEIGHT = ROWS * ROW_H;
const HUB_CY = HEIGHT / 2;
const ROW_Y = [0, 1, 2].map((i) => i * ROW_H + ROW_H / 2);

const BRANCHES: { title: string; body: string }[] = Array.from({ length: 6 }, () => ({
  title: 'Lorem ipsum',
  body: 'A short line of supporting detail for this branch.',
}));

function edgePoint(cx: number, cy: number, r: number, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r };
}

/**
 * A centred hub with six colour-coded branches (three per side), each
 * connected through a small outline ring — the editable counterpart to the
 * flattened "Six-node hub mind map" PNG (`infographic-16`). Distinct from
 * `hub-spoke.template.ts`'s two-per-side layout and dark hub, and from
 * `hub-branch-list.template.ts`'s single-side, bordered-box layout.
 */
export interface HubMindmap6Content {
  readonly hubLabel?: string;
  /** Positionally merged onto the default 6 branches (3 left, 3 right, in
   * that order) — see `mergeFixedList`. */
  readonly branches?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: HubMindmap6Content): CanvasElement[] {
  const branches = mergeFixedList<(typeof BRANCHES)[number]>(BRANCHES, content?.branches);
  const left = branches.slice(0, ROWS);
  const right = branches.slice(ROWS);
  const elements: CanvasElement[] = [];

  elements.push(
    circle({ x: HUB_CX - HUB_R, y: HUB_CY - HUB_R, diameter: HUB_R * 2, fill: '#f4f5f7', stroke: BORDER, strokeRef: 'border', strokeWidth: 2, name: 'Hub' }),
    text({
      x: HUB_CX - HUB_R + 16,
      y: HUB_CY - 20,
      width: HUB_R * 2 - 32,
      height: 40,
      text: content?.hubLabel ?? 'Lorem ipsum',
      name: 'Hub label',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.25,
    }),
  );

  const sides: { branches: (typeof BRANCHES)[number][]; cx: number; align: 'left' | 'right' }[] = [
    { branches: left, cx: LEFT_CX, align: 'right' },
    { branches: right, cx: RIGHT_CX, align: 'left' },
  ];

  sides.forEach((side) => {
    side.branches.forEach((branch, i) => {
      const globalIndex = side.align === 'right' ? i : i + ROWS;
      const accentIndex = globalIndex % ACCENT_CYCLE.length;
      const accent = ACCENT_CYCLE[accentIndex];
      const cy = ROW_Y[i];
      const nodeCenter = { x: side.cx, y: cy };
      const hubEdge = edgePoint(HUB_CX, HUB_CY, HUB_R, nodeCenter);
      const ringCenter = {
        x: hubEdge.x + (nodeCenter.x - hubEdge.x) * 0.55,
        y: hubEdge.y + (nodeCenter.y - hubEdge.y) * 0.55,
      };
      const labelX = side.align === 'right' ? 0 : side.cx + NODE_D / 2 + LABEL_GAP;

      elements.push(
        connector(hubEdge, nodeCenter, { name: `Branch ${globalIndex + 1} connector`, stroke: '#c7ccd6', strokeWidth: 2, dash: [3, 4] }),
        circle({ x: ringCenter.x - RING_D / 2, y: ringCenter.y - RING_D / 2, diameter: RING_D, fill: '#ffffff', stroke: accent.solid, strokeRef: accentRef(accentIndex, 'solid'), strokeWidth: 2, name: `Branch ${globalIndex + 1} ring` }),
        circle({ x: side.cx - NODE_D / 2, y: cy - NODE_D / 2, diameter: NODE_D, fill: accent.solid, fillRef: accentRef(accentIndex, 'solid'), name: `Branch ${globalIndex + 1} node` }),
        text({
          x: labelX,
          y: cy - 26,
          width: LABEL_WIDTH,
          height: 20,
          text: branch.title,
          name: `Branch ${globalIndex + 1} title`,
          fontSize: 15,
          fontStyle: 'bold',
          align: side.align,
          fill: accent.solid,
          fillRef: accentRef(accentIndex, 'solid'),
        }),
        text({
          x: labelX,
          y: cy - 2,
          width: LABEL_WIDTH,
          height: 40,
          text: branch.body,
          name: `Branch ${globalIndex + 1} body`,
          fontSize: 12.5,
          align: side.align,
          fill: MUTED,
          fillRef: 'muted',
          lineHeight: 1.3,
        }),
      );
    });
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<circle cx="${HUB_CX}" cy="${HUB_CY}" r="${HUB_R}" fill="#f4f5f7" stroke="${BORDER}"/>` +
  [LEFT_CX, RIGHT_CX].flatMap((cx) => ROW_Y.map((cy, i) => `<circle cx="${cx}" cy="${cy}" r="${NODE_D / 2}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}"/>`)).join('') +
  `</svg>`;

export const HUB_MINDMAP_6_TEMPLATE: InfographicTemplate = {
  id: 'template-hub-mindmap-6',
  label: 'Six-node hub mind map',
  tags: ['hub', 'mindmap', 'branches'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
