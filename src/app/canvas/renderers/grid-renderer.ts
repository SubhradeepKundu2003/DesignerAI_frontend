import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';

import { GRID_SIZE } from '../models/editor-config';
import { Size } from '../models/geometry.model';
import { readToken } from '../utils/theme.util';

export interface GridView {
  visible: boolean;
}

/**
 * Draws the background grid: one cached `Konva.Shape` tracing every line in a
 * single `sceneFunc`, rather than a node per row and column, so toggling or
 * resizing it costs one redraw regardless of the page size.
 *
 * Lives on the page layer, alongside {@link PageRenderer}; `listening(false)`
 * keeps it out of hit testing the same way the safe-area guide is.
 */
@Injectable()
export class GridRenderer implements OnDestroy {
  private grid: Konva.Shape | null = null;
  private size: Size = { width: 0, height: 0 };

  attach(layer: Konva.Layer): void {
    this.detach();

    this.grid = new Konva.Shape({
      stroke: readToken('--color-grid-line', '#e6e6e6'),
      strokeWidth: 1,
      // A grid line stays a hairline at any zoom; Konva would otherwise scale
      // it thicker as the stage scale grows.
      strokeScaleEnabled: false,
      listening: false,
      perfectDrawEnabled: false,
      sceneFunc: (context, shape) => this.draw(context, shape),
    });

    layer.add(this.grid);
  }

  /** Reflects the page size and visibility onto the grid. */
  render(page: Size, view: GridView): void {
    if (!this.grid) {
      return;
    }

    this.size = { width: page.width, height: page.height };
    this.grid.setAttrs({ width: page.width, height: page.height, visible: view.visible });
    this.grid.getLayer()?.batchDraw();
  }

  detach(): void {
    this.grid?.destroy();
    this.grid = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }

  private draw(context: Konva.Context, shape: Konva.Shape): void {
    const { width, height } = this.size;

    context.beginPath();
    for (let x = GRID_SIZE; x < width; x += GRID_SIZE) {
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    for (let y = GRID_SIZE; y < height; y += GRID_SIZE) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }
    context.strokeShape(shape);
  }
}
