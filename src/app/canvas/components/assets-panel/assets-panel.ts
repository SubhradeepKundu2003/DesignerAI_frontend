import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AddElementCommand } from '../../commands/add-element.command';
import { AddElementsCommand } from '../../commands/add-elements.command';
import { AddGroupCommand } from '../../commands/add-group.command';
import { CommandBus } from '../../commands/command-bus.service';
import { CompositeCommand } from '../../commands/composite.command';
import { INFOGRAPHIC_TEMPLATES } from '../../data/templates';
import { INFOGRAPHICS, InfographicAsset } from '../../data/infographics.manifest';
import { InfographicTemplate } from '../../models/infographic-template.model';
import { PAGE_MARGIN } from '../../models/editor-config';
import { ElementFactory } from '../../services/element-factory.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { buildTemplatePlacement } from '../../utils/template-placement.util';

/**
 * The Assets tab: a searchable library, click to place on the page.
 *
 * Two kinds of asset, both undoable through the command bus:
 * - Templates: hand-built layouts (`INFOGRAPHIC_TEMPLATES`) whose copy is
 *   real `TextElement`s — editable and AI-rewritable — with only the
 *   genuinely-vector parts (wheels, icons) as decorative SVG images.
 * - Images: the flattened PNG library (`INFOGRAPHICS`) — placed the same way
 *   a manual upload is, as a single ordinary `ImageElement`.
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

  protected readonly templates = computed<readonly InfographicTemplate[]>(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return INFOGRAPHIC_TEMPLATES;
    }
    return INFOGRAPHIC_TEMPLATES.filter(
      (template) =>
        template.label.toLowerCase().includes(term) ||
        template.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
  });

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

  /**
   * A template's parts land as one {@link GroupElement} rather than loose
   * elements — it should move, delete and duplicate as the single infographic
   * it visually reads as, not as N independent parts the user has to
   * shift-click back together.
   */
  protected placeTemplate(template: InfographicTemplate): void {
    if (this.placingId()) {
      return;
    }
    const page = this.canvas.activePage();
    const origin = {
      x: Math.round(Math.max(page.width - template.size.width, 0) / 2),
      y: Math.round(Math.max((page.height - template.size.height) / 2, PAGE_MARGIN)),
    };
    const { elements, group } = buildTemplatePlacement(template, origin);

    if (!group) {
      this.commands.dispatch(new AddElementsCommand(this.canvas, elements));
      this.selection.selectMany(elements.map((element) => element.id));
      return;
    }

    this.commands.dispatch(
      new CompositeCommand(
        [new AddElementsCommand(this.canvas, elements), new AddGroupCommand(this.canvas, group)],
        `Add ${template.label}`,
      ),
    );
    this.selection.select(group.id);
  }

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
