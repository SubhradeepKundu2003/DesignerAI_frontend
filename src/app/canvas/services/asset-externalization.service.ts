import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProjectApiService } from '../../core/services/project-api.service';
import { CanvasElement, isImageElement } from '../models/canvas-element.model';
import { CanvasDocument } from '../models/canvas-document.model';
import { extensionForMimeType, hashBase64, parseDataUrl } from '../utils/data-url.util';

/** Mirrors `PROJECT_ASSET_SIZE_THRESHOLD_BYTES` (Track G2) — same threshold, different destination. */
const SIZE_THRESHOLD_BYTES = 50 * 1024;

/**
 * Externalizes large inline `ImageElement.src` data URLs to the backend
 * (Track H3) before a document is saved there — the server-side upload half
 * of Track G2's client-side hash/threshold pattern, reused rather than
 * redesigned. Like `ProjectFileService.exportProject`, this returns a new
 * document for the save payload; it never mutates the live canvas document
 * or `CanvasStore` itself.
 */
@Injectable({ providedIn: 'root' })
export class AssetExternalizationService {
  private readonly api = inject(ProjectApiService);

  async externalize(projectId: string, document: CanvasDocument): Promise<CanvasDocument> {
    // Keyed by the in-flight *promise*, not the resolved url: two elements
    // sharing a hash both reach `externalizeElement` before either await
    // yields, so caching only the resolved value would let both start their
    // own upload. Storing the promise synchronously closes that race.
    const uploaded = new Map<string, Promise<string>>();
    let changed = false;

    const pages = await Promise.all(
      document.pages.map(async (page) => {
        const elements = await Promise.all(
          page.elements.map((element) => this.externalizeElement(projectId, element, uploaded)),
        );
        if (elements.some((element, i) => element !== page.elements[i])) {
          changed = true;
          return { ...page, elements };
        }
        return page;
      }),
    );

    return changed ? { ...document, pages } : document;
  }

  private async externalizeElement(
    projectId: string,
    element: CanvasElement,
    uploaded: Map<string, Promise<string>>,
  ): Promise<CanvasElement> {
    if (!isImageElement(element)) {
      return element;
    }

    const parsed = parseDataUrl(element.src);
    if (!parsed || parsed.byteLength <= SIZE_THRESHOLD_BYTES) {
      return element;
    }

    const hash = hashBase64(parsed.base64);
    let uploadPromise = uploaded.get(hash);
    if (!uploadPromise) {
      uploadPromise = this.uploadOnce(projectId, hash, parsed.base64, parsed.mimeType);
      uploaded.set(hash, uploadPromise);
    }

    return { ...element, src: await uploadPromise };
  }

  private async uploadOnce(
    projectId: string,
    hash: string,
    base64: string,
    mimeType: string,
  ): Promise<string> {
    const blob = base64ToBlob(base64, mimeType);
    const filename = `img-${hash}.${extensionForMimeType(mimeType)}`;
    const asset = await firstValueFrom(this.api.uploadAsset(projectId, blob, filename));
    return this.api.assetUrl(asset.id);
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
