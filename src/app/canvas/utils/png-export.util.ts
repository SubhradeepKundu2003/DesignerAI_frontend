import JSZip from 'jszip';

import { Page } from '../models/canvas-document.model';
import { parseDataUrl } from './data-url.util';
import { PageSnapshotFn } from './pdf-export.util';

/** A single page's PNG snapshot as a downloadable `Blob`. */
export async function buildPngBlob(
  page: Page,
  snapshot: PageSnapshotFn,
  pixelRatio: number,
): Promise<Blob> {
  const dataUrl = await snapshot(page, pixelRatio);
  return base64ToBlob(dataUrl);
}

/** Every page's PNG snapshot, zipped — one `page-N.png` entry per page, in document order. */
export async function buildPngZip(
  pages: readonly Page[],
  snapshot: PageSnapshotFn,
  pixelRatio: number,
): Promise<Blob> {
  const zip = new JSZip();

  for (const [index, page] of pages.entries()) {
    const parsed = parseDataUrl(await snapshot(page, pixelRatio));
    if (parsed) {
      zip.file(pngEntryName(page, index), parsed.base64, { base64: true });
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

function pngEntryName(page: Page, index: number): string {
  return `${page.name?.trim() || `Page ${index + 1}`}.png`;
}

function base64ToBlob(dataUrl: string): Blob {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Could not decode the rendered page as an image.');
  }
  const binary = atob(parsed.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: parsed.mimeType });
}
