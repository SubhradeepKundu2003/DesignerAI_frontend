import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Rect } from 'konva/lib/shapes/Rect';

import { readToken } from '../utils/theme.util';

export interface MarqueeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws the drag-to-select rectangle on the overlay layer, next to the
 * selection transformer and the alignment guides.
 *
 * Two stacked rects rather than one: this Konva version has no per-fill
 * opacity, only a whole-node one, so a translucent tint and a crisp 1px
 * border can't both come from a single node's `opacity`.
 *
 * Reused rather than recreated, shown for the duration of the drag and
 * hidden — not destroyed — once it ends, the same pooling
 * {@link GuidesRenderer} uses.
 */
@Injectable()
export class MarqueeRenderer implements OnDestroy {
  private layer: Konva.Layer | null = null;
  private fill: Rect | null = null;
  private border: Rect | null = null;

  attach(layer: Konva.Layer): void {
    this.detach();
    this.layer = layer;
  }

  /** Shows the marquee at `box` (page-space). */
  render(box: MarqueeBox): void {
    const layer = this.layer;
    if (!layer) {
      return;
    }

    if (!this.fill || !this.border) {
      const accent = readToken('--color-selection', '#4e84c4');
      this.fill = new Rect({
        fill: accent,
        opacity: 0.1,
        listening: false,
        perfectDrawEnabled: false,
      });
      this.border = new Rect({
        stroke: accent,
        strokeWidth: 1,
        strokeScaleEnabled: false,
        listening: false,
        perfectDrawEnabled: false,
      });
      layer.add(this.fill, this.border);
    }

    this.fill.setAttrs({ ...box, visible: true });
    this.border.setAttrs({ ...box, visible: true });
    layer.batchDraw();
  }

  /** Hides the marquee, e.g. once the drag ends. */
  clear(): void {
    if (!this.fill) {
      return;
    }
    this.fill.visible(false);
    this.border?.visible(false);
    this.layer?.batchDraw();
  }

  detach(): void {
    this.fill?.destroy();
    this.border?.destroy();
    this.fill = null;
    this.border = null;
    this.layer = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }
}
