import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, BORDER, INK, MUTED, accentRef } from './palette';
import { frame, icon, mergeFixedList, text, translate } from './template-kit';

const ICON_SIZE = 32;
const ICON_GAP = 18;
const TEXT_WIDTH = 590;
const WIDTH = ICON_SIZE + ICON_GAP + TEXT_WIDTH;
const LIST_GAP = 22;
const TITLE_HEIGHT = 22;
const BODY_HEIGHT = 40;
const COL_GAP = 6;
const ENTRY_HEIGHT = Math.max(ICON_SIZE, TITLE_HEIGHT + COL_GAP + BODY_HEIGHT);

const ITEMS: { title: string; body: string; iconName: IconName }[] = [
  { title: 'Digital transformation', body: 'Modernizing legacy systems with cloud-native platforms and automation.', iconName: 'lightbulb' },
  { title: 'Talent development', body: 'Upskilling associates through structured learning paths and certifications.', iconName: 'users' },
  { title: 'Client partnerships', body: 'Co-innovating with clients to deliver measurable business outcomes.', iconName: 'target' },
  { title: 'Sustainability', body: 'Reducing operational footprint while investing in community programs.', iconName: 'compass' },
];

const HEIGHT = ITEMS.length * ENTRY_HEIGHT + (ITEMS.length - 1) * LIST_GAP;

/**
 * A clean vertical list of icon+title+description rows — unlike
 * `vertical-timeline.template.ts` there is no connecting spine or step
 * numbering, so it reads as a content/agenda list rather than a sequential
 * process. Each row nests a two-level frame (icon next to a title/body text
 * column) inside the outer list frame, the same "translate a whole bundle by
 * where the outer frame placed its shell" composition `card-grid.template.ts`
 * uses for its row-of-cards grid.
 */
function buildEntry(item: (typeof ITEMS)[number], index: number): CanvasElement[] {
  const accentIndex = index % ACCENT_CYCLE.length;
  const accent = ACCENT_CYCLE[accentIndex];

  const iconEl = icon({
    x: 0,
    y: 0,
    size: ICON_SIZE,
    name: item.iconName,
    color: accent.solid,
    fillRef: accentRef(accentIndex, 'solid'),
    label: `Item ${index + 1} icon`,
  });
  const titleEl = text({
    x: 0,
    y: 0,
    width: TEXT_WIDTH,
    height: TITLE_HEIGHT,
    text: item.title,
    name: `Item ${index + 1} title`,
    fontSize: 16,
    fontStyle: 'bold',
    fill: INK,
    fillRef: 'ink',
    lineHeight: 1.2,
  });
  const bodyEl = text({
    x: 0,
    y: 0,
    width: TEXT_WIDTH,
    height: BODY_HEIGHT,
    text: item.body,
    name: `Item ${index + 1} body`,
    fontSize: 13,
    fill: MUTED,
    fillRef: 'muted',
    lineHeight: 1.35,
  });

  const textCol = frame({ x: 0, y: 0, name: `Item ${index + 1} text`, layout: 'column', gap: COL_GAP, padding: 0, children: [titleEl, bodyEl] });
  const [colShell, colTitle, colBody] = textCol;

  const entryRow = frame({ x: 0, y: 0, name: `Item ${index + 1} row`, layout: 'row', gap: ICON_GAP, padding: 0, children: [iconEl, colShell] });
  const [entryShell, entryIcon, entryColShell] = entryRow;

  const translatedTextChildren = translate([colTitle, colBody], { x: entryColShell.x, y: entryColShell.y });

  return [entryShell, entryIcon, entryColShell, ...translatedTextChildren];
}

export interface IconBulletListContent {
  /** Positionally merged onto the default 4 items — see `mergeFixedList`. */
  readonly items?: readonly Partial<{ title: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: IconBulletListContent): CanvasElement[] {
  const items = mergeFixedList<(typeof ITEMS)[number]>(ITEMS, content?.items);
  const entries = items.map((item, i) => buildEntry(item, i));
  const list = frame({ x: 0, y: 0, name: 'Icon bullet list', layout: 'column', gap: LIST_GAP, padding: 0, children: entries.map((entry) => entry[0]) });
  const [listShell, ...positionedEntryShells] = list;
  const entryElements = entries.flatMap((entry, i) => translate(entry, positionedEntryShells[i]));

  return translate([listShell, ...entryElements], origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  ITEMS.map((_, i) => {
    const y = i * (ENTRY_HEIGHT + LIST_GAP);
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    return (
      `<circle cx="${ICON_SIZE / 2}" cy="${y + ENTRY_HEIGHT / 2}" r="${ICON_SIZE / 2}" fill="${accent.solid}"/>` +
      `<rect x="${ICON_SIZE + ICON_GAP}" y="${y + 6}" width="220" height="14" rx="4" fill="${INK}"/>` +
      `<rect x="${ICON_SIZE + ICON_GAP}" y="${y + 28}" width="${TEXT_WIDTH - 40}" height="10" rx="3" fill="${BORDER}"/>`
    );
  }).join('') +
  `</svg>`;

export const ICON_BULLET_LIST_TEMPLATE: InfographicTemplate = {
  id: 'template-icon-bullet-list',
  label: 'Icon bullet content list',
  tags: ['list', 'bullets', 'content', 'icons', 'vertical'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
