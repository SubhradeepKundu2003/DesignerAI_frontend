import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { AgentClient } from '../../../canvas/agent/agent-client';
import { AddElementsCommand } from '../../../canvas/commands/add-elements.command';
import { AddGroupCommand } from '../../../canvas/commands/add-group.command';
import { AddPageCommand } from '../../../canvas/commands/add-page.command';
import { CommandBus } from '../../../canvas/commands/command-bus.service';
import { CompositeCommand } from '../../../canvas/commands/composite.command';
import { Command } from '../../../canvas/models/commands.model';
import { AssembledPage, NewsletterAssembler } from '../../../canvas/services/newsletter-assembler.service';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { IconButton } from '../../../shared/components/icon-button/icon-button';

/** How long the "Added N pages…" confirmation stays up, matching `GenerateMenu`'s flash. */
const SUMMARY_FLASH_MS = 2400;

const ACCEPTED_EXTENSIONS = '.md,.markdown,.txt,.pdf,.docx';

/**
 * Toolbar control that turns a whole uploaded document into a multi-page
 * newsletter — the document-to-newsletter architecture's UI entry point,
 * alongside the existing prompt-based `GenerateMenu`. Delegates content
 * generation to `AgentClient.generateFromDocument()` (backend: section
 * extraction + per-page LLM calls, content only) and positioning/templating/
 * verification entirely to `NewsletterAssembler` (frontend: template
 * matching, content parameterization, lint-repair) before committing every
 * generated page in one undo step.
 */
@Component({
  selector: 'app-generate-document-menu',
  imports: [IconButton],
  templateUrl: './generate-document-menu.html',
  styleUrl: './generate-document-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class GenerateDocumentMenu {
  private readonly agentClient = inject(AgentClient);
  private readonly assembler = inject(NewsletterAssembler);
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly acceptedExtensions = ACCEPTED_EXTENSIONS;

  protected readonly open = signal(false);
  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<string | null>(null);

  private summaryFlashTimer: ReturnType<typeof setTimeout> | undefined;

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.error.set(null);
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected pickFile(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (selected) {
      this.file.set(selected);
      this.error.set(null);
    }
  }

  protected generate(): void {
    const file = this.file();
    if (!file || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.agentClient.generateFromDocument({ file, theme: this.canvas.theme() }).subscribe({
      next: (result) => {
        const pages = this.assembler.assemble(result, this.canvas.theme());
        this.commands.dispatch(buildInsertPagesCommand(this.canvas, pages));
        this.busy.set(false);
        this.file.set(null);
        this.flashSummary(summaryFor(file.name, pages));
        this.close();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not generate a newsletter from that document. Try again.');
      },
    });
  }

  private flashSummary(message: string): void {
    this.summary.set(message);
    clearTimeout(this.summaryFlashTimer);
    this.summaryFlashTimer = setTimeout(() => this.summary.set(null), SUMMARY_FLASH_MS);
  }
}

function buildInsertPagesCommand(canvas: CanvasStore, pages: readonly AssembledPage[]): CompositeCommand {
  const commands: Command[] = [];
  for (const assembled of pages) {
    commands.push(new AddPageCommand(canvas, assembled.page));
    if (assembled.elements.length > 0) {
      commands.push(new AddElementsCommand(canvas, assembled.elements));
    }
    for (const group of assembled.groups) {
      commands.push(new AddGroupCommand(canvas, group));
    }
  }
  return new CompositeCommand(commands, `Generate ${pages.length} page${pages.length === 1 ? '' : 's'} from document`);
}

function summaryFor(fileName: string, pages: readonly AssembledPage[]): string {
  const pageCount = `${pages.length} page${pages.length === 1 ? '' : 's'}`;
  const warningCount = pages.filter((page) => page.warnings.length > 0).length;
  const caveat = warningCount > 0 ? ` — ${warningCount} may need a look` : '';
  return `Generated ${pageCount} from "${fileName}"${caveat}`;
}
