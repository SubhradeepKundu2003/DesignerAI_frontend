import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Titled group of controls in a side panel — position/size, fill, typography, … */
@Component({
  selector: 'app-panel-section',
  imports: [],
  templateUrl: './panel-section.html',
  styleUrl: './panel-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSection {
  readonly title = input.required<string>();
}
