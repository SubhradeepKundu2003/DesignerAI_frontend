import { CanvasElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

export interface Duplicate {
  readonly element: CanvasElement;
  readonly index: number;
}

/**
 * Puts one or more already-built copies onto the page.
 *
 * The copies are built by the caller (see `ElementFactory.duplicate`) — this
 * command only owns placing them, so it can put a whole multi-selection back
 * exactly where it left it on undo/redo.
 */
export class DuplicateElementCommand implements Command {
  readonly label: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly duplicates: readonly Duplicate[],
  ) {
    this.label =
      duplicates.length === 1
        ? `Duplicate ${duplicates[0].element.name}`
        : `Duplicate ${duplicates.length} elements`;
  }

  get elementIds(): string[] {
    return this.duplicates.map(({ element }) => element.id);
  }

  execute(): void {
    for (const { element, index } of this.duplicates) {
      this.canvas.insertElement(element, index);
    }
  }

  undo(): void {
    for (const { element } of this.duplicates) {
      this.canvas.removeElement(element.id);
    }
  }
}
