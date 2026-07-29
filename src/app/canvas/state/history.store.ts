import { Injectable, computed, signal } from '@angular/core';

import { Command } from '../models/commands.model';
import { HISTORY_LIMIT } from '../models/editor-config';

/**
 * The undo and redo stacks.
 *
 * Holds commands, not document snapshots: a snapshot history would copy the
 * whole newsletter on every keystroke, and it would lose the *intent* of each
 * change. The store only moves commands between the two stacks — running them
 * is {@link CommandBus}'s job, which keeps this piece trivially testable.
 */
@Injectable({ providedIn: 'root' })
export class HistoryStore {
  private readonly undoStack = signal<readonly Command[]>([]);
  private readonly redoStack = signal<readonly Command[]>([]);

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  /** Label of the command undo would reverse, for the toolbar tooltip. */
  readonly undoLabel = computed(() => top(this.undoStack())?.label ?? null);
  readonly redoLabel = computed(() => top(this.redoStack())?.label ?? null);

  /** Number of undoable steps — mostly useful to assert against in tests. */
  readonly depth = computed(() => this.undoStack().length);

  /**
   * Records a command that has just been executed, and invalidates the redo
   * branch the way every editor does — once you change course, the future you
   * abandoned is gone.
   *
   * Returns `false` when the previous command absorbed this one (see
   * {@link Command.mergeWith}), so a drag or a slider scrub stays one step.
   */
  record(command: Command): boolean {
    this.redoStack.set([]);

    const stack = this.undoStack();
    if (top(stack)?.mergeWith?.(command)) {
      return false;
    }

    // Oldest entries fall off the bottom; the cap bounds memory on long sessions.
    this.undoStack.set([...stack, command].slice(-HISTORY_LIMIT));
    return true;
  }

  /**
   * Moves the newest command onto the redo stack and returns it, for the caller
   * to reverse. Returns `undefined` when there is nothing to undo.
   */
  takeUndo(): Command | undefined {
    const stack = this.undoStack();
    const command = top(stack);
    if (!command) {
      return undefined;
    }

    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.set([...this.redoStack(), command]);
    return command;
  }

  /** The mirror of {@link takeUndo}: returns the command to re-execute. */
  takeRedo(): Command | undefined {
    const stack = this.redoStack();
    const command = top(stack);
    if (!command) {
      return undefined;
    }

    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.set([...this.undoStack(), command]);
    return command;
  }

  /** Drops both stacks — after loading a document, whose history is not ours. */
  clear(): void {
    this.undoStack.set([]);
    this.redoStack.set([]);
  }
}

function top(stack: readonly Command[]): Command | undefined {
  return stack[stack.length - 1];
}
