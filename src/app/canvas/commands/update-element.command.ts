import { ElementPatch } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

export interface UpdateElementOptions {
  /** Overrides the label derived from the patched property names. */
  label?: string;
  /**
   * Marks this update as part of one continuous interaction, so consecutive
   * updates sharing the key collapse into a single undo step.
   *
   * The key must identify the *interaction*, not the property: a control mints
   * a fresh key when the gesture starts (pointer down, focus) so that two
   * separate visits to the same slider stay two undo steps.
   */
  mergeKey?: string;
}

/**
 * Changes properties of one element.
 *
 * Deliberately generic: move, resize, rotate, recolour and every properties
 * panel edit are the same operation with a different patch. One command means
 * one place where undo is implemented, and one shape for the AI service to emit
 * when it refines an existing design.
 */
export class UpdateElementCommand implements Command {
  readonly label: string;

  private patch: ElementPatch;
  /** The values being overwritten, captured before the patch is applied. */
  private previous: ElementPatch;
  private readonly mergeKey: string | null;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly elementId: string,
    patch: ElementPatch,
    options: UpdateElementOptions = {},
  ) {
    this.patch = { ...patch };
    this.previous = capture(this.canvas.elementById(elementId), patch);
    this.mergeKey = options.mergeKey ?? null;
    this.label = options.label ?? describe(patch);
  }

  get id(): string {
    return this.elementId;
  }

  execute(): void {
    this.canvas.patchElement(this.elementId, this.patch);
  }

  undo(): void {
    this.canvas.patchElement(this.elementId, this.previous);
  }

  mergeWith(next: Command): boolean {
    if (
      !(next instanceof UpdateElementCommand) ||
      next.elementId !== this.elementId ||
      this.mergeKey === null ||
      next.mergeKey !== this.mergeKey
    ) {
      return false;
    }

    // `next` has already been applied to the store; folding its patch in here
    // is only about making redo replay the whole gesture in one go.
    this.patch = { ...this.patch, ...next.patch };
    // Undo must reach back to the state before the *first* update, so the older
    // capture wins wherever the two overlap.
    this.previous = { ...next.previous, ...this.previous };
    return true;
  }
}

/** Reads the current values of the properties `patch` is about to overwrite. */
function capture(element: object | undefined, patch: ElementPatch): ElementPatch {
  const previous: Record<string, unknown> = {};
  if (!element) {
    return previous as ElementPatch;
  }

  for (const key of Object.keys(patch)) {
    previous[key] = (element as Record<string, unknown>)[key];
  }
  return previous as ElementPatch;
}

function describe(patch: ElementPatch): string {
  const keys = Object.keys(patch);
  return keys.length === 0 ? 'Update element' : `Change ${keys.join(', ')}`;
}
