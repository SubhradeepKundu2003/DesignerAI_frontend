import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, MUTED } from './palette';
import { circle, connector, icon, text, translate } from './template-kit';

const COLS = 3;
const COL_WIDTH = 216;
const GAP = 25;
const WIDTH = COLS * COL_WIDTH + (COLS - 1) * GAP;
const HEIGHT = 180;

const STATS: { value: string; label: string; iconName: IconName }[] = [
  { value: '150+', label: 'New clients', iconName: 'users' },
  { value: '24/7', label: 'Support coverage', iconName: 'trendUp' },
  { value: '99%', label: 'Satisfaction', iconName: 'check' },
];

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  STATS.forEach((stat, i) => {
    const colX = i * (COL_WIDTH + GAP);
    const accent = ACCENT_CYCLE[i];
    const badgeDiameter = 56;
    const badgeCenter = { x: colX + COL_WIDTH / 2, y: 20 + badgeDiameter / 2 };

    if (i > 0) {
      const gapX = colX - GAP / 2;
      elements.push(connector({ x: gapX, y: 12 }, { x: gapX, y: HEIGHT - 12 }, { name: `Divider ${i}`, stroke: BORDER, strokeWidth: 1 }));
    }

    elements.push(
      circle({ x: badgeCenter.x - badgeDiameter / 2, y: badgeCenter.y - badgeDiameter / 2, diameter: badgeDiameter, fill: accent.tint, name: `Stat ${i + 1} badge` }),
      icon({ x: badgeCenter.x - 14, y: badgeCenter.y - 14, size: 28, name: stat.iconName, color: accent.solid, label: `Stat ${i + 1} icon` }),
      text({
        x: colX,
        y: 20 + badgeDiameter + 12,
        width: COL_WIDTH,
        height: 42,
        text: stat.value,
        name: `Stat ${i + 1} value`,
        fontSize: 32,
        fontStyle: 'bold',
        align: 'center',
        fill: accent.solid,
        lineHeight: 1.1,
      }),
      text({
        x: colX,
        y: 20 + badgeDiameter + 12 + 42,
        width: COL_WIDTH,
        height: 20,
        text: stat.label,
        name: `Stat ${i + 1} label`,
        fontSize: 13,
        align: 'center',
        fill: MUTED,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  STATS.map((_, i) => {
    const colX = i * (COL_WIDTH + GAP);
    const accent = ACCENT_CYCLE[i];
    return `<circle cx="${colX + COL_WIDTH / 2}" cy="48" r="28" fill="${accent.tint}"/><rect x="${colX}" y="100" width="${COL_WIDTH}" height="30" rx="6" fill="${accent.tint}"/>`;
  }).join('') +
  `</svg>`;

export const STAT_ROW_TEMPLATE: InfographicTemplate = {
  id: 'template-stat-row',
  label: 'Three-stat highlight row',
  tags: ['stats', 'metrics', 'row'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
