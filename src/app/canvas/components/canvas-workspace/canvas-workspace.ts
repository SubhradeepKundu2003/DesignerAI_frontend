import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { Point, Size } from '../../models/geometry.model';
import { ElementRendererRegistry } from '../../renderers/element-renderer.registry';
import { GridRenderer } from '../../renderers/grid-renderer';
import { GuidesRenderer } from '../../renderers/guides-renderer';
import { KonvaStageService } from '../../renderers/konva-stage.service';
import { PageRenderer } from '../../renderers/page-renderer';
import { Reconciler } from '../../renderers/reconciler';
import { SelectionRenderer } from '../../renderers/selection-renderer';
import { CanvasInteractions } from '../../services/canvas-interaction.service';
import { KeyboardShortcuts } from '../../services/keyboard-shortcuts.service';
import { CanvasStore } from '../../state/canvas.store';
import { EditorSettingsStore } from '../../state/editor-settings.store';
import { SelectionStore } from '../../state/selection.store';
import { TextEditingStore } from '../../state/text-editing.store';
import { ViewportStore } from '../../state/viewport.store';
import { TextEditOverlay } from '../text-edit-overlay/text-edit-overlay';

/**
 * Host for the editing surface.
 *
 * Owns the Konva stage's host element and the input plumbing that drives the
 * viewport — container resize, wheel zoom and drag-to-pan. Everything else is
 * delegated: this component only pushes state into the renderers and lets the
 * interaction service push gestures back out as commands, never the other way
 * round.
 */
@Component({
  selector: 'app-canvas-workspace',
  imports: [TextEditOverlay],
  templateUrl: './canvas-workspace.html',
  styleUrl: './canvas-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    KonvaStageService,
    PageRenderer,
    GridRenderer,
    ElementRendererRegistry,
    Reconciler,
    SelectionRenderer,
    GuidesRenderer,
    CanvasInteractions,
  ],
  host: {
    '(wheel)': 'onWheel($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '[class.is-panning]': 'panPointerId !== null',
    '[class.is-pan-ready]': 'shortcuts.spaceHeld()',
  },
})
export class CanvasWorkspace {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly viewport = inject(ViewportStore);
  private readonly settings = inject(EditorSettingsStore);
  private readonly textEditing = inject(TextEditingStore);
  private readonly stage = inject(KonvaStageService);
  private readonly pageRenderer = inject(PageRenderer);
  private readonly gridRenderer = inject(GridRenderer);
  private readonly reconciler = inject(Reconciler);
  private readonly selectionRenderer = inject(SelectionRenderer);
  private readonly guidesRenderer = inject(GuidesRenderer);
  private readonly interactions = inject(CanvasInteractions);
  protected readonly shortcuts = inject(KeyboardShortcuts);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stageHost = viewChild.required<ElementRef<HTMLDivElement>>('stageHost');

  /** Pointer currently panning the workspace, if any. */
  protected panPointerId: number | null = null;
  private lastPanPoint: Point = { x: 0, y: 0 };
  /** Node last hidden for text editing, so ending it can show that one back. */
  private lastHiddenEditingNodeId: string | null = null;

  constructor() {
    afterNextRender(() => this.mountStage());

    // Pan and zoom only move the stage; nothing on it is redrawn or recreated.
    effect(() => this.applyTransform());
    // The page repaints for zoom (screen-constant chrome) and margin visibility.
    effect(() => this.renderPage());
    effect(() => this.renderElements());
    // Created after the reconcile effect on purpose: effects run in creation
    // order, so the nodes an element added this tick exist by the time the
    // selection — and the editing-visibility toggle below — look for them.
    effect(() => this.renderSelection());
    // The node being edited is drawn by the textarea overlay instead, for as
    // long as editing stays open; a resync (e.g. the commit that ends it)
    // naturally restores its normal visibility.
    effect(() => this.syncEditingVisibility());
    // The viewport frames whatever the page currently is, page size included.
    effect(() => this.viewport.setContentSize(pageSize(this.canvas.activePage())));
  }

  private mountStage(): void {
    const container = this.stageHost().nativeElement;
    const layers = this.stage.mount(container, elementSize(container));

    this.pageRenderer.attach(layers.page);
    this.gridRenderer.attach(layers.page);
    this.reconciler.attach(layers.content);
    this.selectionRenderer.attach(layers.overlay);
    this.guidesRenderer.attach(layers.overlay);

    const stage = layers.content.getStage();
    const transformer = this.selectionRenderer.node;
    if (stage && transformer) {
      this.interactions.attach(stage, layers.content, transformer);
    }

    this.observeSize(container);

    // The effects above ran before the stage existed, so seed it with the
    // current state now; from here on they keep it in step.
    this.applyTransform();
    this.renderPage();
    this.renderElements();
    this.renderSelection();
  }

  private applyTransform(): void {
    this.stage.setTransform(this.viewport.transform());
  }

  private renderPage(): void {
    const page = this.canvas.activePage();
    this.pageRenderer.render(page, {
      zoom: this.viewport.zoom(),
      marginsVisible: this.settings.marginsVisible(),
    });
    this.gridRenderer.render(page, { visible: this.settings.gridVisible() });
  }

  private renderElements(): void {
    this.reconciler.sync(this.canvas.elements());
  }

  private renderSelection(): void {
    // The element being edited keeps its Konva node hidden and its handles
    // off, so the transformer and the textarea are never both on screen.
    const editingId = this.textEditing.editingId();
    const elements = this.selection
      .selectedElements()
      .filter((element) => element.id !== editingId);
    this.selectionRenderer.render(
      elements,
      this.reconciler.nodesFor(elements.map((element) => element.id)),
      this.viewport.zoom(),
    );
  }

  private syncEditingVisibility(): void {
    const id = this.textEditing.editingId();

    if (this.lastHiddenEditingNodeId && this.lastHiddenEditingNodeId !== id) {
      const previous = this.reconciler.nodeFor(this.lastHiddenEditingNodeId);
      previous?.visible(true);
      previous?.getLayer()?.batchDraw();
    }

    const node = id ? this.reconciler.nodeFor(id) : undefined;
    node?.visible(false);
    node?.getLayer()?.batchDraw();

    this.lastHiddenEditingNodeId = id;
  }

  /**
   * Keeps the viewport store and the stage in step with the host's size, and
   * frames the page the first time a real size is known.
   */
  private observeSize(container: HTMLElement): void {
    let framed = false;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.viewport.setViewportSize({ width, height });
      this.stage.resize({ width, height });

      if (!framed && width > 0 && height > 0) {
        framed = true;
        this.viewport.fitToViewport();
      }
    });

    observer.observe(container);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected onWheel(event: WheelEvent): void {
    // Plain scroll (mouse wheel or trackpad) pans, matching Figma/Canva/Slides;
    // Ctrl/Cmd+scroll — which is also how Chrome reports trackpad pinch — zooms.
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      this.viewport.zoomByWheel(Math.sign(event.deltaY), this.toStagePoint(event));
    } else {
      this.viewport.panBy(-event.deltaX, -event.deltaY);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    // Middle button always pans; the left button does too while space is
    // held. Shift belongs to the canvas — it extends the selection — so pan
    // is on space rather than another modifier the canvas already uses.
    const spacePan = event.button === 0 && this.shortcuts.spaceHeld();
    if (event.button !== 1 && !spacePan) {
      return;
    }

    event.preventDefault();
    this.panPointerId = event.pointerId;
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
    this.host.nativeElement.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) {
      return;
    }

    this.viewport.panBy(event.clientX - this.lastPanPoint.x, event.clientY - this.lastPanPoint.y);
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) {
      return;
    }

    this.panPointerId = null;
    this.host.nativeElement.releasePointerCapture(event.pointerId);
  }

  /** Converts a mouse position to stage coordinates (screen px, stage origin). */
  private toStagePoint(event: MouseEvent): Point {
    const bounds = this.stageHost().nativeElement.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
}

function elementSize(element: HTMLElement): Size {
  const { width, height } = element.getBoundingClientRect();
  return { width, height };
}

function pageSize({ width, height }: Size): Size {
  return { width, height };
}
