import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Line } from 'konva/lib/shapes/Line';

import { Size } from '../models/geometry.model';
import { SnapGuides } from '../services/snapping.service';
import { readToken } from '../utils/theme.util';

/**
 * Draws the alignment guide lines a drag engages with, on the overlay layer
 * next to the selection transformer.
 *
 * A small fixed pool of lines rather than one node per guide: this phase only
 * ever shows one engaged guide per axis, and reusing the same two nodes means
 * a drag that stops matching never has to create or destroy anything —
 * {@link clear} just hides them.
 */
@Injectable()
export class GuidesRenderer implements OnDestroy {
  private layer: Konva.Layer | null = null;
  private readonly verticalLines: Line[] = [];
  private readonly horizontalLines: Line[] = [];

  attach(layer: Konva.Layer): void {
    this.detach();
    this.layer = layer;
  }

  /** Shows `guides` (page-space positions) spanning the full `page`. */
  render(guides: SnapGuides, page: Size): void {
    const layer = this.layer;
    if (!layer) {
      return;
    }

    this.sync(this.verticalLines, guides.vertical, (x) => ({ points: [x, 0, x, page.height] }));
    this.sync(this.horizontalLines, guides.horizontal, (y) => ({ points: [0, y, page.width, y] }));

    layer.batchDraw();
  }

  /** Hides every guide, e.g. once a drag ends. */
  clear(): void {
    for (const line of [...this.verticalLines, ...this.horizontalLines]) {
      line.visible(false);
    }
    this.layer?.batchDraw();
  }

  detach(): void {
    for (const line of [...this.verticalLines, ...this.horizontalLines]) {
      line.destroy();
    }
    this.verticalLines.length = 0;
    this.horizontalLines.length = 0;
    this.layer = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }

  private sync(
    pool: Line[],
    positions: readonly number[],
    pointsFor: (position: number) => { points: number[] },
  ): void {
    const layer = this.layer;
    if (!layer) {
      return;
    }

    positions.forEach((position, index) => {
      let line = pool[index];
      if (!line) {
        line = new Line({
          stroke: readToken('--color-snap-guide', '#ff4d80'),
          strokeWidth: 1,
          strokeScaleEnabled: false,
          listening: false,
          perfectDrawEnabled: false,
        });
        layer.add(line);
        pool.push(line);
      }

      line.setAttrs({ ...pointsFor(position), visible: true });
    });

    for (let index = positions.length; index < pool.length; index++) {
      pool[index].visible(false);
    }
  }
}
