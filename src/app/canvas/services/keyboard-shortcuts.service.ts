import { Injectable, inject, signal } from '@angular/core';

import { CommandBus } from '../commands/command-bus.service';
import { NUDGE } from '../models/editor-config';
import { SelectionStore } from '../state/selection.store';
import { arrowDelta, isArrowKey, isTypingTarget } from '../utils/keyboard.util';
import { generateId } from '../utils/id.util';
import { ElementActions } from './element-actions.service';

/**
 * The editor's global keyboard shortcuts: undo/redo, delete, duplicate,
 * nudge, deselect and the space-to-pan modifier.
 *
 * A single root service rather than a directive on the shell, because
 * `spaceHeld` also has to reach the canvas workspace — it decides whether a
 * left-button drag there pans the view or moves an element.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardShortcuts {
  private readonly commands = inject(CommandBus);
  private readonly selection = inject(SelectionStore);
  private readonly actions = inject(ElementActions);

  private readonly space = signal(false);
  /** Whether the space bar is currently held — the canvas's pan modifier. */
  readonly spaceHeld = this.space.asReadonly();

  /** Shared across one arrow-key hold, so key-repeat nudges merge into one undo step. */
  private nudgeMergeKey: string | null = null;

  handleKeydown(event: KeyboardEvent): void {
    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.space.set(true);
      return;
    }

    const withModifier = event.ctrlKey || event.metaKey;

    if (withModifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.commands.redo();
      } else {
        this.commands.undo();
      }
      return;
    }

    if (withModifier && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.commands.redo();
      return;
    }

    if (withModifier && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.actions.duplicateSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.actions.deleteSelection();
      return;
    }

    if (event.key === 'Escape') {
      this.selection.clear();
      return;
    }

    const delta = arrowDelta(event.key, event.shiftKey ? NUDGE.large : NUDGE.small);
    if (delta) {
      event.preventDefault();
      if (!event.repeat || this.nudgeMergeKey === null) {
        this.nudgeMergeKey = generateId('nudge');
      }
      this.actions.nudgeSelection(delta.dx, delta.dy, this.nudgeMergeKey);
    }
  }

  handleKeyup(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.space.set(false);
    }

    if (isArrowKey(event.key)) {
      this.nudgeMergeKey = null;
    }
  }
}
