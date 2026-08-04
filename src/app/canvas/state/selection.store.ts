import { Injectable, computed, inject, signal } from '@angular/core';

import { CanvasElement, GroupElement } from '../models/canvas-element.model';
import { CanvasStore } from './canvas.store';

/**
 * What the user currently has selected.
 *
 * Ids rather than elements: the document is the source of truth, so holding
 * element objects here would mean two copies to keep in step. Ids are stored as
 * an array from the outset — the UI selects one element in this phase, but
 * marquee and shift-click multi-select cost nothing to accommodate now and a
 * rewrite later.
 *
 * A selected id may be a group's — grouping is a data-only concept (see
 * `GroupElement`), so `selectedElements` transparently expands any group id
 * into its members. Every existing consumer (delete, duplicate, nudge, the
 * canvas transformer) keeps working unchanged because they already only read
 * `selectedElements`/`primary`.
 */
@Injectable({ providedIn: 'root' })
export class SelectionStore {
  private readonly canvas = inject(CanvasStore);

  private readonly ids = signal<readonly string[]>([]);
  private readonly enteredRaw = signal<string | null>(null);

  readonly selectedIds = this.ids.asReadonly();

  /**
   * The selected elements, in paint order, with any selected group expanded
   * into its members. Resolved against the document, so ids left behind by a
   * deletion simply drop out instead of rendering a transformer around
   * nothing.
   */
  readonly selectedElements = computed<readonly CanvasElement[]>(() => {
    const expanded = new Set<string>();
    for (const id of this.ids()) {
      const group = this.canvas.groupById(id);
      if (group) {
        group.childIds.forEach((childId) => expanded.add(childId));
      } else {
        expanded.add(id);
      }
    }
    return expanded.size === 0
      ? []
      : this.canvas.elements().filter((element) => expanded.has(element.id));
  });

  /** The element the properties panel edits: the first of the (expanded) selection. */
  readonly primary = computed<CanvasElement | null>(() => this.selectedElements()[0] ?? null);

  /** The single group selected on its own, if that's exactly what the selection is. */
  readonly primaryGroup = computed<GroupElement | null>(() => {
    const ids = this.ids();
    return ids.length === 1 ? (this.canvas.groupById(ids[0]) ?? null) : null;
  });

  readonly hasSelection = computed(() => this.selectedElements().length > 0);

  /**
   * The group currently "entered" via double-click, so a plain click inside it
   * selects one member instead of the whole group. Self-healing: if the group
   * is ungrouped or deleted elsewhere, this quietly falls back to `null`
   * instead of pointing at nothing.
   */
  readonly enteredGroupId = computed<string | null>(() => {
    const id = this.enteredRaw();
    return id && this.canvas.groupById(id) ? id : null;
  });

  isSelected(id: string): boolean {
    if (this.ids().includes(id)) {
      return true;
    }
    // A grouped child reads as selected when its (unentered) group is.
    const parentId = this.canvas.elementById(id)?.parentId;
    return !!parentId && this.ids().includes(parentId);
  }

  /** Replaces the selection with a single element. */
  select(id: string): void {
    if (this.ids().length === 1 && this.ids()[0] === id) {
      return;
    }
    this.ids.set([id]);
  }

  selectMany(ids: readonly string[]): void {
    this.ids.set([...ids]);
  }

  /** Adds to or removes from the selection, as shift-click does. */
  toggle(id: string): void {
    this.ids.update((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    );
  }

  deselect(id: string): void {
    this.ids.update((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : current,
    );
  }

  clear(): void {
    if (this.ids().length > 0) {
      this.ids.set([]);
    }
  }

  /** Enters a group: a plain click on one of its members selects it directly. */
  enterGroup(id: string): void {
    this.enteredRaw.set(id);
  }

  exitGroup(): void {
    if (this.enteredRaw() !== null) {
      this.enteredRaw.set(null);
    }
  }
}
