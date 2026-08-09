/** A 1x1 transparent PNG — enough for `toDataURL()` to return something real specs can parse as a data URL. */
const STUB_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Gives jsdom a 2D canvas context so Konva can be exercised in unit tests.
 *
 * jsdom's `getContext()` returns `null` unless the native `canvas` package is
 * installed, which would fail every renderer the moment it created a layer.
 * The stub rasterises nothing — it exists so the renderers' *logic* (node
 * lifecycle, attributes, the stage transform) can be asserted without a real
 * rasteriser. Pixel output is verified in the browser, not here.
 *
 * `toDataURL()` is stubbed alongside it for the same reason: jsdom's is also
 * a no-op without the native `canvas` package, but code exporting a
 * snapshot (e.g. `ThumbnailSnapshotService`) needs *some* well-formed data
 * URL back to prove the export path itself works.
 *
 * `Path2D` — used by `IconRenderer` to build glyph geometry — isn't a canvas
 * *context* member at all but a separate global jsdom doesn't implement
 * either; a bare no-op class is enough, since the context stub's own
 * `fill`/`stroke` already ignore whatever path they're given.
 */
export function stubCanvas2dContext(): () => void {
  const original = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalPath2D = (globalThis as { Path2D?: unknown }).Path2D;
  HTMLCanvasElement.prototype.toDataURL = () => STUB_PNG_DATA_URL;
  (globalThis as { Path2D?: unknown }).Path2D = class StubPath2D {
    addPath(): void {}
    arc(): void {}
    rect(): void {}
  };

  // Konva reads back from a few of these, so they return plausible shapes
  // rather than `undefined`; everything else is a no-op, and assigned
  // properties (fillStyle, …) are simply stored on the target.
  const readBacks: Record<string, (...args: never[]) => unknown> = {
    getImageData: (...args: never[]) => {
      const [, , width = 0, height = 0] = args as unknown as number[];
      return { data: new Uint8ClampedArray(Math.max(width * height, 0) * 4) };
    },
    measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
  };

  const context = new Proxy({} as Record<string, unknown>, {
    get: (target, property) => {
      if (property in target) {
        return target[property as string];
      }
      return readBacks[property as string] ?? (() => undefined);
    },
  });

  HTMLCanvasElement.prototype.getContext = (() =>
    context) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  return () => {
    HTMLCanvasElement.prototype.getContext = original;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    (globalThis as { Path2D?: unknown }).Path2D = originalPath2D;
  };
}
