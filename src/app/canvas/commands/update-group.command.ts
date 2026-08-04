import { Command } from '../models/commands.model';
import { GroupPatch, CanvasStore } from '../state/canvas.store';

/**
 * Changes a group's own `name`/`visible`/`locked` — the layers panel and the
 * group properties panel's counterpart to `UpdateElementCommand`. A group's
 * box is derived from its children (see `CanvasStore.patchElement`), so it is
 * never patched here.
 */
export class UpdateGroupCommand implements Command {
  readonly label: string;

  private readonly previous: GroupPatch;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly groupId: string,
    private readonly patch: GroupPatch,
    label?: string,
  ) {
    const group = this.canvas.groupById(groupId);
    this.previous = {};
    for (const key of Object.keys(patch) as (keyof GroupPatch)[]) {
      (this.previous as Record<string, unknown>)[key] = group?.[key];
    }
    this.label = label ?? 'Update group';
  }

  execute(): void {
    this.canvas.patchGroup(this.groupId, this.patch);
  }

  undo(): void {
    this.canvas.patchGroup(this.groupId, this.previous);
  }
}
