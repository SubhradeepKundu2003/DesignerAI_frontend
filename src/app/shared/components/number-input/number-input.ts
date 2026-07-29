import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Labelled numeric field — position, size, rotation, stroke width, … */
@Component({
  selector: 'app-number-input',
  imports: [],
  templateUrl: './number-input.html',
  styleUrl: './number-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberInput {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input(1);
  readonly disabled = input(false);
  /** Unit shown after the field, e.g. `"px"` or `"°"`. */
  readonly suffix = input<string | null>(null);

  readonly valueChange = output<number>();

  protected onInput(raw: string): void {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      this.valueChange.emit(this.clamp(parsed));
    }
  }

  private clamp(value: number): number {
    const min = this.min();
    const max = this.max();
    let result = value;
    if (min !== null) {
      result = Math.max(result, min);
    }
    if (max !== null) {
      result = Math.min(result, max);
    }
    return result;
  }
}
