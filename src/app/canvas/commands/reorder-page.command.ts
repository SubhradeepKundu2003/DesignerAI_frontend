import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/** Moves one page to an explicit position — the page navigator's drag-and-drop. */
export class ReorderPageCommand implements Command {
  readonly label = 'Reorder page';

  private readonly fromIndex: number;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly pageId: string,
    private readonly toIndex: number,
  ) {
    this.fromIndex = canvas.pages().findIndex((page) => page.id === pageId);
  }

  execute(): void {
    this.canvas.movePage(this.pageId, this.toIndex);
  }

  undo(): void {
    this.canvas.movePage(this.pageId, this.fromIndex);
  }
}
