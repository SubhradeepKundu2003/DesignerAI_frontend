import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, MUTED } from './palette';
import { circle, connector, icon, rect, text, translate } from './template-kit';
import { IconName } from './icon-svg';

const WIDTH = 698;
const HEIGHT = 358;

const HUB = { cx: 95, cy: 179, r: 95 };
const BAR = { x: 280, width: 418, height: 72, cornerRadius: 16 };
const ROW_GAP = 14;
const ROW_TOPS = [14, 14 + 1 * (BAR.height + ROW_GAP), 14 + 2 * (BAR.height + ROW_GAP), 14 + 3 * (BAR.height + ROW_GAP)];

const STEPS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Discover', body: 'Add a short description of this step.', iconName: 'compass' },
  { title: 'Define', body: 'Explain what happens here in a line or two.', iconName: 'target' },
  { title: 'Design', body: 'Swap this icon and text for your own step.', iconName: 'lightbulb' },
  { title: 'Deliver', body: 'Wrap up with the outcome or result.', iconName: 'flag' },
];

function edgePoint(cx: number, cy: number, r: number, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r };
}

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  elements.push(
    circle({ x: 0, y: HUB.cy - HUB.r, diameter: HUB.r * 2, fill: INK, name: 'Hub' }),
    text({
      x: HUB.cx - 75,
      y: HUB.cy - 25,
      width: 150,
      height: 50,
      text: 'Key\nSteps',
      name: 'Hub heading',
      fontSize: 20,
      fontStyle: 'bold',
      align: 'center',
      fill: '#ffffff',
      lineHeight: 1.25,
    }),
  );

  STEPS.forEach((step, i) => {
    const accent = ACCENT_CYCLE[i];
    const barY = ROW_TOPS[i];
    const barCenterY = barY + BAR.height / 2;
    const badgeCenter = { x: 232, y: barCenterY };
    const from = edgePoint(HUB.cx, HUB.cy, HUB.r, badgeCenter);

    elements.push(
      connector(from, badgeCenter, { name: `Connector ${i + 1}`, stroke: '#c7ccd6', strokeWidth: 2 }),
      rect({ x: BAR.x, y: barY, width: BAR.width, height: BAR.height, fill: accent.tint, cornerRadius: BAR.cornerRadius, name: `Step ${i + 1} bar` }),
      circle({ x: badgeCenter.x - 24, y: badgeCenter.y - 24, diameter: 48, fill: accent.solid, name: `Step ${i + 1} number` }),
      text({
        x: badgeCenter.x - 24,
        y: badgeCenter.y - 13,
        width: 48,
        height: 26,
        text: String(i + 1).padStart(2, '0'),
        name: `Step ${i + 1} number label`,
        fontSize: 20,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.2,
      }),
      icon({ x: BAR.x + 20, y: barY + (BAR.height - 28) / 2, size: 28, name: step.iconName, color: accent.solid, label: `Step ${i + 1} icon` }),
      text({
        x: BAR.x + 62,
        y: barY + 12,
        width: BAR.width - 62 - 20,
        height: 20,
        text: step.title,
        name: `Step ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        fill: INK,
        lineHeight: 1.2,
      }),
      text({
        x: BAR.x + 62,
        y: barY + 34,
        width: BAR.width - 62 - 20,
        height: 34,
        text: step.body,
        name: `Step ${i + 1} body`,
        fontSize: 13,
        fill: MUTED,
        lineHeight: 1.3,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<circle cx="${HUB.cx}" cy="${HUB.cy}" r="${HUB.r}" fill="${INK}"/>` +
  ROW_TOPS.map((y, i) => {
    const accent = ACCENT_CYCLE[i];
    return `<rect x="${BAR.x}" y="${y}" width="${BAR.width}" height="${BAR.height}" rx="${BAR.cornerRadius}" fill="${accent.tint}"/><circle cx="232" cy="${y + BAR.height / 2}" r="24" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const RADIAL_PROCESS_TEMPLATE: InfographicTemplate = {
  id: 'template-radial-process',
  label: 'Four-step radial process',
  tags: ['process', 'radial', 'numbered', 'steps'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
