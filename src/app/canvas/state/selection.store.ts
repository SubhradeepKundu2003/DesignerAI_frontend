import { Injectable, computed, inject, signal } from '@angular/core';

import { CanvasElement } from '../models/canvas-element.model';
import { CanvasStore } from './canvas.store';

/**
 * What the user currently has selected.
 *
 * Ids rather than elements: the document is the source of truth, so holding
 * element objects here would mean two copies to keep in step. Ids are stored as
 * an array from the outset — the UI selects one element in this phase, but
 * marquee and shift-click multi-select cost nothing to accommodate now and a
 * rewrite later.
 */
@Injectable({ providedIn: 'root' })
export class SelectionStore {
  private readonly canvas = inject(CanvasStore);

  private readonly ids = signal<readonly string[]>([]);

  readonly selectedIds = this.ids.asReadonly();

  /**
   * The selected elements, in paint order. Resolved against the document, so
   * ids left behind by a deletion simply drop out instead of rendering a
   * transformer around nothing.
   */
  readonly selectedElements = computed<readonly CanvasElement[]>(() => {
    const selected = new Set(this.ids());
    return selected.size === 0
      ? []
      : this.canvas.elements().filter((element) => selected.has(element.id));
  });

  /** The element the properties panel edits: the first of the selection. */
  readonly primary = computed<CanvasElement | null>(() => this.selectedElements()[0] ?? null);

  readonly hasSelection = computed(() => this.selectedElements().length > 0);

  isSelected(id: string): boolean {
    return this.ids().includes(id);
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
}
