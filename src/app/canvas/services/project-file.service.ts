import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import JSZip from 'jszip';

import { CommandBus } from '../commands/command-bus.service';
import { LoadCanvasCommand } from '../commands/load-canvas.command';
import { CanvasDocument, isCanvasDocument } from '../models/canvas-document.model';
import {
  PROJECT_FILE_EXTENSION,
  PROJECT_FILE_FORMAT_VERSION,
  ProjectManifest,
  isProjectManifest,
} from '../models/project-file.model';
import { CanvasStore } from '../state/canvas.store';

const DEFAULT_TITLE = 'Untitled design';
const APP_VERSION = '0.1.0';
const ERROR_FLASH_MS = 4000;

/**
 * Export/import for the `.dzn` project file — a safety-net save independent of
 * `PersistenceService`'s single localStorage slot. Both go through
 * `LoadCanvasCommand` on the way in, so an import is one undo step exactly
 * like the Load button.
 */
@Injectable({ providedIn: 'root' })
export class ProjectFileService {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  /** A brief, human-readable message after a failed import — same transient-cue pattern as `PersistenceService.justSaved`. */
  readonly importError = signal<string | null>(null);

  private errorFlashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.errorFlashTimer));
  }

  /** Builds the zip and triggers a browser download; the current document, unchanged. */
  async exportProject(): Promise<void> {
    const now = new Date().toISOString();
    const manifest: ProjectManifest = {
      formatVersion: PROJECT_FILE_FORMAT_VERSION,
      appVersion: APP_VERSION,
      createdAt: now,
      modifiedAt: now,
      title: DEFAULT_TITLE,
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('document.json', JSON.stringify(this.canvas.document(), null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `design.${PROJECT_FILE_EXTENSION}`);
  }

  /** Unzips, validates, and loads a `.dzn` file as one undoable step; reports a message via {@link importError} on failure. */
  async importProject(file: File): Promise<void> {
    try {
      const document = await readProjectFile(file);
      this.commands.dispatch(new LoadCanvasCommand(this.canvas, document));
      clearTimeout(this.errorFlashTimer);
      this.importError.set(null);
    } catch (error) {
      clearTimeout(this.errorFlashTimer);
      this.importError.set(error instanceof Error ? error.message : 'Could not import this project file.');
      this.errorFlashTimer = setTimeout(() => this.importError.set(null), ERROR_FLASH_MS);
    }
  }
}

async function readProjectFile(file: File): Promise<CanvasDocument> {
  const zip = await JSZip.loadAsync(file);
  const manifestEntry = zip.file('manifest.json');
  const documentEntry = zip.file('document.json');
  if (!manifestEntry || !documentEntry) {
    throw new Error(`Not a valid .${PROJECT_FILE_EXTENSION} project file.`);
  }

  const manifest: unknown = JSON.parse(await manifestEntry.async('string'));
  if (!isProjectManifest(manifest)) {
    throw new Error('This project file was made by a newer, incompatible version of the app.');
  }

  const document: unknown = JSON.parse(await documentEntry.async('string'));
  if (!isCanvasDocument(document)) {
    throw new Error('This project file does not contain a valid design.');
  }

  return document;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
