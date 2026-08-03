import { Page } from '../models/canvas-document.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Inserts an already-built copy of a page right after its source and makes it
 * active. The copy is built by the caller (see `PageFactory.duplicate`), which
 * is what gives every element on it a fresh id — duplicating a page can never
 * collide with the page it came from.
 */
export class DuplicatePageCommand implements Command {
  readonly label: string;

  private readonly index: number;
  private readonly previousActiveId: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly copy: Page,
    sourcePageId: string,
  ) {
    this.index = canvas.pages().findIndex((page) => page.id === sourcePageId) + 1;
    this.previousActiveId = canvas.activePage().id;
    this.label = `Duplicate ${copy.name ?? 'page'}`;
  }

  execute(): void {
    this.canvas.insertPage(this.copy, this.index);
    this.canvas.setActivePage(this.copy.id);
  }

  undo(): void {
    this.canvas.removePage(this.copy.id);
    this.canvas.setActivePage(this.previousActiveId);
  }
}
