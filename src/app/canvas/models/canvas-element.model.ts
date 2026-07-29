/**
 * The element model of the Canvas JSON document.
 *
 * This file is the contract between everything in the editor: the state stores,
 * the Konva renderers, the properties panel and — later — the AI service that
 * generates newsletters. It must stay pure data: no functions, no Konva nodes,
 * no DOM references, so a document round-trips losslessly through
 * `JSON.stringify` / `JSON.parse`.
 */

export type ElementType = 'text' | 'shape' | 'divider' | 'image';

export type ShapeKind = 'rectangle' | 'circle';

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
}

export interface TextElement extends BaseElement {
  readonly type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  /** Text colour, any CSS colour string. */
  fill: string;
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
  stroke: string;
  strokeWidth: number;
  /** Rectangles only; ignored when `shape` is `circle`. */
  cornerRadius: number;
}

export interface DividerElement extends BaseElement {
  readonly type: 'divider';
  stroke: string;
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
 * Discriminated union of everything that can live on a page. Switching on
 * `type` gives exhaustive checking in renderers and the properties panel, so
 * adding a new element type surfaces every place that must handle it.
 */
export type CanvasElement = TextElement | ShapeElement | DividerElement | ImageElement;

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
