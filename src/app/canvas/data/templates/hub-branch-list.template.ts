import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { circle, connector, mergeFixedList, rect, text, translate } from './template-kit';

const HUB_R = 110;
const HUB_CX = 100;
const ROW_H = 96;
const NODE_D = 46;
const NODE_X = 280;
const BOX = { x: 340, width: 358, height: 76 };

const ITEMS: { title: string; body: string }[] = [
  { title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this branch.' },
  { title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this branch.' },
  { title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this branch.' },
  { title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this branch.' },
  { title: 'Lorem ipsum', body: 'A short paragraph of supporting detail for this branch.' },
];

const HEIGHT = ITEMS.length * ROW_H;
const WIDTH = BOX.x + BOX.width;

function edgePoint(cx: number, cy: number, r: number, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r };
}

/**
 * A big hub circle on the left branching out to five bordered content boxes
 * — the editable counterpart to the flattened "Five-branch hub list" PNG
 * (`infographic-10`). Distinct from `hub-spoke.template.ts`: one hub with
 * every branch on a single side, not two rows split left/right.
 */
export interface HubBranchListContent {
  readonly hubLabel?: string;
  /** Positionally merged onto the default 5 items — see `mergeFixedList`. */
  readonly items?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: HubBranchListContent): CanvasElement[] {
  const items = mergeFixedList<(typeof ITEMS)[number]>(ITEMS, content?.items);
  const hubCy = HEIGHT / 2;
  const elements: CanvasElement[] = [];

  elements.push(
    circle({ x: HUB_CX - HUB_R, y: hubCy - HUB_R, diameter: HUB_R * 2, fill: '#eef0f3', stroke: BORDER, strokeRef: 'border', strokeWidth: 2, name: 'Hub' }),
    text({
      x: HUB_CX - HUB_R + 20,
      y: hubCy - 30,
      width: HUB_R * 2 - 40,
      height: 60,
      text: content?.hubLabel ?? 'This is a sample text',
      name: 'Hub label',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: INK,
      fillRef: 'ink',
      lineHeight: 1.25,
    }),
  );

  items.forEach((item, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const cy = i * ROW_H + ROW_H / 2;
    const nodeCenter = { x: NODE_X, y: cy };
    const from = edgePoint(HUB_CX, hubCy, HUB_R, nodeCenter);

    elements.push(
      connector(from, nodeCenter, { name: `Branch ${i + 1} connector`, stroke: accent.solid, strokeRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), strokeWidth: 10 }),
      circle({ x: NODE_X - NODE_D / 2, y: cy - NODE_D / 2, diameter: NODE_D, fill: accent.solid, fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'), name: `Branch ${i + 1} node` }),
      rect({
        x: BOX.x,
        y: cy - BOX.height / 2,
        width: BOX.width,
        height: BOX.height,
        fill: 'transparent',
        stroke: accent.solid,
        strokeRef: accentRef(i % ACCENT_CYCLE.length, 'solid'),
        strokeWidth: 1.5,
        cornerRadius: 12,
        name: `Branch ${i + 1} box`,
      }),
      text({
        x: BOX.x + 18,
        y: cy - BOX.height / 2 + 10,
        width: BOX.width - 36,
        height: 20,
        text: item.title,
        name: `Branch ${i + 1} title`,
        fontSize: 14,
        fontStyle: 'bold',
        fill: accent.solid,
        fillRef: accentRef(i % ACCENT_CYCLE.length, 'solid'),
      }),
      text({
        x: BOX.x + 18,
        y: cy - BOX.height / 2 + 32,
        width: BOX.width - 36,
        height: BOX.height - 40,
        text: item.body,
        name: `Branch ${i + 1} body`,
        fontSize: 12,
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
  `<circle cx="${HUB_CX}" cy="${HEIGHT / 2}" r="${HUB_R}" fill="#eef0f3"/>` +
  ITEMS.map((_, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const cy = i * ROW_H + ROW_H / 2;
    return `<circle cx="${NODE_X}" cy="${cy}" r="${NODE_D / 2}" fill="${accent.solid}"/><rect x="${BOX.x}" y="${cy - BOX.height / 2}" width="${BOX.width}" height="${BOX.height}" rx="12" fill="none" stroke="${accent.solid}" stroke-width="2"/>`;
  }).join('') +
  `</svg>`;

export const HUB_BRANCH_LIST_TEMPLATE: InfographicTemplate = {
  id: 'template-hub-branch-list',
  label: 'Five-branch hub list',
  tags: ['hub', 'branches', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
