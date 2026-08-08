import { FrameElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Dissolves one frame, leaving its children exactly where the layout last
 * put them — the same "nothing to restore on the members" shape as
 * `UngroupElementsCommand`, just without a `parentId` to cut and re-tie.
 */
export class DissolveFrameCommand implements Command {
  readonly label: string;

  private readonly index: number;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly frame: FrameElement,
  ) {
    this.index = canvas.indexOf(frame.id);
    this.label = `Dissolve ${frame.name}`;
  }

  get childIds(): readonly string[] {
    return this.frame.childIds;
  }

  execute(): void {
    this.canvas.removeElement(this.frame.id);
  }

  undo(): void {
    this.canvas.insertElement(this.frame, this.index);
  }
}
