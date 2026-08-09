import { TINY_PNG_DATA_URL, pageFixture } from '../../../testing/canvas-fixtures';
import { EXPORT_PIXEL_RATIO, buildPdf } from './pdf-export.util';

describe('buildPdf', () => {
  it('should reject an empty page list', async () => {
    await expect(buildPdf([], async () => TINY_PNG_DATA_URL)).rejects.toThrow('No pages');
  });

  it('should snapshot every page exactly once, at the export pixel ratio, and produce a PDF blob', async () => {
    const pages = [pageFixture(), pageFixture()];
    const snapshot = vi.fn().mockResolvedValue(TINY_PNG_DATA_URL);

    const blob = await buildPdf(pages, snapshot);

    expect(snapshot).toHaveBeenCalledTimes(2);
    expect(snapshot).toHaveBeenNthCalledWith(1, pages[0], EXPORT_PIXEL_RATIO);
    expect(snapshot).toHaveBeenNthCalledWith(2, pages[1], EXPORT_PIXEL_RATIO);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});
