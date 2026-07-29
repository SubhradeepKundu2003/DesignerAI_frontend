import { ImageUploadService } from './image-upload.service';

/**
 * jsdom reads files but never actually decodes images, so `Image` is stubbed
 * here to drive the load/error paths deterministically — the same reason
 * `ImageRenderer`, which faces the same gap, has no spec of its own.
 */
function stubImage(outcome: { width: number; height: number } | 'error'): () => void {
  const original = window.Image;

  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;

    set src(_value: string) {
      queueMicrotask(() => {
        if (outcome === 'error') {
          this.onerror?.();
          return;
        }
        this.naturalWidth = outcome.width;
        this.naturalHeight = outcome.height;
        this.onload?.();
      });
    }
  }

  window.Image = StubImage as unknown as typeof Image;
  return () => {
    window.Image = original;
  };
}

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let restoreImage: () => void;

  beforeEach(() => {
    service = new ImageUploadService();
  });

  afterEach(() => {
    restoreImage?.();
  });

  it('should resolve the data URL and natural size of an uploaded file', async () => {
    restoreImage = stubImage({ width: 640, height: 480 });
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });

    const result = await service.load(file);

    expect(result.src.startsWith('data:image/png')).toBe(true);
    expect(result.natural).toEqual({ width: 640, height: 480 });
  });

  it('should reject when the file cannot be decoded as an image', async () => {
    restoreImage = stubImage('error');
    const file = new File(['not really an image'], 'broken.png', { type: 'image/png' });

    await expect(service.load(file)).rejects.toThrow();
  });
});
