import { EditorSettings } from './editor-settings.model';

/**
 * Editor-wide constants. Everything that would otherwise become a magic number
 * in a renderer, store or component lives here.
 */

/** A4 portrait at 96 dpi — the newsletter page size. */
export const PAGE_SIZE = {
  width: 794,
  height: 1123,
} as const;

/** Printable safe area inset from the page edge, in page px. */
export const PAGE_MARGIN = 48;

export const PAGE_BACKGROUND = '#ffffff';

/** Grid spacing in page px. */
export const GRID_SIZE = 20;

export const ZOOM = {
  min: 0.1,
  max: 4,
  /** Multiplier applied per mouse-wheel tick. */
  wheelStep: 1.06,
  /** Multiplier applied per zoom-button press. */
  buttonStep: 1.2,
  /** Padding around the page when fitting it to the viewport, in screen px. */
  fitPadding: 64,
} as const;

/**
 * Distance (in screen px, so it feels constant at any zoom) within which an
 * alignment guide engages.
 */
export const SNAP_THRESHOLD = 6;

/** Keep at least this much of the page inside the viewport when panning. */
export const PAN_OVERSCROLL_LIMIT = 80;

/**
 * Smallest box a resize may leave behind, in page px. Guards against dragging
 * an element down to nothing, from which there would be no handle to drag back.
 */
export const MIN_TRANSFORM_BOX = 6;

/** Maximum number of undoable commands retained. */
export const HISTORY_LIMIT = 100;

/** Arrow-key nudge distances in page px. */
export const NUDGE = {
  small: 1,
  large: 10,
} as const;

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  gridVisible: false,
  snapEnabled: true,
  guidesVisible: true,
  marginsVisible: true,
  autoVaryTheme: true,
};

/** Fonts offered in the text properties panel. `Houschka Rounded Alt` is
 * self-hosted (see `styles/_fonts.scss`); the rest are web-safe. */
export const FONT_FAMILIES = [
  'Houschka Rounded Alt',
  'Calibri',
  'Inter',
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
] as const;

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 96] as const;
