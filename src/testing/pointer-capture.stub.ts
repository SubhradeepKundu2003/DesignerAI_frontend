/**
 * Fills in `Element.setPointerCapture` / `releasePointerCapture`, which jsdom
 * does not implement. Only the workspace's own pan gesture calls these, and it
 * only needs them to not throw — capture semantics themselves are not what
 * that gesture's specs are testing.
 */
export function stubPointerCapture(): void {
  const proto = Element.prototype as Element & {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    hasPointerCapture?: (pointerId: number) => boolean;
  };

  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.hasPointerCapture ??= () => false;
}
