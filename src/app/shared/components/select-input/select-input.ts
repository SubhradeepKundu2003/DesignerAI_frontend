import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/** Labelled dropdown over a fixed set of string options — font, style, dash, … */
@Component({
  selector: 'app-select-input',
  imports: [],
  templateUrl: './select-input.html',
  styleUrl: './select-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInput<T extends string = string> {
  readonly label = input.required<string>();
  readonly value = input.required<T>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly disabled = input(false);

  readonly valueChange = output<T>();

  protected onChange(raw: string): void {
    this.valueChange.emit(raw as T);
  }
}
