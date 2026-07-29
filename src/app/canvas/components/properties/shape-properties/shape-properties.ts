import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { ElementPatch, ShapeElement } from '../../../models/canvas-element.model';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { ColorInput } from '../../../../shared/components/color-input/color-input';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';

/** The properties panel form for `ShapeElement` (rectangle / circle). */
@Component({
  selector: 'app-shape-properties',
  imports: [PanelSection, NumberInput, ColorInput],
  templateUrl: './shape-properties.html',
  styleUrl: './shape-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapeProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<ShapeElement>();
  readonly disabled = input(false);

  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected setFill(fill: string): void {
    this.patch({ fill }, 'Change fill');
  }

  protected setStroke(stroke: string): void {
    this.patch({ stroke }, 'Change stroke colour');
  }

  protected setStrokeWidth(strokeWidth: number): void {
    this.patch({ strokeWidth: Math.max(0, strokeWidth) }, 'Change stroke width');
  }

  protected setCornerRadius(cornerRadius: number): void {
    this.patch({ cornerRadius: Math.max(0, cornerRadius) }, 'Change corner radius');
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
