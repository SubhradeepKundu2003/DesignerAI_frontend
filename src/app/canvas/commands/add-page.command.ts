import { Page } from '../models/canvas-document.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Puts a new page in the document and makes it the active one.
 *
 * The page is built once, by the caller (see `PageFactory`), and kept by the
 * command — so redo restores the very same page, id included.
 */
export class AddPageCommand implements Command {
  readonly label: string;

  private readonly previousActiveId: string;

  /**
   * @param index Position in the document; the end when omitted. Recorded so
   *   undo/redo cannot quietly reshuffle the page order.
   */
  constructor(
    private readonly canvas: CanvasStore,
    private readonly page: Page,
    private readonly index?: number,
  ) {
    this.label = `Add ${page.name ?? 'page'}`;
    this.previousActiveId = canvas.activePage().id;
  }

  get pageId(): string {
    return this.page.id;
  }

  execute(): void {
    this.canvas.insertPage(this.page, this.index);
    this.canvas.setActivePage(this.page.id);
  }

  undo(): void {
    this.canvas.removePage(this.page.id);
    this.canvas.setActivePage(this.previousActiveId);
  }
}
