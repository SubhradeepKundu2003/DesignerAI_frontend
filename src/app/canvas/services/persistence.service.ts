import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

import { LocalStorageService } from '../../core/services/local-storage.service';
import { ProjectApiService } from '../../core/services/project-api.service';
import { CommandBus } from '../commands/command-bus.service';
import { LoadCanvasCommand } from '../commands/load-canvas.command';
import { CanvasDocument, isCanvasDocument } from '../models/canvas-document.model';
import { CanvasStore, createBlankDocument } from '../state/canvas.store';
import { AssetExternalizationService } from './asset-externalization.service';

const CACHE_KEY_PREFIX = 'designerai:canvas:';
const AUTOSAVE_DELAY_MS = 2000;
const SAVED_FLASH_MS = 1600;

/**
 * Save/load against `designerai-backend` (Track H/I) for whichever project
 * `openProject` was last called with -- routing (Track I4) is what decides
 * *which* project that is, this service only knows how to persist it.
 *
 * The single localStorage slot from before this backend existed is demoted
 * to a per-project offline cache: editing keeps working through a network
 * blip, and a same-tab reload has a synchronous fast path, but the backend
 * is the source of truth. Autosave and the explicit Save button share the
 * same write path; the only difference is that Save also flashes
 * {@link justSaved} so the user gets the certainty autosave deliberately
 * doesn't ask for (autosave writes silently).
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly storage = inject(LocalStorageService);
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly api = inject(ProjectApiService);
  private readonly externalization = inject(AssetExternalizationService);

  /** True for a moment after an explicit save, for the toolbar's "Saved" cue. */
  readonly justSaved = signal(false);
  /** Whether a save exists to load — gates the toolbar's Load button. */
  readonly hasSave = signal(false);

  private projectId: string | null = null;
  /**
   * The project whose initial `openProject` load has actually settled (loaded
   * or confirmed empty) — as opposed to `projectId`, which flips the instant
   * `openProject` is called. A write is only allowed once its target project
   * matches both, which is what stops the placeholder blank document (set
   * below, before the load resolves) from autosaving over a slow-loading
   * project's real content.
   */
  private loadedProjectId: string | null = null;
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
   * Opens `projectId` as the one this service now persists to, and loads its
   * document -- from the backend if reachable, from this project's local
   * cache otherwise. This is the editor's initial state rather than a user
   * edit, so it replaces the document directly instead of going through a
   * command — there is no history yet for it to belong to.
   */
  /** The project currently open, or `null` before `openProject` has run. */
  currentProjectId(): string | null {
    return this.projectId;
  }

  openProject(projectId: string): void {
    this.projectId = projectId;
    this.loadedProjectId = null;
    this.hasSave.set(this.storage.has(this.cacheKey(projectId)));
    // Reset immediately -- otherwise the previously open project's document
    // stays on screen (and eligible for autosave under the new project's id,
    // see `writeDocument`) until the fetch below settles.
    this.canvas.replaceDocument(createBlankDocument());

    this.api.getDocument(projectId).subscribe({
      next: (document) => {
        if (projectId !== this.projectId) {
          return;
        }
        this.loadedProjectId = projectId;
        if (!isCanvasDocument(document)) {
          return;
        }
        this.canvas.replaceDocument(document);
        this.writeCache(projectId, document);
        this.hasSave.set(true);
      },
      error: () => {
        if (projectId !== this.projectId) {
          return;
        }
        this.loadedProjectId = projectId;
        const cached = this.readCache(projectId);
        if (cached) {
          this.canvas.replaceDocument(cached);
        }
        // else: no document on the backend and nothing cached -- this is a
        // genuinely new project, so the blank document set above is correct.
      },
    });
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
    const projectId = this.projectId;
    if (!projectId) {
      return;
    }

    this.api.getDocument(projectId).subscribe({
      next: (document) => {
        if (!isCanvasDocument(document)) {
          return;
        }
        this.commands.dispatch(new LoadCanvasCommand(this.canvas, document));
        this.writeCache(projectId, document);
      },
      error: () => {
        const cached = this.readCache(projectId);
        if (cached) {
          this.commands.dispatch(new LoadCanvasCommand(this.canvas, cached));
        }
      },
    });
  }

  private scheduleAutosave(document: CanvasDocument): void {
    // Captured now, not read back from `this.projectId` when the timer fires --
    // otherwise switching projects inside the debounce window (e.g. clicking
    // "New project" right after an edit) rewrites `this.projectId` out from
    // under the pending write, and the *previous* project's document gets
    // saved under the *new* project's id.
    const projectId = this.projectId;
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.writeDocument(document, projectId), AUTOSAVE_DELAY_MS);
  }

  /** `projectId` defaults to the currently-open one, for the explicit Save button. */
  private writeDocument(document: CanvasDocument, projectId: string | null = this.projectId): void {
    if (!projectId || projectId !== this.projectId || projectId !== this.loadedProjectId) {
      return;
    }

    // The cache keeps the document exactly as the editor holds it (inline
    // data URLs and all) — only the backend copy gets large images
    // externalized, the same "build a new document for this one
    // destination, never mutate CanvasStore" pattern ProjectFileService's
    // .dzn export already uses (Track G2).
    this.writeCache(projectId, document);
    this.externalization.externalize(projectId, document).then(
      (externalized) => {
        this.api.saveDocument(projectId, externalized).subscribe({
          next: () => this.hasSave.set(true),
          // A network blip leaves the cache write above as this save's only
          // effect; the next autosave tick (or an explicit Save) retries.
          error: () => {},
        });
      },
      () => {}, // an asset upload failure is the same "retry next tick" story
    );
  }

  private writeCache(projectId: string, document: CanvasDocument): void {
    if (this.storage.set(this.cacheKey(projectId), document)) {
      this.hasSave.set(true);
    }
  }

  private readCache(projectId: string): CanvasDocument | null {
    const value = this.storage.get<CanvasDocument>(this.cacheKey(projectId));
    return isCanvasDocument(value) ? value : null;
  }

  private cacheKey(projectId: string): string {
    return `${CACHE_KEY_PREFIX}${projectId}`;
  }
}
