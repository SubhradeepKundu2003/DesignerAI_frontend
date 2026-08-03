import { Injectable, inject } from '@angular/core';

import { Page } from '../models/canvas-document.model';
import { PAGE_BACKGROUND, PAGE_SIZE } from '../models/editor-config';
import { CanvasStore } from '../state/canvas.store';
import { generateId } from '../utils/id.util';

/**
 * Builds ready-to-insert pages, the page-navigator counterpart to
 * {@link ElementFactory}.
 *
 * Creating is separate from inserting: the factory returns a plain `Page` and
 * the caller wraps it in an `AddPageCommand`/`DuplicatePageCommand`, keeping the
 * document's only write path the command bus.
 */
@Injectable({ providedIn: 'root' })
export class PageFactory {
  private readonly canvas = inject(CanvasStore);

  createBlank(): Page {
    return {
      id: generateId('page'),
      name: this.nextName(),
      width: PAGE_SIZE.width,
      height: PAGE_SIZE.height,
      background: PAGE_BACKGROUND,
      elements: [],
    };
  }

  /** Copies `page`: a new id for it and for every element on it, and a fresh name. */
  duplicate(page: Page): Page {
    const copy = structuredClone(page) as Page;
    return {
      ...copy,
      id: generateId('page'),
      name: this.nextName(),
      elements: copy.elements.map((element) => ({ ...element, id: generateId() })),
    };
  }

  /**
   * "Page 3" — the next free number, derived from the highest already in use
   * rather than the count, so numbering survives deletions.
   */
  private nextName(): string {
    const pattern = /^Page (\d+)$/;
    const highest = this.canvas.pages().reduce((max, page) => {
      const match = page.name ? pattern.exec(page.name) : null;
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return `Page ${highest + 1}`;
  }
}
