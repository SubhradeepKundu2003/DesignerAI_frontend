import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { CanvasElement, ElementPatch } from '../../../models/canvas-element.model';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';
import { SliderInput } from '../../../../shared/components/slider-input/slider-input';

/**
 * The x/y/width/height/rotation/opacity block shown for every element type,
 * above whichever per-type form the properties panel switches in.
 */
@Component({
  selector: 'app-common-properties',
  imports: [PanelSection, NumberInput, SliderInput],
  templateUrl: './common-properties.html',
  styleUrl: './common-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommonProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<CanvasElement>();
  readonly disabled = input(false);

  /** Set on focus, cleared on blur, so one drag/typing gesture is one undo step. */
  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected setX(x: number): void {
    this.patch({ x: Math.round(x) }, 'Move element');
  }

  protected setY(y: number): void {
    this.patch({ y: Math.round(y) }, 'Move element');
  }

  protected setWidth(width: number): void {
    this.patch({ width: Math.max(1, Math.round(width)) }, 'Resize element');
  }

  protected setHeight(height: number): void {
    this.patch({ height: Math.max(1, Math.round(height)) }, 'Resize element');
  }

  protected setRotation(rotation: number): void {
    this.patch({ rotation: Math.round(rotation) }, 'Rotate element');
  }

  protected setOpacity(opacity: number): void {
    this.patch({ opacity: Math.min(1, Math.max(0, opacity)) }, 'Change opacity');
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
