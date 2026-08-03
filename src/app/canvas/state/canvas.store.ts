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
        name: 'Page 1',
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

  /**
   * The page being edited, tracked by id rather than array index. An id survives
   * every other page being added, removed or reordered around it, which is what
   * keeps "which page am I looking at" stable through those mutations.
   */
  private readonly activePageId = signal<string>(this.state().pages[0].id);

  readonly document = this.state.asReadonly();

  readonly pages = computed<readonly Page[]>(() => this.state().pages);

  readonly pageCount = computed(() => this.pages().length);

  readonly activePage = computed<Page>(() => {
    const pages = this.pages();
    return pages.find((page) => page.id === this.activePageId()) ?? pages[0];
  });

  /** 0-based position of the active page, for "Page X of N" style labels. */
  readonly activePageIndex = computed(() =>
    this.pages().findIndex((page) => page.id === this.activePage().id),
  );

  readonly elements = computed<readonly CanvasElement[]>(() => this.activePage().elements);

  readonly elementCount = computed(() => this.elements().length);

  elementById(id: string | null | undefined): CanvasElement | undefined {
    if (!id) {
      return undefined;
    }
    for (const page of this.pages()) {
      const found = page.elements.find((element) => element.id === id);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  /** Index in paint order on the element's own page, or -1. */
  indexOf(id: string): number {
    const owner = this.pageOf(id);
    return owner ? owner.elements.findIndex((element) => element.id === id) : -1;
  }

  /** Switches the page being edited. No-op for an id that no longer exists. */
  setActivePage(id: string): void {
    if (this.pages().some((page) => page.id === id)) {
      this.activePageId.set(id);
    }
  }

  // --- Element mutators. Commands only; see the class comment. --------------
  //
  // Each locates the element's own page rather than assuming "the active one",
  // so undo/redo stays correct even if the user has switched pages since the
  // command was dispatched.

  /** Inserts `element` onto the *active* page at `index` (top of stack when omitted). */
  insertElement(element: CanvasElement, index?: number): void {
    this.updatePageElements(this.activePage().id, (elements) => {
      const at = clampIndex(index ?? elements.length, elements.length);
      const next = [...elements];
      next.splice(at, 0, element);
      return next;
    });
  }

  removeElement(id: string): void {
    const owner = this.pageOf(id);
    if (!owner) {
      return;
    }
    this.updatePageElements(owner.id, (elements) => {
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
    const owner = this.pageOf(id);
    if (!owner) {
      return;
    }
    this.updatePageElements(owner.id, (elements) => {
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
    const owner = this.pageOf(id);
    if (!owner) {
      return;
    }
    this.updatePageElements(owner.id, (elements) => {
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
    this.activePageId.set(document.pages[0]?.id ?? '');
  }

  // --- Page mutators. Commands only. ----------------------------------------

  /** Inserts `page` at `index` (end of the document when omitted). */
  insertPage(page: Page, index?: number): void {
    this.state.update((document) => {
      const at = clampIndex(index ?? document.pages.length, document.pages.length);
      const pages = [...document.pages];
      pages.splice(at, 0, page);
      return { ...document, pages };
    });
  }

  /**
   * Removes a page. Refuses to leave the document empty. If the removed page
   * was active, the page that was next to it (preferring the one before)
   * becomes active.
   */
  removePage(id: string): void {
    const pages = this.state().pages;
    if (pages.length <= 1) {
      return;
    }
    const index = pages.findIndex((page) => page.id === id);
    if (index === -1) {
      return;
    }

    const next = [...pages];
    next.splice(index, 1);
    this.state.update((document) => ({ ...document, pages: next }));

    if (this.activePageId() === id) {
      const fallback = next[Math.max(index - 1, 0)];
      this.activePageId.set(fallback.id);
    }
  }

  patchPage(id: string, patch: Partial<Pick<Page, 'name' | 'background'>>): void {
    this.state.update((document) => {
      const index = document.pages.findIndex((page) => page.id === id);
      if (index === -1) {
        return document;
      }
      const pages = [...document.pages];
      pages[index] = { ...pages[index], ...patch };
      return { ...document, pages };
    });
  }

  /** Moves a page to `toIndex`, e.g. drag-reorder in the page navigator. */
  movePage(id: string, toIndex: number): void {
    this.state.update((document) => {
      const from = document.pages.findIndex((page) => page.id === id);
      const to = clampIndex(toIndex, document.pages.length - 1);
      if (from === -1 || from === to) {
        return document;
      }
      const pages = [...document.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { ...document, pages };
    });
  }

  private pageOf(id: string): Page | undefined {
    return this.pages().find((page) => page.elements.some((element) => element.id === id));
  }

  /**
   * Applies `update` to one page's elements, by page id. Returning the same
   * array means "nothing changed", and no new document is published — so a
   * no-op command cannot make the reconciler walk the page for nothing.
   */
  private updatePageElements(
    pageId: string,
    update: (elements: readonly CanvasElement[]) => readonly CanvasElement[],
  ): void {
    this.state.update((document) => {
      const index = document.pages.findIndex((page) => page.id === pageId);
      if (index === -1) {
        return document;
      }

      const page = document.pages[index];
      const elements = update(page.elements);
      if (elements === page.elements) {
        return document;
      }

      const pages = [...document.pages];
      pages[index] = { ...page, elements: [...elements] };
      return { ...document, pages };
    });
  }
}

function clampIndex(index: number, max: number): number {
  return Math.min(Math.max(Math.trunc(index), 0), Math.max(max, 0));
}
