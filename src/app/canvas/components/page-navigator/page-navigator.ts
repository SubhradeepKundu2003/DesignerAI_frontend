import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { AddPageCommand } from '../../commands/add-page.command';
import { CommandBus } from '../../commands/command-bus.service';
import { DeletePageCommand } from '../../commands/delete-page.command';
import { DuplicatePageCommand } from '../../commands/duplicate-page.command';
import { RenamePageCommand } from '../../commands/rename-page.command';
import { ReorderPageCommand } from '../../commands/reorder-page.command';
import { Page } from '../../models/canvas-document.model';
import { CanvasElement } from '../../models/canvas-element.model';
import { PageFactory } from '../../services/page-factory.service';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { ViewportStore } from '../../state/viewport.store';
import { AppIcon } from '../../../shared/components/app-icon/app-icon';

/** A cheap CSS approximation of an element, positioned as a % of the page. */
interface Swatch {
  readonly id: string;
  readonly style: Record<string, string>;
  readonly image: string | null;
}

/**
 * Horizontal filmstrip below the canvas: every page in the document, in
 * order, with add/duplicate/delete/rename and drag-to-reorder.
 *
 * Thumbnails are plain positioned `<div>`s scaled to the page's own
 * coordinates rather than a second Konva stage — cheap, and accurate enough at
 * filmstrip size, with real `<img>` tags for image elements (which is what
 * placed infographics are) rather than a flat placeholder swatch.
 */
@Component({
  selector: 'app-page-navigator',
  imports: [AppIcon, NgStyle],
  templateUrl: './page-navigator.html',
  styleUrl: './page-navigator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNavigator {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly viewport = inject(ViewportStore);
  private readonly commands = inject(CommandBus);
  private readonly factory = inject(PageFactory);

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  protected readonly pages = this.canvas.pages;
  protected readonly activeId = computed(() => this.canvas.activePage().id);
  protected readonly canDelete = computed(() => this.canvas.pageCount() > 1);

  protected readonly renamingId = signal<string | null>(null);
  private readonly draggingId = signal<string | null>(null);
  protected readonly dropTargetId = signal<string | null>(null);

  constructor() {
    // Same pattern as the layers panel's rename: the effect focuses whichever
    // row's input just appeared, since only the renaming row has one mounted.
    effect(() => {
      if (this.renamingId() === null) {
        return;
      }
      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected label(page: Page, index: number): string {
    return page.name ?? `Page ${index + 1}`;
  }

  protected swatches(page: Page): readonly Swatch[] {
    return page.elements.map((element) => toSwatch(element, page.width, page.height));
  }

  protected select(id: string): void {
    if (id === this.activeId()) {
      return;
    }
    this.canvas.setActivePage(id);
    this.selection.clear();
    this.viewport.fitToViewport();
  }

  protected addPage(): void {
    const page = this.factory.createBlank();
    const index = this.canvas.activePageIndex() + 1;
    this.commands.dispatch(new AddPageCommand(this.canvas, page, index));
    this.selection.clear();
    this.viewport.fitToViewport();
  }

  protected duplicatePage(page: Page, event: Event): void {
    event.stopPropagation();
    const copy = this.factory.duplicate(page);
    this.commands.dispatch(new DuplicatePageCommand(this.canvas, copy, page.id));
    this.selection.clear();
    this.viewport.fitToViewport();
  }

  protected deletePage(page: Page, event: Event): void {
    event.stopPropagation();
    if (!this.canDelete()) {
      return;
    }
    this.commands.dispatch(new DeletePageCommand(this.canvas, page.id));
    this.selection.clear();
    this.viewport.fitToViewport();
  }

  protected startRename(page: Page, event: Event): void {
    event.stopPropagation();
    this.renamingId.set(page.id);
  }

  protected commitRename(page: Page, index: number, value: string): void {
    this.renamingId.set(null);
    const name = value.trim();
    if (!name || name === this.label(page, index)) {
      return;
    }
    this.commands.dispatch(new RenamePageCommand(this.canvas, page.id, name));
  }

  protected onRenameKeydown(event: KeyboardEvent, page: Page): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    } else if (event.key === 'Escape') {
      const input = event.target as HTMLInputElement;
      input.value = page.name ?? input.value;
      input.blur();
    }
  }

  protected onDragStart(event: DragEvent, id: string): void {
    this.draggingId.set(id);
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, id: string): void {
    const dragging = this.draggingId();
    if (dragging === null || dragging === id) {
      return;
    }
    event.preventDefault();
    this.dropTargetId.set(id);
  }

  protected onDrop(event: DragEvent, id: string): void {
    event.preventDefault();
    const draggedId = this.draggingId();
    this.resetDrag();
    if (!draggedId || draggedId === id) {
      return;
    }

    const toIndex = this.pages().findIndex((page) => page.id === id);
    if (toIndex === -1) {
      return;
    }
    this.commands.dispatch(new ReorderPageCommand(this.canvas, draggedId, toIndex));
  }

  protected onDragEnd(): void {
    this.resetDrag();
  }

  private resetDrag(): void {
    this.draggingId.set(null);
    this.dropTargetId.set(null);
  }
}

function toSwatch(element: CanvasElement, pageWidth: number, pageHeight: number): Swatch {
  const style: Record<string, string> = {
    left: `${(element.x / pageWidth) * 100}%`,
    top: `${(element.y / pageHeight) * 100}%`,
    width: `${(element.width / pageWidth) * 100}%`,
    height: `${(element.height / pageHeight) * 100}%`,
    opacity: `${element.visible ? element.opacity : 0}`,
  };

  switch (element.type) {
    case 'shape':
      return { id: element.id, image: null, style: { ...style, background: element.fill } };
    case 'divider':
      return { id: element.id, image: null, style: { ...style, background: element.stroke } };
    case 'image':
      return { id: element.id, image: element.src, style };
    case 'icon':
      return { id: element.id, image: null, style: { ...style, background: element.fill } };
    case 'frame':
      return {
        id: element.id,
        image: null,
        style: { ...style, background: element.background ?? 'transparent' },
      };
    case 'text':
    default:
      return { id: element.id, image: null, style: { ...style, background: 'var(--color-text-subtle)' } };
  }
}
