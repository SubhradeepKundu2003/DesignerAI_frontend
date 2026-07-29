import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Labelled range slider with a live numeric readout — opacity, stroke width, … */
@Component({
  selector: 'app-slider-input',
  imports: [],
  templateUrl: './slider-input.html',
  styleUrl: './slider-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderInput {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(1);
  readonly step = input(0.01);
  readonly disabled = input(false);
  /** Multiplies `value` for the readout — opacity is stored 0–1, shown as 0–100. */
  readonly displayScale = input(1);
  readonly suffix = input<string | null>(null);

  readonly valueChange = output<number>();

  protected readonly display = computed(() => Math.round(this.value() * this.displayScale()));

  protected onInput(raw: string): void {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      this.valueChange.emit(parsed);
    }
  }
}
