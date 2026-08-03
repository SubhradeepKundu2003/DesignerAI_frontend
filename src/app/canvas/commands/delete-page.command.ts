import { Page } from '../models/canvas-document.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Removes one page from the document.
 *
 * The store itself refuses to go below one page (see `CanvasStore.removePage`);
 * the navigator additionally disables the delete action when only one page is
 * left, so this command is never asked to do the impossible.
 */
export class DeletePageCommand implements Command {
  readonly label: string;

  private readonly page: Page;
  private readonly index: number;
  private readonly previousActiveId: string;

  constructor(
    private readonly canvas: CanvasStore,
    pageId: string,
  ) {
    this.page = canvas.pages().find((page) => page.id === pageId) ?? canvas.activePage();
    this.index = canvas.pages().findIndex((page) => page.id === this.page.id);
    this.previousActiveId = canvas.activePage().id;
    this.label = `Delete ${this.page.name ?? 'page'}`;
  }

  execute(): void {
    this.canvas.removePage(this.page.id);
  }

  undo(): void {
    this.canvas.insertPage(this.page, this.index);
    this.canvas.setActivePage(this.previousActiveId);
  }
}
