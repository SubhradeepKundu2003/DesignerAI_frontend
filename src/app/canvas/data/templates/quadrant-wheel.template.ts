import { CanvasElement, ImageElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName, iconDataUrl } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { generateId } from '../../utils/id.util';
import { rect, text, translate } from './template-kit';

/**
 * The one shape here that genuinely can't be a native rectangle/circle: a
 * four-colour donut ring. Built as a single SVG (4 dashed arcs of one circle,
 * the standard donut-chart trick) so it stays crisp; the callouts around it
 * are ordinary native text/shapes so their copy stays editable.
 */

const OUTER_R = 85;
const INNER_R = 30;
const WHEEL_BOX = OUTER_R * 2 + 10;
const CALLOUT = { width: 220, height: 100 };
const GAP = 20;
const ROW_GAP = 16;

const WIDTH = CALLOUT.width * 2 + GAP * 2 + WHEEL_BOX;
const HEIGHT = CALLOUT.height * 2 + ROW_GAP;

const WEDGES: { iconName: IconName }[] = [
  { iconName: 'lightbulb' }, // clockwise-from-top slice 0 (NE)
  { iconName: 'check' }, // slice 1 (SE)
  { iconName: 'trendUp' }, // slice 2 (SW)
  { iconName: 'target' }, // slice 3 (NW)
];

const CALLOUTS: { corner: 'NW' | 'NE' | 'SW' | 'SE'; wedge: number; title: string; body: string }[] = [
  { corner: 'NW', wedge: 3, title: 'Plan', body: 'Set the goal this quadrant supports.' },
  { corner: 'NE', wedge: 0, title: 'Create', body: 'Do the work that moves it forward.' },
  { corner: 'SW', wedge: 2, title: 'Measure', body: 'Check the result against the goal.' },
  { corner: 'SE', wedge: 1, title: 'Improve', body: 'Feed what you learned back in.' },
];

function wheelSvg(): string {
  const cx = WHEEL_BOX / 2;
  const cy = WHEEL_BOX / 2;
  const ringR = (OUTER_R + INNER_R) / 2;
  const ringStroke = OUTER_R - INNER_R;
  const circumference = 2 * Math.PI * ringR;
  const segFull = circumference / 4;
  const seg = segFull - 6;
  const iconR = ringR;

  const arcs = WEDGES.map((_, i) => {
    const accent = ACCENT_CYCLE[i];
    const offset = -(i * segFull);
    return `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${accent.solid}" stroke-width="${ringStroke}" stroke-dasharray="${seg} ${circumference - seg}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join('');

  const icons = WEDGES.map((wedge, i) => {
    const mid = ((-90 + i * 90 + 45) * Math.PI) / 180;
    const x = cx + iconR * Math.cos(mid) - 12;
    const y = cy + iconR * Math.sin(mid) - 12;
    return `<g transform="translate(${x} ${y})">${rawIcon(wedge.iconName, '#ffffff', 24)}</g>`;
  }).join('');

  const hole = `<circle cx="${cx}" cy="${cy}" r="${INNER_R - 4}" fill="#ffffff" stroke="${BORDER}" stroke-width="1"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WHEEL_BOX}" height="${WHEEL_BOX}" viewBox="0 0 ${WHEEL_BOX} ${WHEEL_BOX}">` +
    arcs +
    hole +
    icons +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Bare `<path>`/`<circle>` markup for one icon, for embedding inside a bigger SVG (no wrapping `<svg>`). */
function rawIcon(name: IconName, color: string, size: number): string {
  const src = iconDataUrl(name, color, size);
  const svgText = decodeURIComponent(src.slice('data:image/svg+xml;utf8,'.length));
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svgText);
  return match ? match[1] : '';
}

function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  const wheelX = CALLOUT.width + GAP;
  const wheelY = (HEIGHT - WHEEL_BOX) / 2;
  const wheelImage: ImageElement = {
    id: generateId(),
    name: 'Quadrant wheel',
    x: wheelX,
    y: wheelY,
    width: WHEEL_BOX,
    height: WHEEL_BOX,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'image',
    src: wheelSvg(),
  };
  elements.push(wheelImage);

  CALLOUTS.forEach((callout, i) => {
    const accent = ACCENT_CYCLE[callout.wedge];
    const x = callout.corner === 'NW' || callout.corner === 'SW' ? 0 : wheelX + WHEEL_BOX + GAP;
    const y = callout.corner === 'NW' || callout.corner === 'NE' ? 0 : CALLOUT.height + ROW_GAP;

    elements.push(
      rect({
        x,
        y,
        width: CALLOUT.width,
        height: CALLOUT.height,
        fill: 'transparent',
        stroke: accent.solid,
        strokeRef: accentRef(callout.wedge, 'solid'),
        strokeWidth: 1.5,
        cornerRadius: 50,
        name: `Callout ${i + 1}`,
      }),
      text({
        x: x + 20,
        y: y + 16,
        width: CALLOUT.width - 40,
        height: 20,
        text: callout.title,
        name: `Callout ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        fill: accent.solid,
        fillRef: accentRef(callout.wedge, 'solid'),
      }),
      text({
        x: x + 20,
        y: y + 40,
        width: CALLOUT.width - 40,
        height: 44,
        text: callout.body,
        name: `Callout ${i + 1} body`,
        fontSize: 12.5,
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.35,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>` +
  `<circle cx="${CALLOUT.width + GAP + WHEEL_BOX / 2}" cy="${HEIGHT / 2}" r="${OUTER_R}" fill="none" stroke="${INK}" stroke-width="20" stroke-dasharray="1 14"/>` +
  CALLOUTS.map((c) => {
    const x = c.corner === 'NW' || c.corner === 'SW' ? 0 : CALLOUT.width + GAP * 2 + WHEEL_BOX;
    const y = c.corner === 'NW' || c.corner === 'NE' ? 0 : CALLOUT.height + ROW_GAP;
    return `<rect x="${x}" y="${y}" width="${CALLOUT.width}" height="${CALLOUT.height}" rx="40" fill="none" stroke="${ACCENT_CYCLE[c.wedge].solid}" stroke-width="3"/>`;
  }).join('') +
  `</svg>`;

export const QUADRANT_WHEEL_TEMPLATE: InfographicTemplate = {
  id: 'template-quadrant-wheel',
  label: 'Quadrant wheel',
  tags: ['wheel', 'quadrant', 'icons', 'cycle'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
