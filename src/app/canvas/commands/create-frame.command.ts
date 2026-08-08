import { CanvasElement, FrameElement, FrameLayout } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';
import { computeBoundingBox } from '../utils/geometry.util';
import { generateId } from '../utils/id.util';

/**
 * Wraps a set of top-level elements in a new, auto-arranging `FrameElement`.
 *
 * Unlike `GroupElementsCommand`, membership lives only in the frame's own
 * `childIds` (see the model doc) — nothing on a member itself changes, so
 * there is no `parentId` to tie or cut. What *does* change is each member's
 * position, once `CanvasStore.layoutFrame` runs; those are captured up front
 * so undo can put them back exactly, the same rigor `UpdateElementCommand`
 * already applies to a single property.
 */
export class CreateFrameCommand implements Command {
  readonly label: string;

  private readonly frame: FrameElement;
  private readonly insertIndex: number;
  private readonly previousPositions: ReadonlyMap<string, { x: number; y: number }>;

  constructor(
    private readonly canvas: CanvasStore,
    elements: readonly CanvasElement[],
    layout: FrameLayout,
  ) {
    const ids = elements.map((element) => element.id);
    this.insertIndex = Math.min(...ids.map((id) => canvas.indexOf(id)));
    this.previousPositions = new Map(elements.map((element) => [element.id, { x: element.x, y: element.y }]));

    const { spacing } = canvas.theme();
    this.frame = {
      id: generateId('frame'),
      type: 'frame',
      name: 'Frame',
      ...computeBoundingBox(elements),
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      layout,
      gap: spacing,
      padding: spacing,
      childIds: ids,
    };
    this.label = `Frame ${ids.length} elements`;
  }

  get frameId(): string {
    return this.frame.id;
  }

  execute(): void {
    this.canvas.insertElement(this.frame, this.insertIndex);
    this.canvas.layoutFrame(this.frame.id);
  }

  undo(): void {
    this.canvas.removeElement(this.frame.id);
    for (const [id, position] of this.previousPositions) {
      this.canvas.patchElement(id, position);
    }
  }
}
