import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { ExportPageRange, ExportService } from '../../../canvas/services/export.service';
import { IconButton } from '../../../shared/components/icon-button/icon-button';
import { SelectInput, SelectOption } from '../../../shared/components/select-input/select-input';

type ExportFormat = 'pdf' | 'pptx' | 'png';

const FORMAT_OPTIONS: readonly SelectOption<ExportFormat>[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'pptx', label: 'PowerPoint (.pptx)' },
  { value: 'png', label: 'PNG' },
];

const RANGE_OPTIONS: readonly SelectOption<ExportPageRange>[] = [
  { value: 'all', label: 'All pages' },
  { value: 'current', label: 'Current page' },
];

/**
 * Toolbar control for exporting the design as PDF, PPTX or PNG — a toggle
 * button revealing a small format/page-range panel. There is no shared
 * popover primitive in the app yet (only a flat native `<select>` exists, for
 * the theme picker), so this owns its own open/close state rather than
 * reaching for one.
 */
@Component({
  selector: 'app-export-menu',
  imports: [IconButton, SelectInput],
  templateUrl: './export-menu.html',
  styleUrl: './export-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class ExportMenu {
  private readonly exportService = inject(ExportService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly formatOptions = FORMAT_OPTIONS;
  protected readonly rangeOptions = RANGE_OPTIONS;

  protected readonly open = signal(false);
  protected readonly format = signal<ExportFormat>('pdf');
  protected readonly range = signal<ExportPageRange>('all');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

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

  protected setFormat(value: ExportFormat): void {
    this.format.set(value);
  }

  protected setRange(value: ExportPageRange): void {
    this.range.set(value);
  }

  protected async runExport(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.dispatchExport(this.format(), this.range());
      this.close();
    } catch {
      this.error.set('Could not export this design.');
    } finally {
      this.busy.set(false);
    }
  }

  private dispatchExport(format: ExportFormat, range: ExportPageRange): Promise<void> {
    switch (format) {
      case 'pdf':
        return this.exportService.exportPdf(range);
      case 'pptx':
        return this.exportService.exportPptx(range);
      case 'png':
        return this.exportService.exportPng(range);
    }
  }
}
