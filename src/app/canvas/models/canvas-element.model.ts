/**
 * The element model of the Canvas JSON document.
 *
 * This file is the contract between everything in the editor: the state stores,
 * the Konva renderers, the properties panel and — later — the AI service that
 * generates newsletters. It must stay pure data: no functions, no Konva nodes,
 * no DOM references, so a document round-trips losslessly through
 * `JSON.stringify` / `JSON.parse`.
 */

import { IconName } from '../../shared/icons/icon-registry';
import { ThemeColorRef } from './design-theme.model';

export type ElementType = 'text' | 'shape' | 'divider' | 'image' | 'icon' | 'frame';

export type ShapeKind = 'rectangle' | 'circle' | 'semicircle';

/** Which edge of a `semicircle` element's box its flat (diameter) side sits on — the dome bulges toward the opposite edge. Ignored for other shape kinds. */
export type ArcOrientation = 'up' | 'down' | 'left' | 'right';

export type TextAlign = 'left' | 'center' | 'right';

export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold italic';

/** Properties every element on a page shares. */
export interface BaseElement {
  readonly id: string;
  /** Display name, shown in the layers panel and renamable by the user. */
  name: string;
  /** Position of the element's top-left corner, in page coordinates (px). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees, around the element's top-left corner. */
  rotation: number;
  /** 0 = fully transparent, 1 = fully opaque. */
  opacity: number;
  /** Locked elements cannot be selected, dragged or transformed on the canvas. */
  locked: boolean;
  /** Hidden elements are not rendered, but remain in the document. */
  visible: boolean;
  /** The id of the {@link GroupElement} this element belongs to, if any. */
  parentId?: string;
  /**
   * Purely ambient background art (e.g. a page-level half-circle motif) —
   * excluded from `DesignLintService`'s bounds/overlap checks, which exist to
   * catch real content mistakes, not to flag a deliberately off-canvas or
   * content-overlapping decorative shape as an error.
   */
  decorative?: boolean;
  /**
   * Renders with a soft drop shadow — and, on a `shape`, a light-to-dark
   * gradient computed from `fill` in place of a flat colour — instead of a
   * plain flat fill. Set by the built-in infographic templates
   * (`buildTemplatePlacement`) for a raised, dimensional look; hand-drawn
   * elements from the toolbar leave it unset and stay flat. Purely a
   * Konva-side paint hint: `fill`/`src` stay the source of truth for theme
   * recolouring and for consumers that read the model directly (PPTX export).
   */
  depth?: boolean;
  /**
   * Marks an element as belonging to TCS/TATA branded mode (`utils/branding.util.ts`),
   * so `SetBrandedModeCommand` can find and remove exactly what it added when
   * the mode is switched off, without guessing from names or positions. Never
   * read by renderers — purely a bookkeeping tag, same spirit as `decorative`.
   */
  brandRole?: 'logo' | 'background-pattern';
}

/**
 * A named collection of top-level elements that move, transform, delete and
 * duplicate as one unit.
 *
 * Deliberately *not* a member of the {@link CanvasElement} union: a group is
 * never handed to an element renderer, so keeping it separate means the
 * renderer registry, the element factory and every properties-panel
 * type-narrowing switch stay exhaustive without a `'group'` case to ignore.
 * Its `x`/`y`/`width`/`height` are a derived bounding box of its children,
 * recomputed whenever a member changes — not independently editable.
 */
export interface GroupElement {
  readonly id: string;
  readonly type: 'group';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  visible: boolean;
  /** Ids of this group's members, in paint order. */
  childIds: string[];
}

export interface TextElement extends BaseElement {
  readonly type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  /** Text colour, any CSS colour string. */
  fill: string;
  /** When set, `fill` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  fillRef?: ThemeColorRef;
  fontStyle: FontStyle;
  align: TextAlign;
  /** Extra space between characters, in px. */
  letterSpacing: number;
  /** Multiplier of the font size. */
  lineHeight: number;
}

export interface ShapeElement extends BaseElement {
  readonly type: 'shape';
  shape: ShapeKind;
  fill: string;
  /** When set, `fill` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  fillRef?: ThemeColorRef;
  stroke: string;
  /** When set, `stroke` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  strokeRef?: ThemeColorRef;
  strokeWidth: number;
  /** Rectangles only; ignored when `shape` is `circle` or `semicircle`. */
  cornerRadius: number;
  /** `semicircle` only — which box edge the flat side sits on. Defaults to `'up'` when unset. */
  arcOrientation?: ArcOrientation;
}

export interface DividerElement extends BaseElement {
  readonly type: 'divider';
  stroke: string;
  /** When set, `stroke` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  strokeRef?: ThemeColorRef;
  strokeWidth: number;
  /** Dash pattern, e.g. `[6, 4]`. An empty array renders a solid line. */
  dash: number[];
}

export interface ImageElement extends BaseElement {
  readonly type: 'image';
  /** Data URL in this phase; a remote URL once a backend exists. */
  src: string;
}

/**
 * A single-colour decorative glyph from the shared icon set (see
 * `shared/icons/icon-registry.ts`), drawn live rather than baked into a
 * flattened `ImageElement` — so a theme swap can recolour it, and an AI
 * agent can pick it by id from a known, finite list.
 *
 * Square by convention: `width`/`height` (from `BaseElement`) are kept equal
 * by whatever creates or resizes one, the same way a circle `ShapeElement`
 * is just a square box with a round `sceneFunc` — there is no separate
 * `size` field to fall out of sync with the box the transformer drags.
 */
export interface IconElement extends BaseElement {
  readonly type: 'icon';
  iconId: IconName;
  fill: string;
  /** When set, `fill` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  fillRef?: ThemeColorRef;
}

export type FrameLayout = 'row' | 'column';

/**
 * An auto-arranging container: `childIds` lay out along one axis with a
 * `gap`, inset from the frame's own box by `padding` — a minimal flexbox.
 *
 * Distinct from {@link GroupElement}: a group's box is a *derived* bounding
 * box of freely-positioned members, recomputed after the fact. A frame is
 * the other way round — it *owns* its children's `x`/`y`/`width`/`height`,
 * recomputing them from `layout`/`gap`/`padding` whenever any of those or the
 * child list changes (see `CanvasStore.layoutFrame`). Children stay ordinary
 * top-level entries in `Page.elements`, exactly like a group's members, so
 * every other command (delete, duplicate, reorder) keeps working unmodified.
 *
 * Known v1 gap: dragging a frame *does* correctly re-flow its children once
 * the drag commits (`CanvasStore.patchElement` re-lays-out a patched frame),
 * but they do not visually follow the frame node during the drag itself —
 * `CanvasInteractionService`'s live drag-follow only tracks the transformer's
 * own selected nodes. Selecting the frame's children along with it works
 * around this today; teaching drag-follow about frame membership is a
 * fast-follow, not required for the layout engine itself to be correct.
 */
export interface FrameElement extends BaseElement {
  readonly type: 'frame';
  layout: FrameLayout;
  gap: number;
  padding: number;
  childIds: string[];
  background?: string;
  /** When set, `background` is a theme colour and gets recomputed on `ApplyThemeCommand`. */
  fillRef?: ThemeColorRef;
}

/**
 * Discriminated union of everything that can live on a page. Switching on
 * `type` gives exhaustive checking in renderers and the properties panel, so
 * adding a new element type surfaces every place that must handle it.
 */
export type CanvasElement =
  | TextElement
  | ShapeElement
  | DividerElement
  | ImageElement
  | IconElement
  | FrameElement;

/** The element of the union carrying a given `type`. */
export type ElementOfType<K extends ElementType> = Extract<CanvasElement, { type: K }>;

/**
 * A partial update to an element, as produced by the properties panel or a drag.
 *
 * Distributed over the union deliberately: `Partial<Omit<CanvasElement, …>>`
 * would collapse to the properties *all* element types share, which would leave
 * `text`, `fill`, `src` and every other type-specific property unpatchable.
 */
export type ElementPatch = CanvasElement extends infer T
  ? T extends CanvasElement
    ? Partial<Omit<T, 'id' | 'type'>>
    : never
  : never;

export function isTextElement(element: CanvasElement): element is TextElement {
  return element.type === 'text';
}

export function isShapeElement(element: CanvasElement): element is ShapeElement {
  return element.type === 'shape';
}

export function isDividerElement(element: CanvasElement): element is DividerElement {
  return element.type === 'divider';
}

export function isImageElement(element: CanvasElement): element is ImageElement {
  return element.type === 'image';
}

export function isIconElement(element: CanvasElement): element is IconElement {
  return element.type === 'icon';
}

export function isFrameElement(element: CanvasElement): element is FrameElement {
  return element.type === 'frame';
}
