import { Size } from '../app/canvas/models/geometry.model';

export interface ResizeObserverStub {
  /** Reports `size` to every observer created while the stub is installed. */
  emit(size: Size): void;
  restore(): void;
}

/**
 * Stands in for `ResizeObserver`, which jsdom does not implement.
 *
 * Beyond making the workspace mountable in tests, this gives them control over
 * *when* a size arrives — the editor's first frame depends on it, since the page
 * cannot be fitted until the workspace has one.
 */
export function stubResizeObserver(): ResizeObserverStub {
  const globalScope = globalThis as { ResizeObserver?: typeof ResizeObserver };
  const original = globalScope.ResizeObserver;
  const callbacks: ResizeObserverCallback[] = [];

  class Stub implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      callbacks.push(callback);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  globalScope.ResizeObserver = Stub;

  return {
    emit(size: Size): void {
      const entries = [{ contentRect: { ...size } }] as unknown as ResizeObserverEntry[];
      for (const callback of callbacks) {
        callback(entries, {} as ResizeObserver);
      }
    },
    restore(): void {
      globalScope.ResizeObserver = original;
    },
  };
}
