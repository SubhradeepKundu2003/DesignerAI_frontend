import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AppIcon } from '../app-icon/app-icon';
import { IconName } from '../app-icon/icon-paths';

export type IconButtonVariant = 'ghost' | 'toggle';

/**
 * Icon-only button used across the toolbar, sidebar and panels.
 *
 * `label` is required: it is both the accessible name and the tooltip, so no
 * control in the editor ships without one.
 */
@Component({
  selector: 'app-icon-button',
  imports: [AppIcon],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-active]': 'active()',
  },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  /** Renders the pressed state; also exposed as `aria-pressed` for toggles. */
  readonly active = input(false);
  readonly variant = input<IconButtonVariant>('ghost');
  readonly iconSize = input(17);

  readonly activated = output<void>();

  protected onClick(): void {
    if (!this.disabled()) {
      this.activated.emit();
    }
  }
}
