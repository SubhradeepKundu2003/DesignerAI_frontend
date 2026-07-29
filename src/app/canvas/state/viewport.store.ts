import { Injectable, computed, signal } from '@angular/core';

import { PAGE_SIZE, PAN_OVERSCROLL_LIMIT, ZOOM } from '../models/editor-config';
import { Viewport } from '../models/editor-settings.model';
import { Point, Size } from '../models/geometry.model';

/**
 * The stage transform: how the page is scaled and positioned inside the grey
 * workspace. Held apart from the document because panning and zooming change
 * what the user sees, never what the newsletter *is* — so these are not
 * undoable and never persisted with the document.
 */
@Injectable({ providedIn: 'root' })
export class ViewportStore {
  private readonly state = signal<Viewport>({ zoom: 1, panX: 0, panY: 0 });

  /** Size of the scrollable workspace in screen px, reported by the canvas host. */
  private readonly viewport = signal<Size>({ width: 0, height: 0 });

  /** Size of the content being framed — the active page. */
  private readonly content = signal<Size>({ ...PAGE_SIZE });

  readonly transform = this.state.asReadonly();
  readonly viewportSize = this.viewport.asReadonly();
  readonly contentSize = this.content.asReadonly();

  readonly zoom = computed(() => this.state().zoom);
  readonly panX = computed(() => this.state().panX);
  readonly panY = computed(() => this.state().panY);

  /** Zoom as a rounded percentage, for the toolbar and zoom bar. */
  readonly zoomPercent = computed(() => Math.round(this.state().zoom * 100));

  readonly canZoomIn = computed(() => this.state().zoom < ZOOM.max - 1e-6);
  readonly canZoomOut = computed(() => this.state().zoom > ZOOM.min + 1e-6);

  setViewportSize(size: Size): void {
    this.viewport.set({ ...size });
  }

  setContentSize(size: Size): void {
    this.content.set({ ...size });
  }

  /** Sets an absolute zoom level, keeping the viewport centre fixed. */
  setZoom(zoom: number): void {
    const { width, height } = this.viewport();
    this.zoomAt(clampZoom(zoom), { x: width / 2, y: height / 2 });
  }

  zoomIn(): void {
    this.setZoom(this.state().zoom * ZOOM.buttonStep);
  }

  zoomOut(): void {
    this.setZoom(this.state().zoom / ZOOM.buttonStep);
  }

  /** Mouse-wheel zoom: `direction` is -1 for zoom in, +1 for zoom out. */
  zoomByWheel(direction: number, pointer: Point): void {
    const factor = direction < 0 ? ZOOM.wheelStep : 1 / ZOOM.wheelStep;
    this.zoomAt(clampZoom(this.state().zoom * factor), pointer);
  }

  /**
   * Zooms to `zoom` while keeping the world point currently under `pointer`
   * (a position in screen px, relative to the stage) anchored in place.
   */
  zoomAt(zoom: number, pointer: Point): void {
    const current = this.state();
    const next = clampZoom(zoom);
    if (next === current.zoom) {
      return;
    }

    const worldX = (pointer.x - current.panX) / current.zoom;
    const worldY = (pointer.y - current.panY) / current.zoom;

    this.commit({
      zoom: next,
      panX: pointer.x - worldX * next,
      panY: pointer.y - worldY * next,
    });
  }

  panBy(deltaX: number, deltaY: number): void {
    const current = this.state();
    this.commit({
      ...current,
      panX: current.panX + deltaX,
      panY: current.panY + deltaY,
    });
  }

  /** Scales the page to fit the viewport with padding, and centres it. */
  fitToViewport(): void {
    const viewport = this.viewport();
    const content = this.content();
    if (viewport.width === 0 || viewport.height === 0) {
      return;
    }

    const available = {
      width: Math.max(viewport.width - ZOOM.fitPadding * 2, 1),
      height: Math.max(viewport.height - ZOOM.fitPadding * 2, 1),
    };
    const zoom = clampZoom(
      Math.min(available.width / content.width, available.height / content.height),
    );

    this.commit({
      zoom,
      panX: (viewport.width - content.width * zoom) / 2,
      panY: (viewport.height - content.height * zoom) / 2,
    });
  }

  /** Resets to 100% with the page centred. */
  resetZoom(): void {
    const viewport = this.viewport();
    const content = this.content();
    this.commit({
      zoom: 1,
      panX: (viewport.width - content.width) / 2,
      panY: (viewport.height - content.height) / 2,
    });
  }

  private commit(next: Viewport): void {
    this.state.set(this.clampPan(next));
  }

  /**
   * Keeps the page reachable. This is a page editor, not an infinite canvas, so
   * the page may never be flung entirely out of view: at least
   * `PAN_OVERSCROLL_LIMIT` px of it stays inside the workspace on every side.
   */
  private clampPan(next: Viewport): Viewport {
    const viewport = this.viewport();
    if (viewport.width === 0 || viewport.height === 0) {
      return next;
    }

    const content = this.content();
    const scaled = {
      width: content.width * next.zoom,
      height: content.height * next.zoom,
    };
    const slack = {
      x: Math.min(PAN_OVERSCROLL_LIMIT, scaled.width),
      y: Math.min(PAN_OVERSCROLL_LIMIT, scaled.height),
    };

    return {
      zoom: next.zoom,
      panX: clamp(next.panX, slack.x - scaled.width, viewport.width - slack.x),
      panY: clamp(next.panY, slack.y - scaled.height, viewport.height - slack.y),
    };
  }
}

function clampZoom(zoom: number): number {
  return clamp(zoom, ZOOM.min, ZOOM.max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
