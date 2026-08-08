import { CanvasElement, GroupElement } from './canvas-element.model';
import { DesignTheme } from './design-theme.model';

/**
 * The Canvas JSON document — the single source of truth for the editor.
 *
 * Konva never owns state; it renders whatever this document describes. The same
 * shape is what the AI service will emit later, which is why it carries a
 * `version` for forward-compatible migrations.
 */
export interface CanvasDocument {
  readonly version: 1;
  pages: Page[];
  /**
   * The project's active theme. Optional so a document saved before theming
   * existed still loads — read as `document.theme ?? DEFAULT_THEME`, the same
   * `?? []` pattern `Page.groups` already uses.
   */
  theme?: DesignTheme;
}

export interface Page {
  readonly id: string;
  /** Shown in the page navigator; falls back to a positional label when unset. */
  name?: string;
  /** Page size in px at 96 dpi (A4 portrait by default). */
  width: number;
  height: number;
  background: string;
  /**
   * Elements in paint order: index 0 is the bottom of the stack, the last entry
   * is on top. The array index *is* the z-order — there is deliberately no
   * separate `layer` field to keep out of sync with it.
   */
  elements: CanvasElement[];
  /**
   * Groups on this page. Grouping does not nest or reorder elements in Konva —
   * it only tags members with a `parentId` and keeps them contiguous within
   * `elements`, so a document saved before groups existed loads fine with this
   * read as `page.groups ?? []` rather than requiring a migration.
   */
  groups: GroupElement[];
}

export const CANVAS_DOCUMENT_VERSION = 1 as const;
