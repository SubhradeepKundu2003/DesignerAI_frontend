import { Injectable, computed, signal } from '@angular/core';

import { CANVAS_DOCUMENT_VERSION, CanvasDocument, Page } from '../models/canvas-document.model';
import { CanvasElement, ElementPatch } from '../models/canvas-element.model';
import { PAGE_BACKGROUND, PAGE_SIZE } from '../models/editor-config';
import { generateId } from '../utils/id.util';

/** A fresh, empty A4 newsletter — what the editor opens with. */
export function createBlankDocument(): CanvasDocument {
  return {
    version: CANVAS_DOCUMENT_VERSION,
    pages: [
      {
        id: generateId('page'),
        width: PAGE_SIZE.width,
        height: PAGE_SIZE.height,
        background: PAGE_BACKGROUND,
        elements: [],
      },
    ],
  };
}

/**
 * The Canvas JSON document — the single source of truth for the editor.
 *
 * Konva renders whatever this store holds and never writes back to it. The
 * mutators below are the *only* way the document changes, and they are meant to
 * be called from commands rather than from components: going through a command
 * is what keeps history, and later the AI trail, complete.
 *
 * Updates are immutable throughout (new arrays, new objects) so `computed()`
 * views and the reconciler can tell what changed by reference.
 */
@Injectable({ providedIn: 'root' })
export class CanvasStore {
  private readonly state = signal<CanvasDocument>(createBlankDocument());

  readonly document = this.state.asReadonly();

  /**
   * The page being edited. The model carries `pages[]` so multi-page documents
   * remain expressible, but this phase's UI shows the first page only.
   */
  readonly activePage = computed<Page>(() => this.state().pages[0]);

  readonly elements = computed<readonly CanvasElement[]>(() => this.activePage().elements);

  readonly elementCount = computed(() => this.elements().length);

  elementById(id: string | null | undefined): CanvasElement | undefined {
    return id ? this.elements().find((element) => element.id === id) : undefined;
  }

  /** Index in paint order, or -1. The index *is* the z-order. */
  indexOf(id: string): number {
    return this.elements().findIndex((element) => element.id === id);
  }

  // --- Mutators. Commands only; see the class comment. ---------------------

  /** Inserts `element` at `index`, or on top of the stack when omitted. */
  insertElement(element: CanvasElement, index?: number): void {
    this.updateElements((elements) => {
      const at = clampIndex(index ?? elements.length, elements.length);
      const next = [...elements];
      next.splice(at, 0, element);
      return next;
    });
  }

  removeElement(id: string): void {
    this.updateElements((elements) => {
      const index = elements.findIndex((element) => element.id === id);
      if (index === -1) {
        return elements;
      }

      const next = [...elements];
      next.splice(index, 1);
      return next;
    });
  }

  patchElement(id: string, patch: ElementPatch): void {
    this.updateElements((elements) => {
      const index = elements.findIndex((element) => element.id === id);
      if (index === -1) {
        return elements;
      }

      const next = [...elements];
      // The patch is a union of per-type partials, so the spread widens back to
      // `CanvasElement`; `id` and `type` are excluded from the patch type, which
      // is what keeps this cast honest.
      next[index] = { ...next[index], ...patch } as CanvasElement;
      return next;
    });
  }

  /** Moves an element to `toIndex` in paint order (bring forward / send back). */
  moveElement(id: string, toIndex: number): void {
    this.updateElements((elements) => {
      const from = elements.findIndex((element) => element.id === id);
      const to = clampIndex(toIndex, elements.length - 1);
      if (from === -1 || from === to) {
        return elements;
      }

      const next = [...elements];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  /** Replaces the whole document — used by load, and later by AI generation. */
  replaceDocument(document: CanvasDocument): void {
    this.state.set(document);
  }

  /**
   * Applies `update` to the active page's elements. Returning the same array
   * means "nothing changed", and no new document is published — so a no-op
   * command cannot make the reconciler walk the page for nothing.
   */
  private updateElements(
    update: (elements: readonly CanvasElement[]) => readonly CanvasElement[],
  ): void {
    this.state.update((document) => {
      const [page, ...rest] = document.pages;
      const elements = update(page.elements);
      if (elements === page.elements) {
        return document;
      }

      return { ...document, pages: [{ ...page, elements: [...elements] }, ...rest] };
    });
  }
}

function clampIndex(index: number, max: number): number {
  return Math.min(Math.max(Math.trunc(index), 0), Math.max(max, 0));
}
