import { Injectable, inject } from '@angular/core';

import { DESIGN_THEME_PRESETS } from '../data/design-themes';
import { DesignTheme } from '../models/design-theme.model';
import { CanvasStore } from './canvas.store';

/**
 * Read-side access to the active theme and the shipped preset list.
 *
 * The active theme itself lives on `CanvasDocument.theme` — it is part of the
 * project, not session UI state like `EditorSettingsStore` — so this store is a
 * thin, presets-plus-a-passthrough wrapper rather than its own signal. Changing
 * the active theme goes through `ApplyThemeCommand`, not this store, so it stays
 * undoable like every other document mutation.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly canvas = inject(CanvasStore);

  /** Shipped theme presets, offered by the theme picker. */
  readonly presets: readonly DesignTheme[] = DESIGN_THEME_PRESETS;

  readonly activeTheme = this.canvas.theme;
}
