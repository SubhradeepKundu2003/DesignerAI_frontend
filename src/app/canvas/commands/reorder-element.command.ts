import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

export type ReorderDirection = 'forward' | 'backward';

/** Moves one element one step up or down in paint order. */
export class ReorderElementCommand implements Command {
  readonly label: string;

  private readonly fromIndex: number;
  private readonly toIndex: number;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly elementId: string,
    direction: ReorderDirection,
  ) {
    this.fromIndex = canvas.indexOf(elementId);
    this.toIndex = this.fromIndex + (direction === 'forward' ? 1 : -1);
    this.label = direction === 'forward' ? 'Bring forward' : 'Send backward';
  }

  execute(): void {
    this.canvas.moveElement(this.elementId, this.toIndex);
  }

  undo(): void {
    this.canvas.moveElement(this.elementId, this.fromIndex);
  }
}
