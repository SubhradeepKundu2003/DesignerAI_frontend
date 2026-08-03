import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AddElementCommand } from '../../commands/add-element.command';
import { CommandBus } from '../../commands/command-bus.service';
import { INFOGRAPHICS, InfographicAsset } from '../../data/infographics.manifest';
import { ElementFactory } from '../../services/element-factory.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';

/**
 * The Assets tab: a searchable grid of the infographics library, click to
 * place one on the page.
 *
 * Placing goes through the exact path a manual image upload does — probe the
 * natural size, let `ElementFactory` scale it to the safe area, dispatch an
 * `AddElementCommand` — so a placed infographic is just an ordinary,
 * undoable, resizable `ImageElement`.
 */
@Component({
  selector: 'app-assets-panel',
  templateUrl: './assets-panel.html',
  styleUrl: './assets-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsPanel {
  private readonly canvas = inject(CanvasStore);
  private readonly factory = inject(ElementFactory);
  private readonly commands = inject(CommandBus);
  private readonly selection = inject(SelectionStore);
  private readonly uploads = inject(ImageUploadService);

  protected readonly query = signal('');
  /** Set while an asset's natural size is being probed, so a double-click can't double-place. */
  protected readonly placingId = signal<string | null>(null);

  protected readonly assets = computed<readonly InfographicAsset[]>(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return INFOGRAPHICS;
    }
    return INFOGRAPHICS.filter(
      (asset) =>
        asset.label.toLowerCase().includes(term) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
  });

  protected async place(asset: InfographicAsset): Promise<void> {
    if (this.placingId()) {
      return;
    }
    this.placingId.set(asset.id);
    try {
      const { src, natural } = await this.uploads.loadFromUrl(asset.file);
      const element = this.factory.createImage(src, natural);
      this.commands.dispatch(new AddElementCommand(this.canvas, element));
      this.selection.select(element.id);
    } finally {
      this.placingId.set(null);
    }
  }
}
