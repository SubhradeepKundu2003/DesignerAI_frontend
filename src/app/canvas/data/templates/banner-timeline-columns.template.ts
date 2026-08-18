import { CanvasElement } from '../../models/canvas-element.model';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { IconName } from './icon-svg';
import { ACCENT_CYCLE, INK, MUTED, accentRef } from './palette';
import { circle, connector, icon, mergeFixedList, rect, text, translate } from './template-kit';

const COL_W = 315;
const ICON_SEG_W = 90;
const BANNER_H = 50;
const ROW_H = 92;
const GAP = 30;
const RIGHT_COL_X = COL_W + GAP;
const SPINE_X = RIGHT_COL_X + COL_W + 26;

const WIDTH = SPINE_X + 12;
const HEIGHT = 4 * ROW_H;

const LEFT_ITEMS: { label: string; body: string; iconName: IconName }[] = [
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'users' },
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'target' },
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'gear' },
];

const RIGHT_ITEMS: { label: string; body: string; iconName: IconName }[] = [
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'search' },
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'compass' },
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'lightbulb' },
  { label: 'Lorem ipsum', body: 'A short line of supporting detail for this point.', iconName: 'flag' },
];

/**
 * A left column of icon banners next to a right column of icon banners
 * strung along a dashed vertical spine — the editable counterpart to the
 * flattened "Seven-item two-column banner list" PNG (`infographic-18`). Each
 * banner is a two-tone bar (native rectangles) rather than a chevron
 * polygon, so both segments stay independently recolourable.
 */
export interface BannerTimelineColumnsContent {
  /** Positionally merged onto the default 3 left items — see `mergeFixedList`. */
  readonly leftItems?: readonly Partial<{ label: string; body: string }>[];
  /** Positionally merged onto the default 4 right items — see `mergeFixedList`. */
  readonly rightItems?: readonly Partial<{ label: string; body: string }>[];
}

function build(origin: { x: number; y: number }, content?: BannerTimelineColumnsContent): CanvasElement[] {
  const leftItems = mergeFixedList<(typeof LEFT_ITEMS)[number]>(LEFT_ITEMS, content?.leftItems);
  const rightItems = mergeFixedList<(typeof RIGHT_ITEMS)[number]>(RIGHT_ITEMS, content?.rightItems);
  const elements: CanvasElement[] = [];

  leftItems.forEach((item, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const y = i * ROW_H;

    elements.push(
      rect({ x: 0, y, width: COL_W - ICON_SEG_W, height: BANNER_H, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Left banner ${i + 1} label segment` }),
      rect({ x: COL_W - ICON_SEG_W, y, width: ICON_SEG_W, height: BANNER_H, fill: INK, fillRef: 'ink', name: `Left banner ${i + 1} icon segment` }),
      icon({ x: COL_W - ICON_SEG_W / 2 - 14, y: y + BANNER_H / 2 - 14, size: 28, name: item.iconName, color: '#ffffff', label: `Left banner ${i + 1} icon` }),
      text({
        x: 16,
        y: y + 13,
        width: COL_W - ICON_SEG_W - 32,
        height: 24,
        text: item.label,
        name: `Left banner ${i + 1} label`,
        fontSize: 15,
        fontStyle: 'bold',
        fill: '#ffffff',
      }),
      text({
        x: 0,
        y: y + BANNER_H + 10,
        width: COL_W,
        height: ROW_H - BANNER_H - 14,
        text: item.body,
        name: `Left banner ${i + 1} body`,
        fontSize: 12.5,
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.3,
      }),
    );
  });

  const spineFirstY = BANNER_H / 2;
  const spineLastY = (rightItems.length - 1) * ROW_H + BANNER_H / 2;
  elements.push(connector({ x: SPINE_X, y: spineFirstY }, { x: SPINE_X, y: spineLastY }, { name: 'Spine', stroke: '#c7ccd6', strokeWidth: 2, dash: [3, 4] }));

  rightItems.forEach((item, i) => {
    const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
    const y = i * ROW_H;

    elements.push(
      rect({ x: RIGHT_COL_X, y, width: ICON_SEG_W, height: BANNER_H, fill: INK, fillRef: 'ink', name: `Right banner ${i + 1} icon segment` }),
      rect({ x: RIGHT_COL_X + ICON_SEG_W, y, width: COL_W - ICON_SEG_W, height: BANNER_H, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Right banner ${i + 1} label segment` }),
      icon({ x: RIGHT_COL_X + ICON_SEG_W / 2 - 14, y: y + BANNER_H / 2 - 14, size: 28, name: item.iconName, color: '#ffffff', label: `Right banner ${i + 1} icon` }),
      text({
        x: RIGHT_COL_X + ICON_SEG_W + 16,
        y: y + 13,
        width: COL_W - ICON_SEG_W - 32,
        height: 24,
        text: item.label,
        name: `Right banner ${i + 1} label`,
        fontSize: 15,
        fontStyle: 'bold',
        fill: '#ffffff',
      }),
      text({
        x: RIGHT_COL_X,
        y: y + BANNER_H + 10,
        width: COL_W,
        height: ROW_H - BANNER_H - 14,
        text: item.body,
        name: `Right banner ${i + 1} body`,
        fontSize: 12.5,
        fill: MUTED,
        fillRef: 'muted',
        lineHeight: 1.3,
      }),
      circle({ x: SPINE_X - 6, y: y + BANNER_H / 2 - 6, diameter: 12, fill: accent.solid, fillRef: accentRef(i, 'solid'), name: `Right banner ${i + 1} spine dot` }),
    );
  });

  return translate(elements, origin);
}

const THUMBNAIL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
  LEFT_ITEMS.map((_, i) => `<rect x="0" y="${i * ROW_H}" width="${COL_W}" height="${BANNER_H}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}"/>`).join('') +
  RIGHT_ITEMS.map((_, i) => `<rect x="${RIGHT_COL_X}" y="${i * ROW_H}" width="${COL_W}" height="${BANNER_H}" fill="${ACCENT_CYCLE[i % ACCENT_CYCLE.length].solid}"/>`).join('') +
  `</svg>`;

export const BANNER_TIMELINE_COLUMNS_TEMPLATE: InfographicTemplate = {
  id: 'template-banner-timeline-columns',
  label: 'Two-column banner timeline',
  tags: ['list', 'banners', 'timeline'],
  size: { width: WIDTH, height: HEIGHT },
  thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(THUMBNAIL)}`,
  build,
};
