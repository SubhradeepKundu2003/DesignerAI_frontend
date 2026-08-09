import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, INK, accentRef } from './palette';
import { rect, text, translate } from './template-kit';

const WIDTH = 640;
const LABEL_HEIGHT = 20;
const GAP_LABEL_BAR = 8;
const BAR_HEIGHT = 14;
const ROW_GAP = 24;
const ROW_BLOCK = LABEL_HEIGHT + GAP_LABEL_BAR + BAR_HEIGHT;
const VALUE_WIDTH = 70;

const ITEMS: { label: string; pct: number }[] = [
  { label: 'Cloud & digital services', pct: 82 },
  { label: 'AI & automation', pct: 74 },
  { label: 'Enterprise applications', pct: 65 },
  { label: 'Cybersecurity', pct: 58 },
];

const HEIGHT = ITEMS.length * ROW_BLOCK + (ITEMS.length - 1) * ROW_GAP;

/**
 * A ranked list of labelled percentage bars — the editable counterpart to
 * the flattened "Four-bar percentage ranking" PNG in `infographics.manifest.ts`
 * (`infographic-06`). Manually positioned like `vertical-timeline.template.ts`
 * rather than built on `frame()`: a filled bar sits *on top of* its own
 * track rect at the same origin, which a single-axis auto-layout frame can't
 * express (frame children only ever stack, never overlay).
 */
function build(origin: { x: number; y: number }): CanvasElement[] {
  const elements: CanvasElement[] = [];

  ITEMS.forEach((item, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const rowY = i * (ROW_BLOCK + ROW_GAP);
    const barY = rowY + LABEL_HEIGHT + GAP_LABEL_BAR;
    const fillWidth = Math.max(BAR_HEIGHT, (WIDTH * item.pct) / 100);

    elements.push(
      text({
        x: 0,
        y: rowY,
        width: WIDTH - VALUE_WIDTH - 10,
        height: LABEL_HEIGHT,
        text: item.label,
        name: `Rank ${i + 1} label`,
        fontSize: 14,
        fontStyle: 'bold',
        fill: INK,
        fillRef: 'ink',
      }),
      text({
        x: WIDTH - VALUE_WIDTH,
        y: rowY,
        width: VALUE_WIDTH,
        height: LABEL_HEIGHT,
        text: `${item.pct}%`,
        name: `Rank ${i + 1} value`,
        fontSize: 14,
        fontStyle: 'bold',
        align: 'right',
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
      }),
      rect({
        x: 0,
        y: barY,
        width: WIDTH,
        height: BAR_HEIGHT,
        fill: accent.tint,
        fillRef: accentRef(accentIndex, 'tint'),
        cornerRadius: BAR_HEIGHT / 2,
        name: `Rank ${i + 1} track`,
      }),
      rect({
        x: 0,
        y: barY,
        width: fillWidth,
        height: BAR_HEIGHT,
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        cornerRadius: BAR_HEIGHT / 2,
        name: `Rank ${i + 1} fill`,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  ITEMS.map((item, i) => {
    const rowY = i * (ROW_BLOCK + ROW_GAP);
    const barY = rowY + LABEL_HEIGHT + GAP_LABEL_BAR;
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const fillWidth = Math.max(BAR_HEIGHT, (WIDTH * item.pct) / 100);
    return (
      `<rect x="0" y="${rowY}" width="200" height="12" rx="3" fill="${INK}"/>` +
      `<rect x="0" y="${barY}" width="${WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${accent.tint}"/>` +
      `<rect x="0" y="${barY}" width="${fillWidth}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${accent.solid}"/>`
    );
  }).join('') +
  `</svg>`;

export const PERCENTAGE_BAR_RANKING_TEMPLATE: InfographicTemplate = {
  id: 'template-percentage-bar-ranking',
  label: 'Percentage bar ranking',
  tags: ['ranking', 'bars', 'percentage', 'comparison', 'list'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
