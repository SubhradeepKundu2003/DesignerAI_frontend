/**
 * Editor chrome preferences. These describe how the workspace is displayed and
 * are intentionally *not* part of the Canvas JSON document — they belong to the
 * user's session, not to the newsletter being designed.
 */
export interface EditorSettings {
  /** Draw the background grid over the page. */
  gridVisible: boolean;
  /** Snap dragged and resized elements to the grid. */
  snapEnabled: boolean;
  /** Show alignment guides against the page, margins and other elements. */
  guidesVisible: boolean;
  /** Show the dashed safe-area / margin outline. */
  marginsVisible: boolean;
  /** Rotate to a random theme preset right before each AI generation, so
   * consecutive newsletters don't all come out in the same colours. Off
   * switches back to "whatever theme the document currently has." */
  autoVaryTheme: boolean;
}

/** The viewport transform applied to the Konva stage. */
export interface Viewport {
  /** 1 = 100%. */
  zoom: number;
  /** Stage translation in screen px. */
  panX: number;
  panY: number;
}
