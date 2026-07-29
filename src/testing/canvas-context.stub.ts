/**
 * Gives jsdom a 2D canvas context so Konva can be exercised in unit tests.
 *
 * jsdom's `getContext()` returns `null` unless the native `canvas` package is
 * installed, which would fail every renderer the moment it created a layer.
 * The stub rasterises nothing — it exists so the renderers' *logic* (node
 * lifecycle, attributes, the stage transform) can be asserted without a real
 * rasteriser. Pixel output is verified in the browser, not here.
 */
export function stubCanvas2dContext(): () => void {
  const original = HTMLCanvasElement.prototype.getContext;

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
  };
}
