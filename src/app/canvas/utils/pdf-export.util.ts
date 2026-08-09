import { Page } from '../models/canvas-document.model';

/**
 * Print-quality raster multiplier for exported pages — well above
 * `ThumbnailSnapshotService`'s filmstrip-scale default, since this output is
 * meant to be viewed/printed at full size, not shown in a small preview.
 */
export const EXPORT_PIXEL_RATIO = 3;

export type PageSnapshotFn = (page: Page, pixelRatio: number) => Promise<string>;

/**
 * Renders each page to a high-res PNG (raster-first — see Track F's plan
 * rationale: reusing the canvas's own paint path beats a second vector
 * implementation against jsPDF's drawing API) and assembles them into one
 * PDF, one PDF page per canvas page at that page's own size.
 *
 * `jspdf` is loaded dynamically: it's sizeable and only ever needed once the
 * user actually exports, so it ships as its own lazy chunk rather than
 * inflating the app's initial bundle for a feature most page loads never use.
 */
export async function buildPdf(pages: readonly Page[], snapshot: PageSnapshotFn): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to export.');
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'px', format: [pages[0].width, pages[0].height] });

  for (const [index, page] of pages.entries()) {
    if (index > 0) {
      doc.addPage([page.width, page.height]);
    }
    const dataUrl = await snapshot(page, EXPORT_PIXEL_RATIO);
    doc.addImage(dataUrl, 'PNG', 0, 0, page.width, page.height);
  }

  return doc.output('blob');
}
