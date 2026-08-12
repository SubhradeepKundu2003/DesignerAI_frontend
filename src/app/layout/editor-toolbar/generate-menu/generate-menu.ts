import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';

import { AgentClient } from '../../../canvas/agent/agent-client';
import { AddElementsCommand } from '../../../canvas/commands/add-elements.command';
import { ApplyThemeCommand } from '../../../canvas/commands/apply-theme.command';
import { CommandBus } from '../../../canvas/commands/command-bus.service';
import { CompositeCommand } from '../../../canvas/commands/composite.command';
import { pickNextTheme } from '../../../canvas/data/design-themes';
import { Command } from '../../../canvas/models/commands.model';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { EditorSettingsStore } from '../../../canvas/state/editor-settings.store';
import { IconButton } from '../../../shared/components/icon-button/icon-button';
import { SelectInput, SelectOption } from '../../../shared/components/select-input/select-input';

/** How long the "Generated…" confirmation stays up, matching the toolbar's Save flash. */
const SUMMARY_FLASH_MS = 1600;

/**
 * Toolbar control that turns a prompt into a starter layout on a chosen page —
 * the Generate panel from Track E1. Structured exactly like `ExportMenu`: a
 * toggle button revealing a small flyout, no shared popover primitive to
 * reach for. The actual generation is delegated to `AgentClient` — the real
 * Ollama-backed `HttpAgentClient` (Track E3) by default; nothing here had to
 * change when it replaced the mock behind that same interface.
 */
@Component({
  selector: 'app-generate-menu',
  imports: [IconButton, SelectInput],
  templateUrl: './generate-menu.html',
  styleUrl: './generate-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class GenerateMenu {
  private readonly agentClient = inject(AgentClient);
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly editorSettings = inject(EditorSettingsStore);

  private summaryFlashTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly open = signal(false);
  protected readonly prompt = signal('');
  protected readonly targetPageId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<string | null>(null);

  protected readonly pageOptions = computed<readonly SelectOption[]>(() =>
    this.canvas.pages().map((page, index) => ({
      value: page.id,
      label: page.name ?? `Page ${index + 1}`,
    })),
  );

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.targetPageId.set(this.canvas.activePage().id);
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

  protected setPrompt(value: string): void {
    this.prompt.set(value);
  }

  protected setTargetPage(id: string): void {
    this.targetPageId.set(id);
  }

  protected generate(): void {
    const prompt = this.prompt().trim();
    const pageId = this.targetPageId();
    const page = this.canvas.pages().find((candidate) => candidate.id === pageId);
    if (!prompt || !page || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    // Picked up front so the request's `theme` field and the eventual commit
    // agree — resolved as one dispatch below, alongside `AddElementsCommand`,
    // so "Generate" still costs exactly one undo step even when it also
    // rotates the colour theme.
    const nextTheme = this.editorSettings.autoVaryTheme() ? pickNextTheme(this.canvas.theme()) : this.canvas.theme();

    this.agentClient
      .generate({
        prompt,
        page: { id: page.id, width: page.width, height: page.height },
        theme: nextTheme,
      })
      .subscribe({
        next: (result) => {
          if (page.id !== this.canvas.activePage().id) {
            this.canvas.setActivePage(page.id);
          }
          const steps: Command[] = [];
          if (nextTheme.id !== this.canvas.theme().id) {
            steps.push(new ApplyThemeCommand(this.canvas, nextTheme));
          }
          steps.push(new AddElementsCommand(this.canvas, result.elements));
          this.commands.dispatch(steps.length > 1 ? new CompositeCommand(steps, 'Generate design') : steps[0]);
          this.busy.set(false);
          this.prompt.set('');
          this.flashSummary(result.summary);
          this.close();
        },
        error: () => {
          this.busy.set(false);
          this.error.set('Could not generate a design. Try again.');
        },
      });
  }

  private flashSummary(message: string): void {
    this.summary.set(message);
    clearTimeout(this.summaryFlashTimer);
    this.summaryFlashTimer = setTimeout(() => this.summary.set(null), SUMMARY_FLASH_MS);
  }
}
