import { CanvasDocument } from '../models/canvas-document.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Replaces the whole document — the Load button's command today, and later
 * the one the AI service will dispatch when it generates a design. Undoable
 * like every other mutation, so loading a save can't silently strand whatever
 * was on the page before it.
 */
export class LoadCanvasCommand implements Command {
  readonly label = 'Load design';

  private readonly previous: CanvasDocument;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly document: CanvasDocument,
  ) {
    this.previous = this.canvas.document();
  }

  execute(): void {
    this.canvas.replaceDocument(this.document);
  }

  undo(): void {
    this.canvas.replaceDocument(this.previous);
  }
}
