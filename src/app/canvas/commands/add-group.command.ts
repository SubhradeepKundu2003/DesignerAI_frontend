import { GroupElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Puts an already-built group record on the page, without touching its
 * members — used when duplicating a group, whose members are placed by their
 * own `DuplicateElementCommand` in the same {@link CompositeCommand}.
 */
export class AddGroupCommand implements Command {
  readonly label: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly group: GroupElement,
  ) {
    this.label = `Add ${group.name}`;
  }

  get groupId(): string {
    return this.group.id;
  }

  execute(): void {
    this.canvas.insertGroup(this.group);
  }

  undo(): void {
    this.canvas.removeGroup(this.group.id);
  }
}
