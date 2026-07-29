import { Injectable, signal } from '@angular/core';

/**
 * Which text element, if any, is being edited through the textarea overlay.
 *
 * Held apart from `SelectionStore`: an element stays selected while it is being
 * edited, but editing is a narrower, exclusive state the workspace and the
 * overlay both need to read — the workspace to hide the Konva node and drop the
 * transformer off it, the overlay to know what to render.
 */
@Injectable({ providedIn: 'root' })
export class TextEditingStore {
  private readonly id = signal<string | null>(null);

  readonly editingId = this.id.asReadonly();

  begin(id: string): void {
    this.id.set(id);
  }

  end(): void {
    this.id.set(null);
  }
}
