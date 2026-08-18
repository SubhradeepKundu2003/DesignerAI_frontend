import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { AgentClient } from '../../../canvas/agent/agent-client';
import { ExtractedImage } from '../../../canvas/agent/document-generate.model';
import { AddPageCommand } from '../../../canvas/commands/add-page.command';
import { ApplyThemeCommand } from '../../../canvas/commands/apply-theme.command';
import { CommandBus } from '../../../canvas/commands/command-bus.service';
import { CompositeCommand } from '../../../canvas/commands/composite.command';
import { Command } from '../../../canvas/models/commands.model';
import { ImageElement } from '../../../canvas/models/canvas-element.model';
import { Page } from '../../../canvas/models/canvas-document.model';
import { DesignTheme } from '../../../canvas/models/design-theme.model';
import { PAGE_MARGIN } from '../../../canvas/models/editor-config';
import { TCS_CORPORATE, pickNextTheme } from '../../../canvas/data/design-themes';
import { AssembledPage, NewsletterAssembler } from '../../../canvas/services/newsletter-assembler.service';
import { ImageUploadService } from '../../../canvas/services/image-upload.service';
import { PageFactory } from '../../../canvas/services/page-factory.service';
import { PersistenceService } from '../../../canvas/services/persistence.service';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { EditorSettingsStore } from '../../../canvas/state/editor-settings.store';
import { generateId } from '../../../canvas/utils/id.util';
import { ProjectApiService } from '../../../core/services/project-api.service';
import { IconButton } from '../../../shared/components/icon-button/icon-button';

/** How long the "Added N pages…" confirmation stays up, matching `GenerateMenu`'s flash. */
const SUMMARY_FLASH_MS = 2400;

const ACCEPTED_EXTENSIONS = '.md,.markdown,.txt,.pdf,.docx';

/** Vertical gap between stacked extracted-picture placeholders, matching `PAGE_MARGIN`'s scale. */
const IMAGE_STACK_GAP = 16;
/** Caps how tall a single extracted picture is drawn, so a very tall/thin
 * source image doesn't dominate the whole placeholder page. */
const MAX_EXTRACTED_IMAGE_HEIGHT = 320;

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
  private readonly persistence = inject(PersistenceService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly imageUploads = inject(ImageUploadService);
  private readonly pageFactory = inject(PageFactory);
  protected readonly editorSettings = inject(EditorSettingsStore);

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

    // Resolved up front, same as `GenerateMenu`, and folded into the same
    // `buildInsertPagesCommand` `CompositeCommand` below rather than dispatched
    // separately, so "Generate…" still costs exactly one undo step. Branded
    // mode pins the theme the same way `GenerateMenu` does.
    const nextTheme = this.canvas.branded()
      ? TCS_CORPORATE
      : this.editorSettings.autoVaryTheme()
        ? pickNextTheme(this.canvas.theme())
        : this.canvas.theme();

    const projectId = this.persistence.currentProjectId() ?? undefined;

    this.agentClient.generateFromDocument({ file, theme: nextTheme, projectId }).subscribe({
      next: async (result) => {
        const pages = this.assembler.assemble(result, nextTheme);
        // Captured before insertion -- new pages are appended after whatever
        // already exists, so a warning's page number must be offset by this
        // to match what the page navigator actually shows the user.
        const existingPageCount = this.canvas.pageCount();
        const picturesPage = await this.buildExtractedImagesPage(result.images ?? []);
        const retheme = nextTheme.id !== this.canvas.theme().id ? nextTheme : undefined;
        this.commands.dispatch(buildInsertPagesCommand(this.canvas, pages, picturesPage, retheme));
        this.busy.set(false);
        this.file.set(null);
        this.flashSummary(summaryFor(file.name, pages, existingPageCount, picturesPage !== null));
        this.close();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Could not generate a newsletter from that document. Try again.');
      },
    });
  }

  /**
   * Pictures the backend extracted from the document (`result.images`) land
   * on one extra page appended after the generated content, laid out as a
   * simple vertical stack -- not placed inside any generated page. Where a
   * picture belongs in the newsletter is a design judgment this pipeline
   * doesn't try to automate (same reasoning `NewsletterAssembler` applies to
   * infographic placement); the user drags each one wherever it fits.
   */
  private async buildExtractedImagesPage(images: readonly ExtractedImage[]): Promise<Page | null> {
    if (images.length === 0) {
      return null;
    }

    const page = this.pageFactory.createBlank();
    const contentWidth = page.width - PAGE_MARGIN * 2;
    let y = PAGE_MARGIN;

    const elements: ImageElement[] = [];
    for (const image of images) {
      const url = this.projectApi.assetUrl(image.id);
      const { natural } = await this.imageUploads.loadFromUrl(url);
      const scale = Math.min(
        contentWidth / Math.max(natural.width, 1),
        MAX_EXTRACTED_IMAGE_HEIGHT / Math.max(natural.height, 1),
        1,
      );
      const width = Math.round(natural.width * scale);
      const height = Math.round(natural.height * scale);

      elements.push({
        id: generateId(),
        name: `Extracted image ${elements.length + 1}`,
        type: 'image',
        src: url,
        x: PAGE_MARGIN,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
      });
      y += height + IMAGE_STACK_GAP;
    }

    return { ...page, name: 'Pictures from document', elements };
  }

  private flashSummary(message: string): void {
    this.summary.set(message);
    clearTimeout(this.summaryFlashTimer);
    this.summaryFlashTimer = setTimeout(() => this.summary.set(null), SUMMARY_FLASH_MS);
  }
}

function buildInsertPagesCommand(
  canvas: CanvasStore,
  pages: readonly AssembledPage[],
  picturesPage: Page | null,
  retheme: DesignTheme | undefined,
): CompositeCommand {
  // `assembled.page` already carries its own final `elements`/`groups` (see
  // `NewsletterAssembler.finishPage`'s `{ ...page, elements, groups }`) --
  // same "page arrives fully populated" shape `PageFactory.duplicate()`
  // produces, inserted whole via `insertPage`. A separate `AddElementsCommand`/
  // `AddGroupCommand` per page used to run right after, which re-inserted
  // those same elements/groups a second time onto the page that already had
  // them -- every generated page's content was silently doubled in storage.
  // `AddPageCommand` alone (its `undo` removes the whole page, contents and
  // all, via `CanvasStore.removePage`) is the complete step.
  const commands: Command[] = [];
  if (retheme) {
    // Applied first so it recolours whatever already exists in the document
    // before the freshly-generated pages (already built against `retheme`,
    // see `generate()`) land on top -- still one undo step overall.
    commands.push(new ApplyThemeCommand(canvas, retheme));
  }
  commands.push(...pages.map((assembled) => new AddPageCommand(canvas, assembled.page)));
  if (picturesPage) {
    // Same single undo step as the generated content -- undoing "Generate…"
    // should remove the extracted-pictures page too, not leave it orphaned.
    commands.push(new AddPageCommand(canvas, picturesPage));
  }
  return new CompositeCommand(commands, `Generate ${pages.length} page${pages.length === 1 ? '' : 's'} from document`);
}

function summaryFor(
  fileName: string,
  pages: readonly AssembledPage[],
  existingPageCount: number,
  hasPicturesPage: boolean,
): string {
  const pageCount = `${pages.length} page${pages.length === 1 ? '' : 's'}`;
  const picturesNote = hasPicturesPage ? ' + a page of pictures from the document' : '';
  const firstWarningPage = pages.findIndex((page) => page.warnings.length > 0);
  if (firstWarningPage === -1) {
    return `Generated ${pageCount} from "${fileName}"${picturesNote}`;
  }

  // Name the first concrete finding rather than just a count -- content/design
  // guardrail messages (`SectionPlan.warnings`) are meant to be actionable.
  // The page number is offset by what already existed, so it matches the
  // page navigator the user is looking at, not this batch's own indexing.
  const detail = pages[firstWarningPage].warnings[0];
  const warningCount = pages.filter((page) => page.warnings.length > 0).length;
  const more = warningCount > 1 ? ` (+${warningCount - 1} more)` : '';
  return `Generated ${pageCount} from "${fileName}"${picturesNote} — Page ${existingPageCount + firstWarningPage + 1}: ${detail}${more}`;
}
