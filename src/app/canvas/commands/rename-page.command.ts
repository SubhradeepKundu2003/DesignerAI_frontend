import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/** Renames a page from the page navigator's inline rename field. */
export class RenamePageCommand implements Command {
  readonly label = 'Rename page';

  private readonly previousName: string | undefined;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly pageId: string,
    private readonly name: string,
  ) {
    this.previousName = canvas.pages().find((page) => page.id === pageId)?.name;
  }

  execute(): void {
    this.canvas.patchPage(this.pageId, { name: this.name });
  }

  undo(): void {
    this.canvas.patchPage(this.pageId, { name: this.previousName });
  }
}
