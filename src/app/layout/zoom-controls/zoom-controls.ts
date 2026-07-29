import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ViewportStore } from '../../canvas/state/viewport.store';
import { IconButton } from '../../shared/components/icon-button/icon-button';

/** Bottom bar: zoom out / in, an editable zoom percentage, and fit-to-page. */
@Component({
  selector: 'app-zoom-controls',
  imports: [IconButton],
  templateUrl: './zoom-controls.html',
  styleUrl: './zoom-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoomControls {
  private readonly viewport = inject(ViewportStore);

  protected readonly zoomPercent = this.viewport.zoomPercent;
  protected readonly canZoomIn = this.viewport.canZoomIn;
  protected readonly canZoomOut = this.viewport.canZoomOut;

  protected zoomIn(): void {
    this.viewport.zoomIn();
  }

  protected zoomOut(): void {
    this.viewport.zoomOut();
  }

  protected fit(): void {
    this.viewport.fitToViewport();
  }

  protected reset(): void {
    this.viewport.resetZoom();
  }

  /** Commits a percentage typed into the zoom field. */
  protected applyTypedZoom(value: string): void {
    const percent = Number.parseFloat(value);
    if (Number.isFinite(percent) && percent > 0) {
      this.viewport.setZoom(percent / 100);
    }
  }
}
