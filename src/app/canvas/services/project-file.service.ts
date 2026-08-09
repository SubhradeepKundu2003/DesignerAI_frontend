import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import JSZip from 'jszip';

import { CommandBus } from '../commands/command-bus.service';
import { LoadCanvasCommand } from '../commands/load-canvas.command';
import { CanvasElement, isImageElement } from '../models/canvas-element.model';
import { CanvasDocument, Page, isCanvasDocument } from '../models/canvas-document.model';
import {
  PROJECT_ASSETS_DIR,
  PROJECT_ASSET_SIZE_THRESHOLD_BYTES,
  PROJECT_ASSET_URI_PREFIX,
  PROJECT_FILE_EXTENSION,
  PROJECT_FILE_FORMAT_VERSION,
  PROJECT_THUMBNAIL_ENTRY,
  ProjectManifest,
  assetRefFilename,
  parseProjectManifest,
} from '../models/project-file.model';
import { ThumbnailSnapshotService } from '../renderers/thumbnail-snapshot.service';
import { CanvasStore } from '../state/canvas.store';
import { extensionForMimeType, hashBase64, parseDataUrl } from '../utils/data-url.util';
import { downloadBlob } from '../utils/download.util';

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
  private readonly thumbnails = inject(ThumbnailSnapshotService);

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

    const document = this.canvas.document();
    const zip = new JSZip();
    const externalized = await externalizeAssets(document, zip);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('document.json', JSON.stringify(externalized, null, 2));
    await this.addThumbnail(zip, document.pages[0]);

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `design.${PROJECT_FILE_EXTENSION}`);
  }

  /**
   * Best-effort: rendered from the original (pre-externalization) page, since
   * `ThumbnailSnapshotService` needs a real loadable `src`, not an `asset:`
   * ref. A render failure never blocks the export — the zip just ships
   * without a thumbnail.
   */
  private async addThumbnail(zip: JSZip, page: Page | undefined): Promise<void> {
    if (!page) {
      return;
    }
    try {
      const parsed = parseDataUrl(await this.thumbnails.snapshot(page));
      if (parsed) {
        zip.file(PROJECT_THUMBNAIL_ENTRY, parsed.base64, { base64: true });
      }
    } catch {
      // Rendering the thumbnail is a nice-to-have, not part of the file's integrity.
    }
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
      this.importError.set(
        error instanceof Error ? error.message : 'Could not import this project file.',
      );
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

  const manifest = parseProjectManifest(JSON.parse(await manifestEntry.async('string')));
  if (!manifest) {
    throw new Error('This project file was made by a newer, incompatible version of the app.');
  }

  const document: unknown = JSON.parse(await documentEntry.async('string'));
  if (!isCanvasDocument(document)) {
    throw new Error('This project file does not contain a valid design.');
  }

  return rehydrateAssets(document, zip);
}

/**
 * Replaces any `ImageElement.src` over {@link PROJECT_ASSET_SIZE_THRESHOLD_BYTES}
 * with an `asset:` ref and writes its bytes to `assets/` once per distinct
 * image (by content hash) — a picture used on three pages is stored once.
 * Returns a new document; `document` itself is never mutated.
 *
 * A `src` that isn't an inline `data:` URL is a backend asset URL (Track
 * H3/I3 already externalized it there on save) — its bytes are fetched so
 * the `.dzn` stays the self-contained backup Track G promises, rather than a
 * live pointer at a server that might be unreachable wherever the file is
 * later imported (Track K2).
 */
async function externalizeAssets(document: CanvasDocument, zip: JSZip): Promise<CanvasDocument> {
  const written = new Map<string, string>();
  const pages = await Promise.all(
    document.pages.map(async (page) => ({
      ...page,
      elements: await Promise.all(
        page.elements.map((element) => externalizeElement(element, zip, written)),
      ),
    })),
  );
  return { ...document, pages };
}

async function externalizeElement(
  element: CanvasElement,
  zip: JSZip,
  written: Map<string, string>,
): Promise<CanvasElement> {
  if (!isImageElement(element)) {
    return element;
  }

  const inline = parseDataUrl(element.src);
  if (inline) {
    if (inline.byteLength <= PROJECT_ASSET_SIZE_THRESHOLD_BYTES) {
      return element;
    }
    return { ...element, src: writeAssetOnce(zip, written, inline.mimeType, inline.base64) };
  }

  if (!/^https?:\/\//.test(element.src)) {
    return element;
  }

  const remote = await fetchAsBase64(element.src);
  // A failed fetch leaves the live URL rather than losing the element's image entirely.
  return remote
    ? { ...element, src: writeAssetOnce(zip, written, remote.mimeType, remote.base64) }
    : element;
}

function writeAssetOnce(
  zip: JSZip,
  written: Map<string, string>,
  mimeType: string,
  base64: string,
): string {
  const hash = hashBase64(base64);
  let ref = written.get(hash);
  if (!ref) {
    const filename = `img-${hash}.${extensionForMimeType(mimeType)}`;
    zip.file(`${PROJECT_ASSETS_DIR}/${filename}`, base64, { base64: true });
    ref = `${PROJECT_ASSET_URI_PREFIX}${filename}`;
    written.set(hash, ref);
  }
  return ref;
}

async function fetchAsBase64(url: string): Promise<{ mimeType: string; base64: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
    return { mimeType, base64: btoa(binary) };
  } catch {
    return null;
  }
}

/** Rehydrates every `asset:` ref back to a blob URL for the editing session; a document with none is returned as-is. */
async function rehydrateAssets(document: CanvasDocument, zip: JSZip): Promise<CanvasDocument> {
  const urls = new Map<string, string>();
  const pages = await Promise.all(document.pages.map((page) => rehydratePage(page, zip, urls)));
  return { ...document, pages };
}

async function rehydratePage(page: Page, zip: JSZip, urls: Map<string, string>): Promise<Page> {
  const elements = await Promise.all(
    page.elements.map((element) => rehydrateElement(element, zip, urls)),
  );
  return { ...page, elements };
}

async function rehydrateElement(
  element: CanvasElement,
  zip: JSZip,
  urls: Map<string, string>,
): Promise<CanvasElement> {
  if (!isImageElement(element)) {
    return element;
  }

  const filename = assetRefFilename(element.src);
  if (!filename) {
    return element;
  }

  let url = urls.get(filename);
  if (!url) {
    const entry = zip.file(`${PROJECT_ASSETS_DIR}/${filename}`);
    // A missing asset leaves the element pointing at its unresolved `asset:` ref
    // rather than failing the whole import over one picture.
    if (!entry) {
      return element;
    }
    url = URL.createObjectURL(await entry.async('blob'));
    urls.set(filename, url);
  }

  return { ...element, src: url };
}
