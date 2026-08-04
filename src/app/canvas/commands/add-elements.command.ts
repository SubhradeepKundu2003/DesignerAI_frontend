import { CanvasElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Puts a whole bundle of elements on the page as one undo step — placing a
 * multi-element infographic template must be a single Ctrl+Z, not one per part.
 */
export class AddElementsCommand implements Command {
  readonly label: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly elements: readonly CanvasElement[],
  ) {
    this.label = `Add ${elements.length > 1 ? elements.length + ' elements' : elements[0]?.name}`;
  }

  get elementIds(): string[] {
    return this.elements.map((element) => element.id);
  }

  execute(): void {
    for (const element of this.elements) {
      this.canvas.insertElement(element);
    }
  }

  undo(): void {
    for (const element of this.elements) {
      this.canvas.removeElement(element.id);
    }
  }
}
