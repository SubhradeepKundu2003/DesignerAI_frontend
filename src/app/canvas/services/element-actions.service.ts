import { Injectable, computed, inject } from '@angular/core';

import { CommandBus } from '../commands/command-bus.service';
import { DeleteElementCommand } from '../commands/delete-element.command';
import { Duplicate, DuplicateElementCommand } from '../commands/duplicate-element.command';
import { ReorderElementCommand } from '../commands/reorder-element.command';
import { UpdateElementCommand } from '../commands/update-element.command';
import { ElementFactory } from './element-factory.service';
import { CanvasStore } from '../state/canvas.store';
import { SelectionStore } from '../state/selection.store';

/**
 * Selection-driven mutations shared by the toolbar and the keyboard shortcuts.
 *
 * Both callers need the exact same "what can currently be done to the
 * selection" logic — this is the one place that owns it, so the toolbar's
 * disabled states and the keyboard's no-ops can never drift apart.
 */
@Injectable({ providedIn: 'root' })
export class ElementActions {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly factory = inject(ElementFactory);
  private readonly commands = inject(CommandBus);

  readonly canDelete = this.selection.hasSelection;
  readonly canDuplicate = this.selection.hasSelection;

  readonly canBringForward = computed(() => {
    const element = this.selection.primary();
    return element !== null && this.canvas.indexOf(element.id) < this.canvas.elementCount() - 1;
  });

  readonly canSendBackward = computed(() => {
    const element = this.selection.primary();
    return element !== null && this.canvas.indexOf(element.id) > 0;
  });

  /** Deletes the whole selection as one undo step. */
  deleteSelection(): void {
    const elements = this.selection.selectedElements();
    if (elements.length === 0) {
      return;
    }

    this.commands.dispatch(new DeleteElementCommand(this.canvas, elements));
    this.selection.clear();
  }

  /** Duplicates the whole selection and selects the copies. */
  duplicateSelection(): void {
    const elements = this.selection.selectedElements();
    if (elements.length === 0) {
      return;
    }

    // Each copy is inserted directly above its original; `i` accounts for the
    // copies already inserted ahead of later originals in this same batch.
    const duplicates: Duplicate[] = elements.map((element, i) => ({
      element: this.factory.duplicate(element),
      index: this.canvas.indexOf(element.id) + 1 + i,
    }));

    this.commands.dispatch(new DuplicateElementCommand(this.canvas, duplicates));
    this.selection.selectMany(duplicates.map(({ element }) => element.id));
  }

  bringForward(): void {
    const element = this.selection.primary();
    if (!element || !this.canBringForward()) {
      return;
    }

    this.commands.dispatch(new ReorderElementCommand(this.canvas, element.id, 'forward'));
  }

  sendBackward(): void {
    const element = this.selection.primary();
    if (!element || !this.canSendBackward()) {
      return;
    }

    this.commands.dispatch(new ReorderElementCommand(this.canvas, element.id, 'backward'));
  }

  /**
   * Nudges every selected, unlocked element by the same amount.
   *
   * `mergeKey`, when given, is shared across the whole key-repeat so holding
   * an arrow down collapses into a single undo step per element.
   */
  nudgeSelection(dx: number, dy: number, mergeKey?: string): void {
    for (const element of this.selection.selectedElements()) {
      if (element.locked) {
        continue;
      }

      this.commands.dispatch(
        new UpdateElementCommand(
          this.canvas,
          element.id,
          { x: element.x + dx, y: element.y + dy },
          { label: 'Nudge element', mergeKey: mergeKey ? `${mergeKey}:${element.id}` : undefined },
        ),
      );
    }
  }
}
