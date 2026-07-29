import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { DividerElement, ElementPatch } from '../../../models/canvas-element.model';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { ColorInput } from '../../../../shared/components/color-input/color-input';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';
import { SelectInput, SelectOption } from '../../../../shared/components/select-input/select-input';

type DashStyle = 'solid' | 'dashed';

const DASH_PATTERN: readonly number[] = [8, 6];

/** The properties panel form for `DividerElement`. */
@Component({
  selector: 'app-divider-properties',
  imports: [PanelSection, NumberInput, ColorInput, SelectInput],
  templateUrl: './divider-properties.html',
  styleUrl: './divider-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<DividerElement>();
  readonly disabled = input(false);

  protected readonly dashOptions: readonly SelectOption<DashStyle>[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
  ];

  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected dashStyle(): DashStyle {
    return this.element().dash.length > 0 ? 'dashed' : 'solid';
  }

  protected setStroke(stroke: string): void {
    this.patch({ stroke }, 'Change stroke colour');
  }

  protected setStrokeWidth(strokeWidth: number): void {
    this.patch({ strokeWidth: Math.max(1, strokeWidth) }, 'Change stroke width');
  }

  protected setDashStyle(style: DashStyle): void {
    this.patch({ dash: style === 'dashed' ? [...DASH_PATTERN] : [] }, 'Change dash style');
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
