import JSZip from 'jszip';

import { TINY_PNG_DATA_URL, pageFixture } from '../../../testing/canvas-fixtures';
import { buildPngBlob, buildPngZip } from './png-export.util';

describe('buildPngBlob', () => {
  it('should decode the snapshot into a PNG blob', async () => {
    const blob = await buildPngBlob(pageFixture(), async () => TINY_PNG_DATA_URL, 1);

    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('buildPngZip', () => {
  it('should zip one entry per page, named from page.name or a positional fallback', async () => {
    const pages = [pageFixture({ name: 'Cover' }), pageFixture({ name: undefined })];

    const blob = await buildPngZip(pages, async () => TINY_PNG_DATA_URL, 1);

    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files).sort()).toEqual(['Cover.png', 'Page 2.png']);
  });

  it('should snapshot at the requested pixel ratio', async () => {
    const pages = [pageFixture()];
    const snapshot = vi.fn().mockResolvedValue(TINY_PNG_DATA_URL);

    await buildPngZip(pages, snapshot, 3);

    expect(snapshot).toHaveBeenCalledWith(pages[0], 3);
  });
});
