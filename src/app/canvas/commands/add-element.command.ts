import { CanvasElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Puts an element on the page.
 *
 * The element is built once, by the caller, and kept by the command — so redo
 * restores the very same element, ids included, rather than a look-alike that
 * would strand the selection and the layers panel.
 */
export class AddElementCommand implements Command {
  readonly label: string;

  /**
   * @param index Position in paint order; the top of the stack when omitted.
   *   Recorded so undo/redo cannot quietly reshuffle the layers.
   */
  constructor(
    private readonly canvas: CanvasStore,
    private readonly element: CanvasElement,
    private readonly index?: number,
  ) {
    this.label = `Add ${element.name}`;
  }

  get elementId(): string {
    return this.element.id;
  }

  execute(): void {
    this.canvas.insertElement(this.element, this.index);
  }

  undo(): void {
    this.canvas.removeElement(this.element.id);
  }
}
