import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

import { LocalStorageService } from '../../core/services/local-storage.service';
import { CommandBus } from '../commands/command-bus.service';
import { LoadCanvasCommand } from '../commands/load-canvas.command';
import { CanvasDocument, isCanvasDocument } from '../models/canvas-document.model';
import { CanvasStore } from '../state/canvas.store';

const STORAGE_KEY = 'designerai:canvas:v1';
const AUTOSAVE_DELAY_MS = 2000;
const SAVED_FLASH_MS = 1600;

/**
 * Save/load against a single localStorage slot.
 *
 * Autosave and the explicit Save button share the same write path; the only
 * difference is that Save also flashes {@link justSaved} so the user gets the
 * certainty autosave deliberately doesn't ask for (autosave writes silently).
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly storage = inject(LocalStorageService);
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  /** True for a moment after an explicit save, for the toolbar's "Saved" cue. */
  readonly justSaved = signal(false);
  /** Whether a save exists to load — gates the toolbar's Load button. */
  readonly hasSave = signal(this.storage.has(STORAGE_KEY));

  private autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  private savedFlashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Every document change reschedules the write; the debounce means a burst
    // of edits (a drag, a slider scrub) costs one write, not one per frame.
    effect(() => this.scheduleAutosave(this.canvas.document()));

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.autosaveTimer);
      clearTimeout(this.savedFlashTimer);
    });
  }

  /**
   * Restores the last save at app start. This is the editor's initial state
   * rather than a user edit, so it replaces the document directly instead of
   * going through a command — there is no history yet for it to belong to.
   */
  restoreOnStartup(): void {
    const document = this.readSaved();
    if (document) {
      this.canvas.replaceDocument(document);
    }
  }

  /** Manual save: writes immediately and confirms via {@link justSaved}. */
  save(): void {
    this.writeDocument(this.canvas.document());
    this.justSaved.set(true);
    clearTimeout(this.savedFlashTimer);
    this.savedFlashTimer = setTimeout(() => this.justSaved.set(false), SAVED_FLASH_MS);
  }

  /** Replaces the document with the last save, as one undo step. */
  load(): void {
    const document = this.readSaved();
    if (document) {
      this.commands.dispatch(new LoadCanvasCommand(this.canvas, document));
    }
  }

  private scheduleAutosave(document: CanvasDocument): void {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.writeDocument(document), AUTOSAVE_DELAY_MS);
  }

  private writeDocument(document: CanvasDocument): void {
    if (this.storage.set(STORAGE_KEY, document)) {
      this.hasSave.set(true);
    }
  }

  private readSaved(): CanvasDocument | null {
    const value = this.storage.get<CanvasDocument>(STORAGE_KEY);
    return isCanvasDocument(value) ? value : null;
  }
}
