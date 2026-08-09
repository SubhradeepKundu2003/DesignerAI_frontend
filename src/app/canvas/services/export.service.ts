import { Injectable, inject } from '@angular/core';

import { Page } from '../models/canvas-document.model';
import { ThumbnailSnapshotService } from '../renderers/thumbnail-snapshot.service';
import { CanvasStore } from '../state/canvas.store';
import { downloadBlob } from '../utils/download.util';
import { EXPORT_PIXEL_RATIO, buildPdf } from '../utils/pdf-export.util';
import { buildPngBlob, buildPngZip } from '../utils/png-export.util';
import { buildPptx } from '../utils/pptx-export.util';

export type ExportPageRange = 'all' | 'current';

const DEFAULT_TITLE = 'design';

/**
 * Renders the current document out of the editor as PDF, PNG or PPTX — a
 * one-way, non-mutating read of `CanvasStore` (unlike `ProjectFileService`'s
 * `.dzn`, nothing here round-trips back into the editor, so there is no
 * `CommandBus` involvement).
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly canvas = inject(CanvasStore);
  private readonly thumbnails = inject(ThumbnailSnapshotService);

  async exportPdf(range: ExportPageRange): Promise<void> {
    const pages = this.resolvePages(range);
    const blob = await buildPdf(pages, this.snapshot);
    downloadBlob(blob, `${DEFAULT_TITLE}.pdf`);
  }

  async exportPng(range: ExportPageRange): Promise<void> {
    const pages = this.resolvePages(range);
    const blob =
      pages.length === 1
        ? await buildPngBlob(pages[0], this.snapshot, EXPORT_PIXEL_RATIO)
        : await buildPngZip(pages, this.snapshot, EXPORT_PIXEL_RATIO);
    downloadBlob(blob, pages.length === 1 ? `${DEFAULT_TITLE}.png` : `${DEFAULT_TITLE}-pages.zip`);
  }

  async exportPptx(range: ExportPageRange): Promise<void> {
    const pages = this.resolvePages(range);
    const blob = await buildPptx(pages);
    downloadBlob(blob, `${DEFAULT_TITLE}.pptx`);
  }

  private readonly snapshot = (page: Page, pixelRatio: number): Promise<string> =>
    this.thumbnails.snapshot(page, pixelRatio);

  private resolvePages(range: ExportPageRange): Page[] {
    return range === 'current' ? [this.canvas.activePage()] : [...this.canvas.pages()];
  }
}
