import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { ElementPatch, FrameElement, FrameLayout } from '../../../models/canvas-element.model';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { ColorInput } from '../../../../shared/components/color-input/color-input';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';
import { SelectInput, SelectOption } from '../../../../shared/components/select-input/select-input';

const DEFAULT_BACKGROUND = '#ffffff';

/** The properties panel form for `FrameElement`. */
@Component({
  selector: 'app-frame-properties',
  imports: [PanelSection, NumberInput, ColorInput, SelectInput],
  templateUrl: './frame-properties.html',
  styleUrl: './frame-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<FrameElement>();
  readonly disabled = input(false);

  protected readonly layoutOptions: readonly SelectOption<FrameLayout>[] = [
    { value: 'row', label: 'Row' },
    { value: 'column', label: 'Column' },
  ];

  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected setLayout(layout: FrameLayout): void {
    this.patch({ layout }, 'Change frame direction');
  }

  protected setGap(gap: number): void {
    this.patch({ gap: Math.max(0, gap) }, 'Change frame gap');
  }

  protected setPadding(padding: number): void {
    this.patch({ padding: Math.max(0, padding) }, 'Change frame padding');
  }

  protected setBackground(background: string): void {
    // A hand-picked colour detaches the element from the theme — otherwise the
    // next `ApplyThemeCommand` would silently overwrite what the user just set.
    this.patch({ background, fillRef: undefined }, 'Change frame background');
  }

  protected toggleBackground(filled: boolean): void {
    this.patch(
      filled
        ? { background: this.element().background ?? DEFAULT_BACKGROUND }
        : { background: undefined, fillRef: undefined },
      filled ? 'Add frame background' : 'Remove frame background',
    );
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
