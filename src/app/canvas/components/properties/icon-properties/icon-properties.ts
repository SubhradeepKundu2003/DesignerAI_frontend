import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { ElementPatch, IconElement } from '../../../models/canvas-element.model';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { ICON_NAMES, IconName } from '../../../../shared/icons/icon-registry';
import { ColorInput } from '../../../../shared/components/color-input/color-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';
import { SelectInput, SelectOption } from '../../../../shared/components/select-input/select-input';

/** The properties panel form for `IconElement`. */
@Component({
  selector: 'app-icon-properties',
  imports: [PanelSection, ColorInput, SelectInput],
  templateUrl: './icon-properties.html',
  styleUrl: './icon-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<IconElement>();
  readonly disabled = input(false);

  protected readonly iconOptions: readonly SelectOption<IconName>[] = ICON_NAMES.map((name) => ({
    value: name,
    label: label(name),
  }));

  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected setIcon(iconId: IconName): void {
    this.patch({ iconId }, 'Change icon');
  }

  protected setFill(fill: string): void {
    // A hand-picked colour detaches the element from the theme — otherwise the
    // next `ApplyThemeCommand` would silently overwrite what the user just set.
    this.patch({ fill, fillRef: undefined }, 'Change icon colour');
  }

  private patch(change: ElementPatch, label: string): void {
    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, this.element().id, change, {
        label,
        mergeKey: this.mergeKey ?? undefined,
      }),
    );
  }
}

/** "trendUp" -> "Trend up" — the registry's ids are camelCase identifiers, not labels. */
function label(name: IconName): string {
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
