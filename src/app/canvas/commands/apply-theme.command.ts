import {
  CanvasElement,
  ElementPatch,
  isDividerElement,
  isFrameElement,
  isIconElement,
  isShapeElement,
  isTextElement,
} from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { DesignTheme, resolveThemeColor } from '../models/design-theme.model';
import { CanvasStore } from '../state/canvas.store';

interface Recolor {
  readonly id: string;
  readonly next: ElementPatch;
  readonly previous: ElementPatch;
}

/**
 * Switches the project's active theme and recomputes every themed element's
 * literal colour to match it, across every page — one undo step.
 *
 * Elements without a `fillRef`/`strokeRef` are untouched: the theme only ever
 * overwrites a value it is responsible for, never a colour the user picked by
 * hand. Recolouring the whole project (not just the active page) is what keeps
 * `CanvasDocument.theme` meaning "the project's theme" rather than "the theme
 * the last page happened to see."
 */
export class ApplyThemeCommand implements Command {
  readonly label: string;

  private readonly previousTheme: DesignTheme | undefined;
  private readonly recolors: readonly Recolor[];

  constructor(
    private readonly canvas: CanvasStore,
    private readonly theme: DesignTheme,
  ) {
    this.previousTheme = canvas.document().theme;
    this.label = `Apply theme: ${theme.name}`;
    this.recolors = canvas
      .pages()
      .flatMap((page) => page.elements)
      .map((element) => buildRecolor(element, theme))
      .filter((recolor): recolor is Recolor => recolor !== null);
  }

  execute(): void {
    this.canvas.setTheme(this.theme);
    for (const { id, next } of this.recolors) {
      this.canvas.patchElement(id, next);
    }
  }

  undo(): void {
    for (const { id, previous } of this.recolors) {
      this.canvas.patchElement(id, previous);
    }
    this.canvas.setTheme(this.previousTheme);
  }
}

/** The patch a themed element needs to match `theme`, or `null` if it has no `*Ref` set. */
function buildRecolor(element: CanvasElement, theme: DesignTheme): Recolor | null {
  const next: Record<string, string> = {};
  const previous: Record<string, string> = {};

  if ((isTextElement(element) || isShapeElement(element) || isIconElement(element)) && element.fillRef) {
    const resolved = resolveThemeColor(theme, element.fillRef);
    if (resolved) {
      next['fill'] = resolved;
      previous['fill'] = element.fill;
    }
  }
  if ((isShapeElement(element) || isDividerElement(element)) && element.strokeRef) {
    const resolved = resolveThemeColor(theme, element.strokeRef);
    if (resolved) {
      next['stroke'] = resolved;
      previous['stroke'] = element.stroke;
    }
  }
  if (isFrameElement(element) && element.fillRef) {
    const resolved = resolveThemeColor(theme, element.fillRef);
    if (resolved) {
      next['background'] = resolved;
      previous['background'] = element.background ?? '';
    }
  }

  return Object.keys(next).length > 0
    ? { id: element.id, next: next as ElementPatch, previous: previous as ElementPatch }
    : null;
}
