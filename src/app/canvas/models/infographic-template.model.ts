import { CanvasElement } from './canvas-element.model';

/**
 * A hand-built, editable infographic layout — the Tier 2 alternative to the
 * flattened PNGs in `infographics.manifest.ts` (see PLAN-PHASE2.md, Track B).
 *
 * `build` returns real `TextElement`/`ShapeElement`/`DividerElement` objects
 * (so copy stays selectable and AI-rewritable) plus, where the geometry is
 * genuinely a vector illustration rather than a UI shape (wheel wedges, arrow
 * ribbons, icon glyphs), a single decorative SVG `ImageElement`. Positions are
 * authored relative to the template's own top-left corner; `build` translates
 * everything by `origin` so the caller can centre it on the page.
 */
export interface InfographicTemplate {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly string[];
  /** Footprint at `origin = {x: 0, y: 0}`, used to centre it on the page. */
  readonly size: { readonly width: number; readonly height: number };
  /** Small flattened preview for the Assets panel tile — not placed on the page. */
  readonly thumbnail: string;
  build(origin: { x: number; y: number }): CanvasElement[];
}
