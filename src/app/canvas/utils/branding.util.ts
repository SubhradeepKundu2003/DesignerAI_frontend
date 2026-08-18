/**
 * TCS/TATA branded mode's element builders (`SetBrandedModeCommand`,
 * `NewsletterAssembler`, `PageFactory`) — pure functions, no Angular DI, in
 * the same spirit as `template-placement.util.ts`.
 *
 * Every element these produce is tagged `decorative: true` (so
 * `DesignLintService` — see its `!element.decorative` filter — never flags
 * a logo sitting in the margin or a background dot as an overlap/bounds
 * issue) and `brandRole` (so `SetBrandedModeCommand` can find and remove
 * exactly what it added, without guessing from names or positions), and
 * `locked: true` so they can't be dragged or resized by accident.
 */
import { BrandAssets } from '../state/brand-assets.store';
import {
  CanvasElement,
  ImageElement,
  isDividerElement,
  isFrameElement,
  isIconElement,
  isShapeElement,
  isTextElement,
} from '../models/canvas-element.model';
import { ThemeColorRef } from '../models/design-theme.model';
import { PAGE_MARGIN } from '../models/editor-config';
import { contrastRatio } from './color-contrast.util';
import { generateId } from './id.util';

export type MonochromeTone = '#000000' | '#ffffff';

interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** Vertical inset of the logo row from the page's top edge, in px — inside
 * `PAGE_MARGIN` so it never collides with a template's own content, which
 * starts at `PAGE_MARGIN`. */
const LOGO_TOP_INSET = 14;
const LOGO_HEIGHT = 28;

/** Dot-grid background pattern geometry — sparse and small enough to read as
 * a watermark texture, not a busy background. Tiled via an SVG `<pattern>`
 * into one image rather than one `ShapeElement` per dot: at this spacing a
 * 794×1123 page holds ~700 dots, which as individual document elements would
 * bloat the JSON, slow the lint/export passes, and add ~700 Konva nodes per
 * page for pure decoration. */
const PATTERN_SPACING = 36;
const PATTERN_DOT_RADIUS = 1.5;
const PATTERN_OPACITY: Record<MonochromeTone, number> = {
  '#000000': 0.05,
  '#ffffff': 0.08,
};

/**
 * Whichever of pure black or white contrasts more strongly against
 * `background` — reuses the same WCAG math `DesignLintService` already
 * trusts (`contrastRatio`), instead of a hand-rolled brightness threshold.
 * Falls back to black (safe on an unparseable/non-hex background) since
 * `contrastRatio` returns `null` for those rather than a false reading.
 */
export function pickMonochromeForeground(background: string): MonochromeTone {
  const againstBlack = contrastRatio(background, '#000000') ?? 0;
  const againstWhite = contrastRatio(background, '#ffffff') ?? 0;
  return againstWhite > againstBlack ? '#ffffff' : '#000000';
}

/** A random black-or-white page background, the branded-mode equivalent of
 * `pickNextTheme`'s randomization for the free-form themes. */
export function pickBrandedBackground(): MonochromeTone {
  return Math.random() < 0.5 ? '#ffffff' : '#000000';
}

/**
 * The muted-text tone that pairs with {@link pickMonochromeForeground}'s pick
 * for `background`. `TCS_CORPORATE.colors.muted` (`#333333`) is calibrated
 * for that theme's white `surface` and is nearly invisible on the black half
 * of a branded page's coin-flip background; this gives "muted" the same
 * always-legible treatment for whichever tone actually contrasts.
 */
export function pickMonochromeMuted(background: string): string {
  return pickMonochromeForeground(background) === '#ffffff' ? '#c7c7c7' : '#4d4d4d';
}

/** `ink`/`muted` resolve to a tone picked from `background`; every other ref
 * (an accent, or none) is left for the caller to leave untouched. */
function brandedToneFor(ref: ThemeColorRef | undefined, background: string): string | undefined {
  if (ref === 'ink') return pickMonochromeForeground(background);
  if (ref === 'muted') return pickMonochromeMuted(background);
  return undefined;
}

interface SurfacePanel {
  readonly fill: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Every `surface`-refed panel in `elements` — e.g. `stat-callout.template.ts`'s
 * white "Callout panel" `rect` sitting behind a stat and its supporting text —
 * grouped by `parentId` with its own literal fill and (unrotated) box.
 *
 * A page's `background` is only the *page's* backdrop; a card like this
 * paints its own opaque backdrop on top of it, so members actually sitting
 * over the card need to read against the card's fill, not the page's — but a
 * groupmate positioned outside the panel (e.g. `picture-placeholder.template.ts`'s
 * caption, below its picture box) still sits directly on the page and must not
 * inherit the panel's tone just for sharing its `parentId` (see
 * {@link localBackgroundFor}, which checks the box, not just the group).
 */
function surfacePanelsByGroup(elements: readonly CanvasElement[]): ReadonlyMap<string, readonly SurfacePanel[]> {
  const map = new Map<string, SurfacePanel[]>();
  for (const element of elements) {
    if (!element.parentId) {
      continue;
    }
    if ((isShapeElement(element) || isFrameElement(element)) && element.fillRef === 'surface') {
      const fill = isFrameElement(element) ? element.background : element.fill;
      if (!fill) {
        continue;
      }
      const panel: SurfacePanel = { fill, x: element.x, y: element.y, width: element.width, height: element.height };
      const panels = map.get(element.parentId);
      if (panels) {
        panels.push(panel);
      } else {
        map.set(element.parentId, [panel]);
      }
    }
  }
  return map;
}

/** `element`'s own surface panel's fill if its centre point actually falls
 * inside one, else `pageBackground` — see {@link surfacePanelsByGroup}. */
function localBackgroundFor(
  element: CanvasElement,
  panelsByGroup: ReadonlyMap<string, readonly SurfacePanel[]>,
  pageBackground: string,
): string {
  const panels = element.parentId && panelsByGroup.get(element.parentId);
  if (!panels) {
    return pageBackground;
  }
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const hit = panels.find((panel) => cx >= panel.x && cx <= panel.x + panel.width && cy >= panel.y && cy <= panel.y + panel.height);
  return hit?.fill ?? pageBackground;
}

/**
 * Recolours every `ink`/`muted`-refed fill, stroke or frame background in
 * `elements` to match `background`'s picked monochrome tone — or, for an
 * element actually positioned over a groupmate's white `surface` panel (see
 * {@link surfacePanelsByGroup}/{@link localBackgroundFor}), that panel's own
 * tone instead, since the panel — not the page — is what its text sits on.
 *
 * Ordinary content is built against `TCS_CORPORATE`'s theme colours —
 * calibrated for its white `surface` — before a page's own black-or-white
 * `background` is ever chosen (`pickBrandedBackground` is a later, per-page
 * step; see `NewsletterAssembler.applyBranding` and `SetBrandedModeCommand`).
 * Half the time that pick lands on black, and without this, every `ink`/
 * `muted` element — headings, body copy, stat labels, a template's own
 * descriptive text — renders near-black on near-black. Logos and the
 * background pattern don't have this problem because `buildLogoElements`/
 * `buildBackgroundPatternElement` already derive their tone from `background`
 * directly; this gives ordinary content the same treatment. Elements with any
 * other `fillRef`/`strokeRef` (an accent) or none at all (a hand-picked
 * colour) are returned unchanged.
 */
export function recolorForBrandedBackground(
  elements: readonly CanvasElement[],
  background: string,
): CanvasElement[] {
  const panelsByGroup = surfacePanelsByGroup(elements);

  return elements.map((element): CanvasElement => {
    const localBackground = localBackgroundFor(element, panelsByGroup, background);
    let next = element;
    if (isTextElement(next) || isShapeElement(next) || isIconElement(next)) {
      const fill = brandedToneFor(next.fillRef, localBackground);
      if (fill) {
        next = { ...next, fill };
      }
    }
    if (isShapeElement(next) || isDividerElement(next)) {
      const stroke = brandedToneFor(next.strokeRef, localBackground);
      if (stroke) {
        next = { ...next, stroke };
      }
    }
    if (isFrameElement(next)) {
      const frameBackground = brandedToneFor(next.fillRef, localBackground);
      if (frameBackground) {
        next = { ...next, background: frameBackground };
      }
    }
    return next;
  });
}

/**
 * TCS logo top-left, TATA logo top-right, each auto-picked black or white to
 * read against `background` via {@link pickMonochromeForeground}, sized from
 * each slot's stored `aspectRatio` (see `BrandAssetsStore`) so this never
 * needs to load the image to know its proportions.
 */
export function buildLogoElements(page: PageSize, background: string, logos: BrandAssets): ImageElement[] {
  const tone = pickMonochromeForeground(background);
  const tcs = tone === '#ffffff' ? logos.tcsWhite : logos.tcsBlack;
  const tata = tone === '#ffffff' ? logos.tataWhite : logos.tataBlack;

  const tcsWidth = Math.round(LOGO_HEIGHT * tcs.aspectRatio);
  const tataWidth = Math.round(LOGO_HEIGHT * tata.aspectRatio);

  return [
    buildLogoElement('TCS logo', tcs.src, PAGE_MARGIN, tcsWidth),
    buildLogoElement('TATA logo', tata.src, page.width - PAGE_MARGIN - tataWidth, tataWidth),
  ];
}

function buildLogoElement(name: string, src: string, x: number, width: number): ImageElement {
  return {
    id: generateId('brand-logo'),
    name,
    type: 'image',
    src,
    x,
    y: LOGO_TOP_INSET,
    width,
    height: LOGO_HEIGHT,
    rotation: 0,
    opacity: 1,
    locked: true,
    visible: true,
    decorative: true,
    brandRole: 'logo',
  };
}

/**
 * A sparse, low-opacity dot grid spanning the full page — the "background
 * can have designs, but only monochrome" texture, tiled in whichever of
 * black/white reads against `background` (the same tone the logos on this
 * page pick, since it's the same contrast question).
 *
 * One `ImageElement` whose `src` is an inline-SVG data URL, rather than one
 * `ShapeElement` per dot — see the "Dot-grid background pattern geometry"
 * comment above for why. The SVG's own `<pattern>` tile repeats the dot, so
 * the document only ever carries one element for this regardless of page size.
 */
export function buildBackgroundPatternElement(page: PageSize, background: string): ImageElement {
  const tone = pickMonochromeForeground(background);
  const opacity = PATTERN_OPACITY[tone];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}">` +
    `<defs><pattern id="p" width="${PATTERN_SPACING}" height="${PATTERN_SPACING}" patternUnits="userSpaceOnUse">` +
    `<circle cx="${PATTERN_SPACING / 2}" cy="${PATTERN_SPACING / 2}" r="${PATTERN_DOT_RADIUS}" fill="${tone}" fill-opacity="${opacity}"/>` +
    `</pattern></defs>` +
    `<rect width="100%" height="100%" fill="url(#p)"/>` +
    `</svg>`;

  return {
    id: generateId('brand-pattern'),
    name: 'Background pattern',
    type: 'image',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
    rotation: 0,
    opacity: 1,
    locked: true,
    visible: true,
    decorative: true,
    brandRole: 'background-pattern',
  };
}
