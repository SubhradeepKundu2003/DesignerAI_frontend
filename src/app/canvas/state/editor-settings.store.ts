import { Injectable, computed, signal } from '@angular/core';

import { DEFAULT_EDITOR_SETTINGS } from '../models/editor-config';
import { EditorSettings } from '../models/editor-settings.model';

/**
 * Workspace display preferences (grid, snapping, guides, margins).
 *
 * Deliberately separate from the Canvas JSON document: these belong to the
 * user's session, not to the newsletter being designed, and must never end up
 * in a saved document or in AI-generated output.
 */
@Injectable({ providedIn: 'root' })
export class EditorSettingsStore {
  private readonly state = signal<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS });

  readonly settings = this.state.asReadonly();
  readonly gridVisible = computed(() => this.state().gridVisible);
  readonly snapEnabled = computed(() => this.state().snapEnabled);
  readonly guidesVisible = computed(() => this.state().guidesVisible);
  readonly marginsVisible = computed(() => this.state().marginsVisible);

  toggleGrid(): void {
    this.patch({ gridVisible: !this.state().gridVisible });
  }

  toggleSnap(): void {
    this.patch({ snapEnabled: !this.state().snapEnabled });
  }

  toggleGuides(): void {
    this.patch({ guidesVisible: !this.state().guidesVisible });
  }

  toggleMargins(): void {
    this.patch({ marginsVisible: !this.state().marginsVisible });
  }

  private patch(change: Partial<EditorSettings>): void {
    this.state.update((current) => ({ ...current, ...change }));
  }
}
