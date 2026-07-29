import { CanvasElement } from './canvas-element.model';

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
}

export interface Page {
  readonly id: string;
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
}

export const CANVAS_DOCUMENT_VERSION = 1 as const;
