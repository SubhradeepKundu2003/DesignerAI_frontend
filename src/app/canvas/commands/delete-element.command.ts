import { CanvasElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

interface Removed {
  readonly element: CanvasElement;
  readonly index: number;
}

/**
 * Removes one or more elements from the page.
 *
 * Accepts a list so a multi-selection Delete is one undo step, not one per
 * element. Undo re-inserts each element at the index it was captured at, in
 * ascending order — inserting lowest-index-first is what keeps every later
 * insertion target correct without re-deriving positions from scratch.
 */
export class DeleteElementCommand implements Command {
  readonly label: string;

  private readonly removed: readonly Removed[];

  constructor(
    private readonly canvas: CanvasStore,
    elements: readonly CanvasElement[],
  ) {
    this.removed = [...elements]
      .map((element) => ({ element, index: canvas.indexOf(element.id) }))
      .sort((a, b) => a.index - b.index);
    this.label =
      this.removed.length === 1
        ? `Delete ${this.removed[0].element.name}`
        : `Delete ${this.removed.length} elements`;
  }

  execute(): void {
    for (const { element } of this.removed) {
      this.canvas.removeElement(element.id);
    }
  }

  undo(): void {
    for (const { element, index } of this.removed) {
      this.canvas.insertElement(element, index);
    }
  }
}
