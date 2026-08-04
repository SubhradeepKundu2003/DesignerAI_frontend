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
      groups: [],
    };
  }

  /**
   * Copies `page`: a new id for it, for every element on it, and for every
   * group — `parentId`/`childIds` are remapped through the same id swap so
   * groups on the copy point at the copy's own elements, not the original's.
   */
  duplicate(page: Page): Page {
    const copy = structuredClone(page) as Page;
    const elementIds = new Map(copy.elements.map((element) => [element.id, generateId()]));
    const groupIds = new Map((copy.groups ?? []).map((group) => [group.id, generateId('group')]));

    return {
      ...copy,
      id: generateId('page'),
      name: this.nextName(),
      elements: copy.elements.map((element) => ({
        ...element,
        id: elementIds.get(element.id)!,
        parentId: element.parentId ? groupIds.get(element.parentId) : undefined,
      })),
      groups: (copy.groups ?? []).map((group) => ({
        ...group,
        id: groupIds.get(group.id)!,
        childIds: group.childIds.map((id) => elementIds.get(id)!),
      })),
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
