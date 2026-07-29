import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CommonProperties } from '../../canvas/components/properties/common-properties/common-properties';
import { DividerProperties } from '../../canvas/components/properties/divider-properties/divider-properties';
import { ImageProperties } from '../../canvas/components/properties/image-properties/image-properties';
import { ShapeProperties } from '../../canvas/components/properties/shape-properties/shape-properties';
import { TextProperties } from '../../canvas/components/properties/text-properties/text-properties';
import { SelectionStore } from '../../canvas/state/selection.store';
import { AppIcon } from '../../shared/components/app-icon/app-icon';

/**
 * Right panel: shows the properties of the current selection.
 *
 * The common block (position, size, rotation, opacity) is shown for every
 * type; the type-specific form beneath it is picked by narrowing the
 * selection down to each element type, rather than a template `@switch` —
 * that is what lets each per-type component declare its `element` input as
 * the concrete type instead of the whole union.
 */
@Component({
  selector: 'app-properties-panel',
  imports: [
    AppIcon,
    CommonProperties,
    TextProperties,
    ShapeProperties,
    DividerProperties,
    ImageProperties,
  ],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertiesPanel {
  private readonly selection = inject(SelectionStore);

  protected readonly element = this.selection.primary;
  protected readonly disabled = computed(() => this.element()?.locked ?? false);

  protected readonly textElement = computed(() => {
    const element = this.element();
    return element?.type === 'text' ? element : null;
  });

  protected readonly shapeElement = computed(() => {
    const element = this.element();
    return element?.type === 'shape' ? element : null;
  });

  protected readonly dividerElement = computed(() => {
    const element = this.element();
    return element?.type === 'divider' ? element : null;
  });

  protected readonly imageElement = computed(() => {
    const element = this.element();
    return element?.type === 'image' ? element : null;
  });
}
