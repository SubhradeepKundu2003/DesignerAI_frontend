import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { UpdateElementCommand } from '../../../commands/update-element.command';
import { CommandBus } from '../../../commands/command-bus.service';
import { ImageElement } from '../../../models/canvas-element.model';
import { ImageUploadService } from '../../../services/image-upload.service';
import { CanvasStore } from '../../../state/canvas.store';
import { AppIcon } from '../../../../shared/components/app-icon/app-icon';
import { PanelSection } from '../../../../shared/components/panel-section/panel-section';

/**
 * The properties panel form for `ImageElement`.
 *
 * There is only one thing to change beyond the common block: the picture
 * itself. Replacing keeps the box the user positioned and sized — patching
 * `src` alone, rather than re-fitting — so swapping a photo never reflows the
 * layout around it.
 */
@Component({
  selector: 'app-image-properties',
  imports: [PanelSection, AppIcon],
  templateUrl: './image-properties.html',
  styleUrl: './image-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageProperties {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly uploads = inject(ImageUploadService);

  readonly element = input.required<ImageElement>();
  readonly disabled = input(false);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected chooseReplacement(): void {
    this.fileInput().nativeElement.click();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (!file) {
      return;
    }

    const { src } = await this.uploads.load(file);
    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, this.element().id, { src }, { label: 'Replace image' }),
    );
  }
}
