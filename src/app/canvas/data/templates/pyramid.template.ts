import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { ACCENT_CYCLE, accentRef } from './palette';
import { mergeFixedList, rect, text, translate } from './template-kit';

const WIDTH = 460;
const TIER_HEIGHT = 62;
const TIER_GAP = 4;
const TOP_TIER_WIDTH = 140;

const TIERS: { title: string; body: string }[] = [
  { title: 'Vision', body: 'The single outcome every level below serves' },
  { title: 'Strategy', body: 'The few bets chosen to get there' },
  { title: 'Initiatives', body: 'Named programs of work behind each bet' },
  { title: 'Daily execution', body: 'Tasks teams ship against every sprint' },
];

const HEIGHT = TIERS.length * TIER_HEIGHT + (TIERS.length - 1) * TIER_GAP;

/**
 * A hierarchy pyramid, stepped rather than a true triangle: `ShapeElement`
 * only offers `rectangle`/`circle` (see `canvas-element.model.ts`), so each
 * tier is a centred rect narrowing toward the top — the same trick real
 * slide decks use when a design tool has no native polygon primitive.
 */
export interface PyramidContent {
  /** Positionally merged onto the default 4 tiers — see `mergeFixedList`. */
  readonly tiers?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: PyramidContent): CanvasElement[] {
  const tiers = mergeFixedList<(typeof TIERS)[number]>(TIERS, content?.tiers);
  const elements: CanvasElement[] = [];
  const widthStep = (WIDTH - TOP_TIER_WIDTH) / (tiers.length - 1);

  tiers.forEach((tier, i) => {
    const accentIndex = i % ACCENT_CYCLE.length;
    const accent = ACCENT_CYCLE[accentIndex];
    const tierWidth = WIDTH - i * widthStep;
    const x = (WIDTH - tierWidth) / 2;
    const y = i * (TIER_HEIGHT + TIER_GAP);

    elements.push(
      rect({
        x,
        y,
        width: tierWidth,
        height: TIER_HEIGHT,
        fill: accent.solid,
        fillRef: accentRef(accentIndex, 'solid'),
        cornerRadius: 4,
        name: `Tier ${i + 1}`,
      }),
      text({
        x: x + 24,
        y: y + 10,
        width: tierWidth - 48,
        height: 20,
        text: tier.title,
        name: `Tier ${i + 1} title`,
        fontSize: 15,
        fontStyle: 'bold',
        align: 'center',
        fill: '#ffffff',
      }),
      text({
        x: x + 24,
        y: y + 32,
        width: tierWidth - 48,
        height: 22,
        text: tier.body,
        name: `Tier ${i + 1} body`,
        fontSize: 11.5,
        align: 'center',
        fill: '#ffffff',
        lineHeight: 1.3,
      }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  TIERS.map((_, i) => {
    const widthStep = (WIDTH - TOP_TIER_WIDTH) / (TIERS.length - 1);
    const tierWidth = WIDTH - i * widthStep;
    const x = (WIDTH - tierWidth) / 2;
    const y = i * (TIER_HEIGHT + TIER_GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return `<rect x="${x}" y="${y}" width="${tierWidth}" height="${TIER_HEIGHT}" rx="4" fill="${accent.solid}"/>`;
  }).join('') +
  `</svg>`;

export const PYRAMID_TEMPLATE: InfographicTemplate = {
  id: 'template-pyramid',
  label: 'Four-tier hierarchy pyramid',
  tags: ['pyramid', 'hierarchy', 'strategy', 'levels'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
