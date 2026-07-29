import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';

import { AddElementCommand } from '../../canvas/commands/add-element.command';
import { CommandBus } from '../../canvas/commands/command-bus.service';
import { LayersPanel } from '../../canvas/components/layers-panel/layers-panel';
import { ElementFactory, InsertKind } from '../../canvas/services/element-factory.service';
import { ImageUploadService } from '../../canvas/services/image-upload.service';
import { CanvasStore } from '../../canvas/state/canvas.store';
import { SelectionStore } from '../../canvas/state/selection.store';
import { AppIcon } from '../../shared/components/app-icon/app-icon';
import { IconName } from '../../shared/components/app-icon/icon-paths';

interface InsertTool {
  readonly kind: InsertKind;
  readonly icon: IconName;
  readonly label: string;
}

/**
 * Left sidebar: the insert tools and the layer list.
 *
 * Inserting goes through the command bus like every other change, so a newly
 * added element is undoable from the moment it appears.
 */
@Component({
  selector: 'app-editor-sidebar',
  imports: [AppIcon, LayersPanel],
  templateUrl: './editor-sidebar.html',
  styleUrl: './editor-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorSidebar {
  private readonly canvas = inject(CanvasStore);
  private readonly factory = inject(ElementFactory);
  private readonly commands = inject(CommandBus);
  private readonly selection = inject(SelectionStore);
  private readonly uploads = inject(ImageUploadService);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly tools: readonly InsertTool[] = [
    { kind: 'text', icon: 'text', label: 'Text' },
    { kind: 'rectangle', icon: 'square', label: 'Rectangle' },
    { kind: 'circle', icon: 'circle', label: 'Circle' },
    { kind: 'divider', icon: 'divider', label: 'Divider' },
  ];

  protected insert(kind: InsertKind): void {
    const element = this.factory.create(kind);
    this.commands.dispatch(new AddElementCommand(this.canvas, element));
    // Selecting what was just added puts the handles and the properties panel
    // straight onto it, which is what makes clicking a tool feel finished.
    this.selection.select(element.id);
  }

  /** The Image tool has no default to place — it opens the file picker instead. */
  protected chooseImage(): void {
    this.fileInput().nativeElement.click();
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }

    const { src, natural } = await this.uploads.load(file);
    const element = this.factory.createImage(src, natural);
    this.commands.dispatch(new AddElementCommand(this.canvas, element));
    this.selection.select(element.id);
  }
}
