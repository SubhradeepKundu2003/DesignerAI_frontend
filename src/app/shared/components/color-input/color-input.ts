import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Labelled colour field: a native swatch picker paired with a typed hex value. */
@Component({
  selector: 'app-color-input',
  imports: [],
  templateUrl: './color-input.html',
  styleUrl: './color-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorInput {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly disabled = input(false);

  readonly valueChange = output<string>();

  /** The swatch only understands `#rrggbb`; anything else falls back to white. */
  protected readonly swatchValue = computed(() =>
    HEX_PATTERN.test(this.value()) ? this.value() : '#ffffff',
  );

  protected onSwatch(raw: string): void {
    this.valueChange.emit(raw);
  }

  protected onHex(raw: string): void {
    const trimmed = raw.trim();
    if (HEX_PATTERN.test(trimmed)) {
      this.valueChange.emit(trimmed);
    }
  }
}
