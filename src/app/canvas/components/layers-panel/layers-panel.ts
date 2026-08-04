import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { CommandBus } from '../../commands/command-bus.service';
import { MoveElementCommand } from '../../commands/move-element.command';
import { UpdateElementCommand } from '../../commands/update-element.command';
import { UpdateGroupCommand } from '../../commands/update-group.command';
import { CanvasElement, GroupElement } from '../../models/canvas-element.model';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { AppIcon } from '../../../shared/components/app-icon/app-icon';

/** One row of the layers panel: a plain element, or a group's header. */
export type LayerRow =
  | { readonly kind: 'element'; readonly element: CanvasElement; readonly depth: 0 | 1 }
  | { readonly kind: 'group'; readonly group: GroupElement };

/**
 * The layer list: every element on the page, topmost first, with select,
 * rename, show/hide, lock/unlock and drag-to-reorder — plus, for a grouped
 * run of elements, one header row above its (indented, collapsible) members.
 *
 * Grouping never reorders `canvas.elements()` after the fact (see
 * `CanvasStore.groupElements`), so a group's members are always contiguous —
 * that's what lets this build the tree in one linear pass instead of a real
 * recursive structure.
 *
 * Every mutation here — a toggle, a rename, a drop — goes through the same
 * command bus as a canvas drag or a properties-panel edit, so it is undoable
 * and shows up in the same history the toolbar's undo button reads.
 */
@Component({
  selector: 'app-layers-panel',
  imports: [AppIcon],
  templateUrl: './layers-panel.html',
  styleUrl: './layers-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayersPanel {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly commands = inject(CommandBus);

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  private readonly collapsedGroupIds = signal<ReadonlySet<string>>(new Set());

  /** Topmost element first, with a header row inserted above each group's contiguous run. */
  protected readonly rows = computed<readonly LayerRow[]>(() => {
    const collapsed = this.collapsedGroupIds();
    const seenGroups = new Set<string>();
    const result: LayerRow[] = [];

    for (const element of [...this.canvas.elements()].reverse()) {
      const parentId = element.parentId;
      if (!parentId) {
        result.push({ kind: 'element', element, depth: 0 });
        continue;
      }

      if (!seenGroups.has(parentId)) {
        seenGroups.add(parentId);
        const group = this.canvas.groupById(parentId);
        if (group) {
          result.push({ kind: 'group', group });
        }
      }

      if (!collapsed.has(parentId)) {
        result.push({ kind: 'element', element, depth: 1 });
      }
    }

    return result;
  });

  protected readonly renamingId = signal<string | null>(null);
  private readonly draggingId = signal<string | null>(null);
  protected readonly dropTargetId = signal<string | null>(null);

  constructor() {
    // Focuses the row's rename field the moment it appears; the effect is
    // what lets one `viewChild` query serve whichever row is currently being
    // renamed, since only that row's input exists in the DOM at a time.
    effect(() => {
      if (this.renamingId() === null) {
        return;
      }

      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected isSelected(id: string): boolean {
    return this.selection.isSelected(id);
  }

  protected isEntered(groupId: string): boolean {
    return this.selection.enteredGroupId() === groupId;
  }

  protected isCollapsed(groupId: string): boolean {
    return this.collapsedGroupIds().has(groupId);
  }

  protected toggleCollapsed(groupId: string, event: Event): void {
    event.stopPropagation();
    this.collapsedGroupIds.update((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  protected select(id: string): void {
    this.selection.select(id);
  }

  /** Only a top-level, ungrouped element can be dragged to reorder in v1. */
  protected canReorder(row: LayerRow): boolean {
    return row.kind === 'element' && row.depth === 0;
  }

  protected toggleVisible(element: CanvasElement, event: Event): void {
    event.stopPropagation();
    this.commands.dispatch(
      new UpdateElementCommand(
        this.canvas,
        element.id,
        { visible: !element.visible },
        { label: element.visible ? 'Hide element' : 'Show element' },
      ),
    );
  }

  protected toggleLocked(element: CanvasElement, event: Event): void {
    event.stopPropagation();
    this.commands.dispatch(
      new UpdateElementCommand(
        this.canvas,
        element.id,
        { locked: !element.locked },
        { label: element.locked ? 'Unlock element' : 'Lock element' },
      ),
    );
  }

  protected toggleGroupVisible(group: GroupElement, event: Event): void {
    event.stopPropagation();
    this.commands.dispatch(
      new UpdateGroupCommand(
        this.canvas,
        group.id,
        { visible: !group.visible },
        group.visible ? 'Hide group' : 'Show group',
      ),
    );
  }

  protected toggleGroupLocked(group: GroupElement, event: Event): void {
    event.stopPropagation();
    this.commands.dispatch(
      new UpdateGroupCommand(
        this.canvas,
        group.id,
        { locked: !group.locked },
        group.locked ? 'Unlock group' : 'Lock group',
      ),
    );
  }

  protected startRename(id: string, locked: boolean, event: Event): void {
    event.stopPropagation();
    if (locked) {
      return;
    }
    this.renamingId.set(id);
  }

  protected commitRename(id: string, currentName: string, value: string): void {
    // Blur fires whether Enter, Escape or a click elsewhere ended the edit;
    // clearing the flag here rather than in each handler keeps it a single spot.
    this.renamingId.set(null);

    const name = value.trim();
    if (!name || name === currentName) {
      return;
    }

    if (this.canvas.groupById(id)) {
      this.commands.dispatch(new UpdateGroupCommand(this.canvas, id, { name }, 'Rename group'));
      return;
    }
    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, id, { name }, { label: 'Rename element' }),
    );
  }

  protected onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    } else if (event.key === 'Escape') {
      // Reset the field so the blur this triggers commits nothing.
      const input = event.target as HTMLInputElement;
      const id = this.renamingId();
      const name = this.canvas.elementById(id)?.name ?? this.canvas.groupById(id)?.name;
      input.value = name ?? input.value;
      input.blur();
    }
  }

  protected onDragStart(event: DragEvent, row: LayerRow): void {
    if (!this.canReorder(row) || row.kind !== 'element') {
      return;
    }
    this.draggingId.set(row.element.id);
    event.dataTransfer?.setData('text/plain', row.element.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, row: LayerRow): void {
    const dragging = this.draggingId();
    const targetId = row.kind === 'element' ? row.element.id : row.group.id;
    if (dragging === null || dragging === targetId || !this.canReorder(row)) {
      return;
    }
    // A drop only fires on a target that cancelled dragover.
    event.preventDefault();
    this.dropTargetId.set(targetId);
  }

  protected onDrop(event: DragEvent, row: LayerRow): void {
    event.preventDefault();
    const draggedId = this.draggingId();
    this.resetDrag();
    const targetId = row.kind === 'element' ? row.element.id : row.group.id;
    if (!draggedId || draggedId === targetId || !this.canReorder(row)) {
      return;
    }

    const toIndex = this.canvas.indexOf(targetId);
    if (toIndex === -1) {
      return;
    }
    this.commands.dispatch(new MoveElementCommand(this.canvas, draggedId, toIndex));
  }

  protected onDragEnd(): void {
    this.resetDrag();
  }

  private resetDrag(): void {
    this.draggingId.set(null);
    this.dropTargetId.set(null);
  }
}
