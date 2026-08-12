import { CanvasElement } from './canvas-element.model';
import { DesignTheme } from './design-theme.model';

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
  /**
   * `content` lets document-generation (`NewsletterAssembler`) inject real
   * extracted copy in place of a template's hardcoded placeholder text —
   * only the handful of templates that opted into this (Track P4) read it;
   * every template still produces its normal placeholder output when called
   * with no second argument, so manual insertion from the Assets panel is
   * unaffected. Untyped here since each template defines its own shape
   * (a list of bars, a single stat, a quote, ...) — callers that need to
   * pass content already know which template they matched and cast to that
   * template's own exported content type (e.g. `StatCalloutContent`).
   */
  build(origin: { x: number; y: number }, content?: unknown, theme?: DesignTheme): CanvasElement[];
}
