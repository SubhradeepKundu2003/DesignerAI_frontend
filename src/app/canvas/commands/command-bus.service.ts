import { Injectable, inject } from '@angular/core';

import { Command } from '../models/commands.model';
import { HistoryStore } from '../state/history.store';

/**
 * The single entry point for changing the document.
 *
 * Components never call the stores' mutators directly; they build a command and
 * dispatch it here. That one rule is what guarantees history is complete, and
 * it is the same door the AI service will use once it can generate designs.
 */
@Injectable({ providedIn: 'root' })
export class CommandBus {
  private readonly history = inject(HistoryStore);

  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;
  readonly undoLabel = this.history.undoLabel;
  readonly redoLabel = this.history.redoLabel;

  dispatch(command: Command): void {
    command.execute();
    this.history.record(command);
  }

  undo(): void {
    this.history.takeUndo()?.undo();
  }

  redo(): void {
    this.history.takeRedo()?.execute();
  }
}
