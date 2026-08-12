import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, INK, MUTED, accentRef } from './palette';
import { circle, connector, icon, mergeFixedList, text, translate } from './template-kit';

const WIDTH = 698;
const ROW_H = 130;
const HUB_R = 64;
const NODE_D = 60;
const LABEL_WIDTH = 180;
const LABEL_GAP = 14;

const LEFT_CX = LABEL_WIDTH + LABEL_GAP + NODE_D / 2;
const RIGHT_CX = WIDTH - LEFT_CX;
const HUB_CX = WIDTH / 2;

const HEIGHT = ROW_H * 2;
const HUB_CY = HEIGHT / 2;
const ROW_Y = [0, 1].map((i) => i * ROW_H + ROW_H / 2);

interface Branch {
  title: string;
  body: string;
  iconName: IconName;
}

// Two branches per side, not the old three -- lines up with every other
// `bullet_list` pool member's exact 4-slot content contract (see
// `card-grid.template.ts`'s matching comment).
const LEFT: Branch[] = [
  { title: 'Goals', body: 'What success looks like.', iconName: 'target' },
  { title: 'Team', body: 'Who owns each piece.', iconName: 'users' },
];

const RIGHT: Branch[] = [
  { title: 'Budget', body: 'What it costs to get there.', iconName: 'trendUp' },
  { title: 'Tools', body: 'What you need to execute.', iconName: 'compass' },
];

const BRANCH_DEFAULTS = [...LEFT, ...RIGHT];

function edgePoint(cx: number, cy: number, r: number, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r };
}

export interface HubSpokeContent {
  /** Positionally merged onto the default 4 branches (2 left, 2 right, in
   * that order) — see `mergeFixedList`. */
  readonly branches?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: HubSpokeContent): CanvasElement[] {
  const branches = mergeFixedList<Branch>(BRANCH_DEFAULTS, content?.branches);
  const left = branches.slice(0, LEFT.length);
  const right = branches.slice(LEFT.length);
  const elements: CanvasElement[] = [];

  elements.push(
    circle({ x: HUB_CX - HUB_R, y: HUB_CY - HUB_R, diameter: HUB_R * 2, fill: INK, fillRef: 'ink', name: 'Hub' }),
    text({
      x: HUB_CX - 70,
      y: HUB_CY - 24,
      width: 140,
      height: 48,
      text: 'Project\nOverview',
      name: 'Hub label',
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
      lineHeight: 1.25,
    }),
  );

  const sides: { branches: Branch[]; cx: number; align: 'left' | 'right' }[] = [
    { branches: left, cx: LEFT_CX, align: 'right' },
    { branches: right, cx: RIGHT_CX, align: 'left' },
  ];

  sides.forEach((side) => {
    side.branches.forEach((branch, i) => {
      const cy = ROW_Y[i];
      const accentIndex = i % ACCENT_CYCLE.length;
      const accent = ACCENT_CYCLE[accentIndex];
      const nodeCenter = { x: side.cx, y: cy };
      const from = edgePoint(HUB_CX, HUB_CY, HUB_R, nodeCenter);
      const to = edgePoint(side.cx, cy, NODE_D / 2, { x: HUB_CX, y: HUB_CY });
      const labelX = side.align === 'right' ? 0 : side.cx + NODE_D / 2 + LABEL_GAP;

      elements.push(
        connector(from, to, { name: `Connector ${side.align}-${i + 1}`, stroke: '#c7ccd6', strokeWidth: 2 }),
        circle({
          x: side.cx - NODE_D / 2,
          y: cy - NODE_D / 2,
          diameter: NODE_D,
          fill: accent.tint,
          fillRef: accentRef(accentIndex, 'tint'),
          stroke: accent.solid,
          strokeRef: accentRef(accentIndex, 'solid'),
          strokeWidth: 2,
          name: `Node ${side.align}-${i + 1}`,
        }),
        icon({ x: side.cx - 13, y: cy - 13, size: 26, name: branch.iconName, color: accent.solid, fillRef: accentRef(accentIndex, 'solid'), label: `Node ${side.align}-${i + 1} icon` }),
        text({
          x: labelX,
          y: cy - 24,
          width: LABEL_WIDTH,
          height: 20,
          text: branch.title,
          name: `Branch ${side.align}-${i + 1} title`,
          fontSize: 15,
          fontStyle: 'bold',
          align: side.align,
          fill: INK,
          fillRef: 'ink',
        }),
        text({
          x: labelX,
          y: cy - 2,
          width: LABEL_WIDTH,
          height: 34,
          text: branch.body,
          name: `Branch ${side.align}-${i + 1} body`,
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
  `<circle cx="${HUB_CX}" cy="${HUB_CY}" r="${HUB_R}" fill="${INK}"/>` +
  [LEFT_CX, RIGHT_CX].flatMap((cx) => ROW_Y.map((cy, i) => `<circle cx="${cx}" cy="${cy}" r="${NODE_D / 2}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].tint}" stroke="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}" stroke-width="2"/>`)).join('') +
  `</svg>`;

export const HUB_SPOKE_TEMPLATE: InfographicTemplate = {
  id: 'template-hub-spoke',
  label: 'Hub-and-spoke overview',
  tags: ['hub', 'mindmap', 'branches', 'overview'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
