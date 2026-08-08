import { Injectable, computed, signal } from '@angular/core';

import { CANVAS_DOCUMENT_VERSION, CanvasDocument, Page } from '../models/canvas-document.model';
import { CanvasElement, ElementPatch, GroupElement } from '../models/canvas-element.model';
import { DEFAULT_THEME } from '../data/design-themes';
import { DesignTheme } from '../models/design-theme.model';
import { PAGE_BACKGROUND, PAGE_SIZE } from '../models/editor-config';
import { computeBoundingBox, computeFrameLayout } from '../utils/geometry.util';
import { generateId } from '../utils/id.util';

/** Patch a group's own fields — never its `childIds`, which only grouping/ungrouping change. */
export type GroupPatch = Partial<Omit<GroupElement, 'id' | 'type' | 'childIds'>>;

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
        groups: [],
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

  /** The project's active theme, defaulting for documents saved before theming existed. */
  readonly theme = computed<DesignTheme>(() => this.state().theme ?? DEFAULT_THEME);

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

  /** Groups on the active page. Read defensively: documents saved before groups existed have no `groups` array. */
  readonly groups = computed<readonly GroupElement[]>(() => this.activePage().groups ?? []);

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

  groupById(id: string | null | undefined): GroupElement | undefined {
    if (!id) {
      return undefined;
    }
    for (const page of this.pages()) {
      const found = (page.groups ?? []).find((group) => group.id === id);
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

  /** `id` itself, or the id of the group it belongs to, if any. Groups do not nest. */
  topLevelIdOf(id: string): string {
    return this.elementById(id)?.parentId ?? id;
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
    let parentId: string | undefined;
    let isFrame = false;
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
      parentId = next[index].parentId;
      isFrame = next[index].type === 'frame';
      return next;
    });

    // A patched element's own box may have moved — keep its group's stored
    // box (used for snapping, the properties panel and the layers panel)
    // in step, as a second write rather than folding it into the update
    // above: groups live in a different array than elements.
    if (parentId) {
      this.recomputeGroupBox(parentId);
    }

    // Same idea for a frame patched directly (its own `gap`/`padding`/`layout`
    // changing in the properties panel): re-flow its children to match.
    // Deliberately *not* triggered by a child being patched — dragging or
    // resizing a framed child stays free-form; only the frame's own controls,
    // or `CreateFrameCommand`/`DissolveFrameCommand`, ever move a child.
    if (isFrame) {
      this.layoutFrame(id);
    }
  }

  private recomputeGroupBox(groupId: string): void {
    const group = this.groupById(groupId);
    if (!group) {
      return;
    }
    const children = group.childIds
      .map((childId) => this.elementById(childId))
      .filter((element): element is CanvasElement => !!element);
    if (children.length === 0) {
      return;
    }
    this.patchGroup(groupId, computeBoundingBox(children));
  }

  /**
   * Re-flows a frame's children along its axis, inset by `padding` and spaced
   * by `gap`, then resizes the frame itself to hug that content — a minimal
   * flexbox. Cross-axis children are centred; the main axis is stacked from
   * the frame's own `x`/`y`.
   */
  layoutFrame(frameId: string): void {
    const owner = this.pageOf(frameId);
    const frame = owner?.elements.find((element) => element.id === frameId);
    if (!owner || !frame || frame.type !== 'frame') {
      return;
    }

    const children = frame.childIds
      .map((childId) => owner.elements.find((element) => element.id === childId))
      .filter((element): element is CanvasElement => !!element);

    const { width, height, positions } = computeFrameLayout(frame, children);

    this.updatePageElements(owner.id, (elements) =>
      elements.map((element) => {
        if (element.id === frameId) {
          return element.width === width && element.height === height
            ? element
            : ({ ...element, width, height } as CanvasElement);
        }
        const position = positions.get(element.id);
        return position && (position.x !== element.x || position.y !== element.y)
          ? { ...element, ...position }
          : element;
      }),
    );

    // A child that is itself a frame only had its own box moved above —
    // `layoutFrame` only ever repositions *direct* children, so a nested
    // frame needs this cascade to re-flow its own children to the new spot.
    for (const child of children) {
      if (child.type === 'frame') {
        this.layoutFrame(child.id);
      }
    }
  }

  /** The frame on `id`'s page that lists it as a child, if any. */
  frameContaining(id: string): CanvasElement | undefined {
    return this.pageOf(id)?.elements.find(
      (element) => element.type === 'frame' && element.childIds.includes(id),
    );
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

  // --- Group mutators. Commands only. ---------------------------------------

  /**
   * Groups `memberIds` into `group`: tags each member with `parentId: group.id`
   * and gathers them into one contiguous run within the page's `elements`
   * array (needed because reordering a single grouped element is unsupported —
   * the layers panel renders groups by scanning for contiguous runs). The run
   * lands where the topmost member originally sat, and both the members' and
   * the other elements' relative order is otherwise preserved.
   */
  groupElements(group: GroupElement, memberIds: readonly string[]): void {
    const owner = this.pageOf(memberIds[0]);
    if (!owner) {
      return;
    }
    const memberSet = new Set(memberIds);

    this.updatePageElements(owner.id, (elements) => {
      const topmostIndex = Math.max(
        ...memberIds.map((id) => elements.findIndex((element) => element.id === id)),
      );
      if (topmostIndex < 0) {
        return elements;
      }

      const members = elements.filter((element) => memberSet.has(element.id));
      const others = elements.filter((element) => !memberSet.has(element.id));
      const othersBeforeCount = elements
        .slice(0, topmostIndex + 1)
        .filter((element) => !memberSet.has(element.id)).length;

      const next = [
        ...others.slice(0, othersBeforeCount),
        ...members.map((element) => ({ ...element, parentId: group.id }) as CanvasElement),
        ...others.slice(othersBeforeCount),
      ];
      return next;
    });

    this.insertGroup(group);
  }

  insertGroup(group: GroupElement): void {
    this.updatePageGroups(this.activePage().id, (groups) => [...groups, group]);
  }

  removeGroup(id: string): void {
    const owner = this.pageOf(id);
    if (!owner) {
      return;
    }
    this.updatePageGroups(owner.id, (groups) => groups.filter((group) => group.id !== id));
  }

  patchGroup(id: string, patch: GroupPatch): void {
    const owner = this.pageOf(id);
    if (!owner) {
      return;
    }
    this.updatePageGroups(owner.id, (groups) => {
      const index = groups.findIndex((group) => group.id === id);
      if (index === -1) {
        return groups;
      }
      const next = [...groups];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  /** Replaces the whole document — used by load, and later by AI generation. */
  replaceDocument(document: CanvasDocument): void {
    this.state.set(document);
    this.activePageId.set(document.pages[0]?.id ?? '');
  }

  /** Sets the project's active theme. Commands only; see {@link ApplyThemeCommand}. */
  setTheme(theme: DesignTheme | undefined): void {
    this.state.update((document) => ({ ...document, theme }));
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

  /** Finds the page owning an element *or* a group id. */
  private pageOf(id: string): Page | undefined {
    return this.pages().find(
      (page) =>
        page.elements.some((element) => element.id === id) ||
        (page.groups ?? []).some((group) => group.id === id),
    );
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

  /** Same shape as {@link updatePageElements}, for a page's `groups` array. */
  private updatePageGroups(
    pageId: string,
    update: (groups: readonly GroupElement[]) => readonly GroupElement[],
  ): void {
    this.state.update((document) => {
      const index = document.pages.findIndex((page) => page.id === pageId);
      if (index === -1) {
        return document;
      }

      const page = document.pages[index];
      const groups = update(page.groups ?? []);
      if (groups === page.groups) {
        return document;
      }

      const pages = [...document.pages];
      pages[index] = { ...page, groups: [...groups] };
      return { ...document, pages };
    });
  }
}

function clampIndex(index: number, max: number): number {
  return Math.min(Math.max(Math.trunc(index), 0), Math.max(max, 0));
}
