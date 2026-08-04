import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { CommandBus } from '../../../commands/command-bus.service';
import { UpdateGroupCommand } from '../../../commands/update-group.command';
import { GroupElement } from '../../../models/canvas-element.model';
import { ElementActions } from '../../../services/element-actions.service';
import { CanvasStore } from '../../../state/canvas.store';
import { AppIcon } from '../../../../shared/components/app-icon/app-icon';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';

/**
 * Shown instead of the per-type properties form when the selection is
 * exactly one group. A group's box is derived from its members (see
 * `CanvasStore.patchElement`'s bounding-box cascade), so position and size
 * are read-only here — `name`, `visible` and `locked` are the only fields
 * that are the group's own.
 */
@Component({
  selector: 'app-group-properties',
  imports: [PanelSection, NumberInput, AppIcon],
  templateUrl: './group-properties.html',
  styleUrl: './group-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly actions = inject(ElementActions);

  readonly group = input.required<GroupElement>();

  protected toggleVisible(): void {
    const group = this.group();
    this.commands.dispatch(
      new UpdateGroupCommand(
        this.canvas,
        group.id,
        { visible: !group.visible },
        group.visible ? 'Hide group' : 'Show group',
      ),
    );
  }

  protected toggleLocked(): void {
    const group = this.group();
    this.commands.dispatch(
      new UpdateGroupCommand(
        this.canvas,
        group.id,
        { locked: !group.locked },
        group.locked ? 'Unlock group' : 'Lock group',
      ),
    );
  }

  protected ungroup(): void {
    this.actions.ungroupSelection();
  }
}
