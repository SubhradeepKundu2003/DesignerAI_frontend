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
import { CanvasElement } from '../../models/canvas-element.model';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { AppIcon } from '../../../shared/components/app-icon/app-icon';

/**
 * The layer list: every element on the page, topmost first, with select,
 * rename, show/hide, lock/unlock and drag-to-reorder.
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

  /** Topmost element first — the same order the layers panel is read in. */
  protected readonly rows = computed<readonly CanvasElement[]>(() =>
    [...this.canvas.elements()].reverse(),
  );

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

  protected select(id: string): void {
    this.selection.select(id);
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

  protected startRename(element: CanvasElement, event: Event): void {
    event.stopPropagation();
    if (element.locked) {
      return;
    }
    this.renamingId.set(element.id);
  }

  protected commitRename(element: CanvasElement, value: string): void {
    // Blur fires whether Enter, Escape or a click elsewhere ended the edit;
    // clearing the flag here rather than in each handler keeps it a single spot.
    this.renamingId.set(null);

    const name = value.trim();
    if (!name || name === element.name) {
      return;
    }

    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, element.id, { name }, { label: 'Rename element' }),
    );
  }

  protected onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    } else if (event.key === 'Escape') {
      // Reset the field so the blur this triggers commits nothing.
      const input = event.target as HTMLInputElement;
      const element = this.canvas.elementById(this.renamingId());
      input.value = element?.name ?? input.value;
      input.blur();
    }
  }

  protected onDragStart(event: DragEvent, id: string): void {
    this.draggingId.set(id);
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, id: string): void {
    const dragging = this.draggingId();
    if (dragging === null || dragging === id) {
      return;
    }
    // A drop only fires on a target that cancelled dragover.
    event.preventDefault();
    this.dropTargetId.set(id);
  }

  protected onDrop(event: DragEvent, id: string): void {
    event.preventDefault();
    const draggedId = this.draggingId();
    this.resetDrag();
    if (!draggedId || draggedId === id) {
      return;
    }

    const toIndex = this.canvas.indexOf(id);
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
