import { TCS_CORPORATE } from '../data/design-themes';
import { CanvasElement, ElementPatch } from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { Command } from '../models/commands.model';
import { DesignTheme } from '../models/design-theme.model';
import { BrandAssets } from '../state/brand-assets.store';
import { CanvasStore } from '../state/canvas.store';
import {
  buildBackgroundPatternElement,
  buildLogoElements,
  pickBrandedBackground,
  recolorForBrandedBackground,
} from '../utils/branding.util';

interface Recolor {
  readonly id: string;
  readonly next: ElementPatch;
  readonly previous: ElementPatch;
}

/** The `{ id, fill/stroke/background }` diff between `element` and its
 * branded-background-recoloured counterpart, or `null` if recolouring left it
 * unchanged (no `ink`/`muted` ref, or an accent). */
function buildRecolor(element: CanvasElement, recoloured: CanvasElement): Recolor | null {
  const next: Record<string, string> = {};
  const previous: Record<string, string> = {};

  if ('fill' in element && 'fill' in recoloured && element.fill !== recoloured.fill) {
    next['fill'] = recoloured.fill;
    previous['fill'] = element.fill;
  }
  if ('stroke' in element && 'stroke' in recoloured && element.stroke !== recoloured.stroke) {
    next['stroke'] = recoloured.stroke;
    previous['stroke'] = element.stroke;
  }
  if ('background' in element && 'background' in recoloured && element.background !== recoloured.background) {
    next['background'] = recoloured.background ?? '';
    previous['background'] = element.background ?? '';
  }

  return Object.keys(next).length > 0
    ? { id: element.id, next: next as ElementPatch, previous: previous as ElementPatch }
    : null;
}

interface PageOn {
  readonly pageId: string;
  readonly previousBackground: string;
  readonly nextBackground: string;
  /** The background-pattern image (goes to index 0 — bottom of stack). */
  readonly pattern: CanvasElement;
  /** The two logos (appended — top of stack). */
  readonly logos: readonly CanvasElement[];
  /** `ink`/`muted` recolours for the page's pre-existing elements, so they
   * read against `nextBackground` instead of the white-`surface` tones
   * `TCS_CORPORATE` was built for — see `recolorForBrandedBackground`. */
  readonly recolors: readonly Recolor[];
}

interface RemovedElement {
  readonly element: CanvasElement;
  /** Position in `page.elements` at the moment of removal, so undo can
   * reinsert it exactly where it was rather than just appending it back. */
  readonly index: number;
}

interface PageOff {
  readonly pageId: string;
  readonly removed: readonly RemovedElement[];
}

/**
 * Toggles TCS/TATA branded mode for the whole document — one undo step,
 * mirroring `ApplyThemeCommand`'s "recompute everything up front, apply/
 * reverse in execute/undo" shape.
 *
 * Turning **on**: force-applies the `TCS_CORPORATE` theme (branded pages
 * shouldn't cycle through the free-form palette — see the plan's "Design
 * decisions"), then for every page that isn't already branded, forces a
 * black-or-white background and adds the logo + background-pattern elements
 * `utils/branding.util.ts` builds. A page that already carries `brandRole`
 * elements (shouldn't normally happen while `branded` is false, but cheap to
 * guard) is left untouched, so re-toggling is idempotent.
 *
 * Turning **off**: removes every `brandRole`-tagged element it finds, page by
 * page. Deliberately leaves `page.background` alone — once branded mode
 * added a black/white background it's just the page's background now, the
 * same way a manually-picked colour would be; there is no "previous colour"
 * recorded for pages that were branded at generation time (never went
 * through this command's "on" branch) to revert to.
 */
export class SetBrandedModeCommand implements Command {
  readonly label: string;

  private readonly previousBranded: boolean;
  private readonly previousTheme: DesignTheme | undefined;
  private readonly onPages: readonly PageOn[];
  private readonly offPages: readonly PageOff[];

  constructor(
    private readonly canvas: CanvasStore,
    private readonly branded: boolean,
    brandAssets: BrandAssets,
  ) {
    this.label = branded ? 'Turn on TCS/TATA branded mode' : 'Turn off TCS/TATA branded mode';
    this.previousBranded = canvas.branded();
    this.previousTheme = canvas.document().theme;

    if (branded) {
      this.onPages = canvas
        .pages()
        .filter((page) => !hasBrandElements(page))
        .map((page): PageOn => {
          const nextBackground = pickBrandedBackground();
          const recoloured = recolorForBrandedBackground(page.elements, nextBackground);
          const recolors = page.elements
            .map((element, index) => buildRecolor(element, recoloured[index]))
            .filter((recolor): recolor is Recolor => recolor !== null);
          return {
            pageId: page.id,
            previousBackground: page.background,
            nextBackground,
            pattern: buildBackgroundPatternElement(page, nextBackground),
            logos: buildLogoElements(page, nextBackground, brandAssets),
            recolors,
          };
        });
      this.offPages = [];
    } else {
      this.onPages = [];
      this.offPages = canvas.pages().map((page): PageOff => ({
        pageId: page.id,
        removed: page.elements
          .map((element, index): RemovedElement => ({ element, index }))
          .filter(({ element }) => element.brandRole !== undefined),
      }));
    }
  }

  execute(): void {
    this.canvas.setBranded(this.branded);
    if (this.branded) {
      this.canvas.setTheme(TCS_CORPORATE);
      for (const page of this.onPages) {
        this.canvas.patchPage(page.pageId, { background: page.nextBackground });
        for (const { id, next } of page.recolors) {
          this.canvas.patchElement(id, next);
        }
        this.canvas.insertElementOnPage(page.pageId, page.pattern, 0);
        for (const logo of page.logos) {
          this.canvas.insertElementOnPage(page.pageId, logo);
        }
      }
    } else {
      for (const page of this.offPages) {
        for (const { element } of page.removed) {
          this.canvas.removeElement(element.id);
        }
      }
    }
  }

  undo(): void {
    if (this.branded) {
      for (const page of this.onPages) {
        this.canvas.removeElement(page.pattern.id);
        for (const logo of page.logos) {
          this.canvas.removeElement(logo.id);
        }
        for (const { id, previous } of page.recolors) {
          this.canvas.patchElement(id, previous);
        }
        this.canvas.patchPage(page.pageId, { background: page.previousBackground });
      }
      this.canvas.setTheme(this.previousTheme);
    } else {
      for (const page of this.offPages) {
        for (const { element, index } of [...page.removed].sort((a, b) => a.index - b.index)) {
          this.canvas.insertElementOnPage(page.pageId, element, index);
        }
      }
    }
    this.canvas.setBranded(this.previousBranded);
  }
}

function hasBrandElements(page: Page): boolean {
  return page.elements.some((element) => element.brandRole !== undefined);
}
