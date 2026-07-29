import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import {
  ElementPatch,
  FontStyle,
  TextAlign,
  TextElement,
} from '../../../models/canvas-element.model';
import { FONT_FAMILIES, FONT_SIZES } from '../../../models/editor-config';
import { CanvasStore } from '../../../state/canvas.store';
import { generateId } from '../../../utils/id.util';
import { measureTextHeight } from '../../../utils/text-measure.util';
import { ColorInput } from '../../../../shared/components/color-input/color-input';
import { IconButton } from '../../../../shared/components/icon-button/icon-button';
import { NumberInput } from '../../../../shared/components/number-input/number-input';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';
import { SelectInput, SelectOption } from '../../../../shared/components/select-input/select-input';

/** The properties panel form for `TextElement`. */
@Component({
  selector: 'app-text-properties',
  imports: [PanelSection, NumberInput, ColorInput, SelectInput, IconButton],
  templateUrl: './text-properties.html',
  styleUrl: './text-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);

  readonly element = input.required<TextElement>();
  readonly disabled = input(false);

  protected readonly fontFamilyOptions: readonly SelectOption[] = FONT_FAMILIES.map((family) => ({
    value: family,
    label: family,
  }));

  protected readonly fontSizeOptions: readonly SelectOption[] = FONT_SIZES.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  protected readonly alignOptions: readonly {
    value: TextAlign;
    icon: 'alignLeft' | 'alignCenter' | 'alignRight';
  }[] = [
    { value: 'left', icon: 'alignLeft' },
    { value: 'center', icon: 'alignCenter' },
    { value: 'right', icon: 'alignRight' },
  ];

  protected readonly isBold = computed(() => this.element().fontStyle.includes('bold'));
  protected readonly isItalic = computed(() => this.element().fontStyle.includes('italic'));

  private mergeKey: string | null = null;

  protected beginGesture(): void {
    this.mergeKey = generateId('merge');
  }

  protected endGesture(): void {
    this.mergeKey = null;
  }

  protected setText(text: string): void {
    // Height is measured, not typed: keeps the box the same height the canvas
    // overlay would leave it at, so the two editing paths never disagree.
    const { width, fontFamily, fontSize, fontStyle, letterSpacing, lineHeight } = this.element();
    const height = measureTextHeight({
      text,
      width,
      fontFamily,
      fontSize,
      fontStyle,
      letterSpacing,
      lineHeight,
    });
    this.patch({ text, height }, 'Edit text');
  }

  protected setFontFamily(fontFamily: string): void {
    this.patch({ fontFamily }, 'Change font');
  }

  protected setFontSize(raw: string): void {
    const fontSize = Number(raw);
    if (Number.isFinite(fontSize)) {
      this.patch({ fontSize }, 'Change font size');
    }
  }

  protected setFill(fill: string): void {
    this.patch({ fill }, 'Change text colour');
  }

  protected toggleBold(): void {
    this.patch({ fontStyle: combineFontStyle(!this.isBold(), this.isItalic()) }, 'Change style');
  }

  protected toggleItalic(): void {
    this.patch({ fontStyle: combineFontStyle(this.isBold(), !this.isItalic()) }, 'Change style');
  }

  protected setAlign(align: TextAlign): void {
    this.patch({ align }, 'Change alignment');
  }

  protected setLetterSpacing(letterSpacing: number): void {
    this.patch({ letterSpacing }, 'Change letter spacing');
  }

  protected setLineHeight(lineHeight: number): void {
    this.patch({ lineHeight }, 'Change line height');
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

function combineFontStyle(bold: boolean, italic: boolean): FontStyle {
  if (bold && italic) {
    return 'bold italic';
  }
  return bold ? 'bold' : italic ? 'italic' : 'normal';
}
