import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Moves one element to an explicit position in paint order.
 *
 * {@link ReorderElementCommand} covers the toolbar's one-step bring
 * forward/send backward; this is the layers panel's drag-and-drop
 * counterpart, where the drop target names an arbitrary index directly.
 */
export class MoveElementCommand implements Command {
  readonly label = 'Reorder element';

  private readonly fromIndex: number;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly elementId: string,
    private readonly toIndex: number,
  ) {
    this.fromIndex = canvas.indexOf(elementId);
  }

  execute(): void {
    this.canvas.moveElement(this.elementId, this.toIndex);
  }

  undo(): void {
    this.canvas.moveElement(this.elementId, this.fromIndex);
  }
}
