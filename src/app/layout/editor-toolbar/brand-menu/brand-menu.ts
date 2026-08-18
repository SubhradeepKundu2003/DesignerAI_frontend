import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { CommandBus } from '../../../canvas/commands/command-bus.service';
import { SetBrandedModeCommand } from '../../../canvas/commands/set-branded-mode.command';
import { BrandAssetsStore, BrandLogoSlot } from '../../../canvas/state/brand-assets.store';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { IconButton } from '../../../shared/components/icon-button/icon-button';

interface LogoSlotOption {
  readonly slot: BrandLogoSlot;
  readonly label: string;
}

const SLOTS: readonly LogoSlotOption[] = [
  { slot: 'tcsBlack', label: 'TCS — black' },
  { slot: 'tcsWhite', label: 'TCS — white' },
  { slot: 'tataBlack', label: 'TATA — black' },
  { slot: 'tataWhite', label: 'TATA — white' },
];

/**
 * Toolbar control for TCS/TATA branded mode — structured like `GenerateMenu`:
 * a toggle button revealing a flyout. The flyout holds the document-level
 * on/off switch (`SetBrandedModeCommand`, undoable, brands every existing
 * page in one step — see the command's doc comment) and the 4-slot logo
 * upload UI (`BrandAssetsStore`) so the shipped SVG placeholders can be
 * swapped for the real TCS/TATA files at any time.
 */
@Component({
  selector: 'app-brand-menu',
  imports: [IconButton],
  templateUrl: './brand-menu.html',
  styleUrl: './brand-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class BrandMenu {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly brandAssets = inject(BrandAssetsStore);

  protected readonly slots = SLOTS;
  protected readonly open = signal(false);
  protected readonly branded = this.canvas.branded;

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected toggleBranded(): void {
    this.commands.dispatch(new SetBrandedModeCommand(this.canvas, !this.branded(), this.brandAssets.assets()));
  }

  protected async onFileSelected(event: Event, slot: BrandLogoSlot): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (file) {
      await this.brandAssets.upload(slot, file);
    }
  }

  protected reset(slot: BrandLogoSlot): void {
    this.brandAssets.reset(slot);
  }

  protected srcFor(slot: BrandLogoSlot): string {
    return this.brandAssets.assets()[slot].src;
  }
}
