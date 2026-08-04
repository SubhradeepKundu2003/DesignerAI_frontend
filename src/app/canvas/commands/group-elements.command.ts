import { CanvasElement, GroupElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';
import { computeBoundingBox } from '../utils/geometry.util';
import { generateId } from '../utils/id.util';

interface Captured {
  /** The member's own, pre-group snapshot — reinserting this on undo clears `parentId` too. */
  readonly element: CanvasElement;
  readonly index: number;
}

/**
 * Groups a set of top-level elements into one new {@link GroupElement}.
 *
 * The group is built once, in the constructor — like `AddElementCommand`
 * keeps the same element identity across redo, a redo of this command must
 * restore the very same group id. Undo re-inserts each member at its
 * captured original index, ascending, the same ordering `DeleteElementCommand`
 * uses and for the same reason: it is what keeps later insertion targets
 * correct without re-deriving positions from scratch.
 */
export class GroupElementsCommand implements Command {
  readonly label: string;

  private readonly captured: readonly Captured[];
  private readonly group: GroupElement;

  constructor(
    private readonly canvas: CanvasStore,
    elements: readonly CanvasElement[],
  ) {
    this.captured = [...elements]
      .map((element) => ({ element, index: canvas.indexOf(element.id) }))
      .sort((a, b) => a.index - b.index);

    const memberIds = this.captured.map(({ element }) => element.id);
    const box = computeBoundingBox(elements);
    this.group = {
      id: generateId('group'),
      type: 'group',
      name: 'Group',
      ...box,
      locked: false,
      visible: true,
      childIds: memberIds,
    };
    this.label = `Group ${this.captured.length} elements`;
  }

  get groupId(): string {
    return this.group.id;
  }

  execute(): void {
    this.canvas.groupElements(
      this.group,
      this.captured.map(({ element }) => element.id),
    );
  }

  undo(): void {
    for (const { element, index } of this.captured) {
      this.canvas.removeElement(element.id);
      this.canvas.insertElement(element, index);
    }
    this.canvas.removeGroup(this.group.id);
  }
}
