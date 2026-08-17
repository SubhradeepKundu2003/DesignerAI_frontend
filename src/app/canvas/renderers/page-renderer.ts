import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Rect } from 'konva/lib/shapes/Rect';

import { Page } from '../models/canvas-document.model';
import { PAGE_MARGIN } from '../models/editor-config';
import { readToken } from '../utils/theme.util';

/** What this renderer draws: the sheet itself, never the elements on it. */
export type PageSurface = Pick<Page, 'width' | 'height' | 'background'>;

export interface PageView {
  /** Current stage scale, used to keep chrome a constant size on screen. */
  zoom: number;
  marginsVisible: boolean;
}

/**
 * Page lift, in screen px — divided by the zoom before it reaches Konva.
 * Black (not a tinted navy) per the guideline's "black offers maximum
 * contrast" colour principle; blur/offset widened and opacity lightened
 * versus a tight shadow so the page reads as gently lifted rather than
 * pasted on with a hard edge.
 */
const SHADOW = {
  color: '#000000',
  blur: 32,
  offsetY: 8,
  opacity: 0.16,
} as const;

/**
 * Draws the paper: the white sheet with its drop shadow, and the dashed
 * safe-area outline inset by the page margin.
 *
 * Stateless with respect to the document — it is told what the page looks like
 * and reflects it, which is the same contract every element renderer follows.
 */
@Injectable()
export class PageRenderer implements OnDestroy {
  private sheet: Rect | null = null;
  private safeArea: Rect | null = null;

  /** Creates the page nodes on `layer`. Call once, when the stage is mounted. */
  attach(layer: Konva.Layer): void {
    this.detach();

    this.sheet = new Rect({
      x: 0,
      y: 0,
      shadowColor: SHADOW.color,
      shadowOpacity: SHADOW.opacity,
      perfectDrawEnabled: false,
    });

    this.safeArea = new Rect({
      stroke: readToken('--color-margin-guide', '#a9c2e2'),
      strokeWidth: 1,
      // Guides are chrome, not artwork: keep them hairline-thin at any zoom.
      // Konva strokes these with the transform reset, so the dash is screen px too.
      strokeScaleEnabled: false,
      dash: [4, 4],
      perfectDrawEnabled: false,
    });

    layer.add(this.sheet, this.safeArea);
  }

  /** Reflects `page` and the current view onto the nodes. */
  render(page: PageSurface, view: PageView): void {
    const { sheet, safeArea } = this;
    if (!sheet || !safeArea) {
      return;
    }

    sheet.setAttrs({
      width: page.width,
      height: page.height,
      fill: page.background,
      // Konva multiplies shadows by the absolute scale, so the sheet would gain
      // a huge blur when zoomed in. Dividing it out keeps the lift constant.
      shadowBlur: SHADOW.blur / view.zoom,
      shadowOffsetY: SHADOW.offsetY / view.zoom,
    });

    safeArea.setAttrs({
      x: PAGE_MARGIN,
      y: PAGE_MARGIN,
      width: Math.max(page.width - PAGE_MARGIN * 2, 0),
      height: Math.max(page.height - PAGE_MARGIN * 2, 0),
      visible: view.marginsVisible,
    });

    sheet.getLayer()?.batchDraw();
  }

  detach(): void {
    this.sheet?.destroy();
    this.safeArea?.destroy();
    this.sheet = null;
    this.safeArea = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }
}
