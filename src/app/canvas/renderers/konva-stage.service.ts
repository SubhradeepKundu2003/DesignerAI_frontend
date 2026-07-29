import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';

import { Viewport } from '../models/editor-settings.model';
import { Size } from '../models/geometry.model';

/**
 * The stage layers, in paint order.
 *
 * Separating them is what keeps editing cheap: moving an element redraws the
 * content layer only, and the transformer never forces the page to repaint.
 */
export interface StageLayers {
  /** Page sheet, margins and (later) the grid. Never hit-tested. */
  readonly page: Konva.Layer;
  /** One node per canvas element. */
  readonly content: Konva.Layer;
  /** Transformer handles, selection outline and alignment guides. */
  readonly overlay: Konva.Layer;
}

/**
 * Owns the Konva stage: its lifetime, its size, its layers and the viewport
 * transform applied to it.
 *
 * Provided by the workspace component rather than in root — one stage belongs
 * to one host element, and it must die with it. Every method is a no-op before
 * {@link mount} and after {@link destroy}, so effects may call them freely
 * without caring whether the view has been created yet.
 */
@Injectable()
export class KonvaStageService implements OnDestroy {
  private stage: Konva.Stage | null = null;
  private stageLayers: StageLayers | null = null;
  private pixelRatioQuery: MediaQueryList | null = null;

  /** The layers, or `null` while unmounted. */
  get layers(): StageLayers | null {
    return this.stageLayers;
  }

  /** Creates the stage inside `container`. Replaces any stage already there. */
  mount(container: HTMLDivElement, size: Size): StageLayers {
    this.destroy();

    const stage = new Konva.Stage({
      container,
      width: size.width,
      height: size.height,
    });

    const layers: StageLayers = {
      // The page is chrome, not content: excluding it from hit testing keeps
      // clicks on empty space cheap and lets them fall through to the stage.
      page: new Konva.Layer({ listening: false }),
      content: new Konva.Layer(),
      overlay: new Konva.Layer(),
    };
    stage.add(layers.page, layers.content, layers.overlay);

    this.stage = stage;
    this.stageLayers = layers;
    this.watchPixelRatio();

    return layers;
  }

  /** Resizes the stage to the workspace, in screen px. */
  resize(size: Size): void {
    this.stage?.size({ width: size.width, height: size.height });
  }

  /** Applies the viewport: zoom becomes stage scale, pan becomes position. */
  setTransform({ zoom, panX, panY }: Viewport): void {
    const stage = this.stage;
    if (!stage) {
      return;
    }

    stage.scale({ x: zoom, y: zoom });
    stage.position({ x: panX, y: panY });
    stage.batchDraw();
  }

  destroy(): void {
    this.disposePixelRatioWatch();
    this.stage?.destroy();
    this.stage = null;
    this.stageLayers = null;
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * Konva samples the device pixel ratio once, when a canvas is created, so a
   * window moved to a different-density monitor (or a browser zoom change)
   * would leave the page soft until something recreated the stage. Watching the
   * resolution media query and re-sizing the canvases keeps it crisp instead.
   */
  private watchPixelRatio(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this.pixelRatioQuery = window.matchMedia(`(resolution: ${pixelRatio()}dppx)`);
    this.pixelRatioQuery.addEventListener('change', this.onPixelRatioChange);
  }

  private readonly onPixelRatioChange = (): void => {
    const stage = this.stage;
    if (!stage) {
      return;
    }

    const ratio = pixelRatio();
    for (const layer of stage.getLayers()) {
      layer.getCanvas().setPixelRatio(ratio);
    }
    stage.batchDraw();

    // The query only fires for the ratio it was created with; re-arm for the new one.
    this.disposePixelRatioWatch();
    this.watchPixelRatio();
  };

  private disposePixelRatioWatch(): void {
    this.pixelRatioQuery?.removeEventListener('change', this.onPixelRatioChange);
    this.pixelRatioQuery = null;
  }
}

function pixelRatio(): number {
  return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
}
