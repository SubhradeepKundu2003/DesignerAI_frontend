import { GroupElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/**
 * Dissolves one group, leaving its members exactly where they are.
 *
 * Unlike `GroupElementsCommand`, nothing needs repositioning here: members
 * never moved when they were grouped into their contiguous run, and ungroup
 * just cuts the `parentId` tie — undo re-ties it and restores the group record.
 */
export class UngroupElementsCommand implements Command {
  readonly label: string;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly group: GroupElement,
  ) {
    this.label = `Ungroup ${group.name}`;
  }

  get childIds(): readonly string[] {
    return this.group.childIds;
  }

  execute(): void {
    for (const id of this.group.childIds) {
      this.canvas.patchElement(id, { parentId: undefined });
    }
    this.canvas.removeGroup(this.group.id);
  }

  undo(): void {
    this.canvas.insertGroup(this.group);
    for (const id of this.group.childIds) {
      this.canvas.patchElement(id, { parentId: this.group.id });
    }
  }
}
