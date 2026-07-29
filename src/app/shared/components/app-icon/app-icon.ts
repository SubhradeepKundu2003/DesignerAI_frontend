import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICON_PATHS, IconName, IconShape } from './icon-paths';

/** Renders one of the editor's inline SVG icons at the current text colour. */
@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  /** Stroke width in the icon's own 24×24 coordinate space. */
  readonly strokeWidth = input(2);

  protected readonly shapes = computed<readonly IconShape[]>(() => ICON_PATHS[this.name()]);
}
