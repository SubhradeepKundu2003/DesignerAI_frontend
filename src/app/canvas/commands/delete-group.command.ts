import { GroupElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Removes one group *record* from the page — not its members. Deleting a
 * selected group pairs this with a `DeleteElementCommand` for its children
 * in a {@link CompositeCommand}, so both are captured before the caller
 * starts mutating anything.
 */
export class DeleteGroupCommand implements Command {
  readonly label: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly group: GroupElement,
  ) {
    this.label = `Delete ${group.name}`;
  }

  execute(): void {
    this.canvas.removeGroup(this.group.id);
  }

  undo(): void {
    this.canvas.insertGroup(this.group);
  }
}
