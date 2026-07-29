import { Injectable, OnDestroy, inject } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Text } from 'konva/lib/shapes/Text';
import { Transformer } from 'konva/lib/shapes/Transformer';

import { UpdateElementCommand } from '../commands/update-element.command';
import { CanvasElement, ElementPatch } from '../models/canvas-element.model';
import { CommandBus } from '../commands/command-bus.service';
import { GRID_SIZE, PAGE_MARGIN, SNAP_THRESHOLD } from '../models/editor-config';
import { ElementNode } from '../renderers/element-renderer';
import { GuidesRenderer } from '../renderers/guides-renderer';
import { SnappingService } from './snapping.service';
import { KeyboardShortcuts } from './keyboard-shortcuts.service';
import { CanvasStore } from '../state/canvas.store';
import { EditorSettingsStore } from '../state/editor-settings.store';
import { SelectionStore } from '../state/selection.store';
import { TextEditingStore } from '../state/text-editing.store';
import { ViewportStore } from '../state/viewport.store';

/** Namespace for every listener this service adds, so detaching removes exactly them. */
const NS = '.canvas-interaction';

/**
 * Translates what the user does on the stage into commands.
 *
 * This is the boundary where Konva stops being authoritative. Drag and
 * transform gestures are allowed to move Konva nodes natively — that is
 * what makes them run at 60fps — but nothing is *true* until the gesture ends
 * and a command writes it into the document. The reconciler then redraws from
 * the document, which is what re-establishes the one-way flow.
 *
 * Listeners are delegated to the content layer rather than bound per node:
 * nodes come and go with the reconciler, and delegated handlers do not have to
 * be rebound when they do.
 */
@Injectable()
export class CanvasInteractions implements OnDestroy {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly commands = inject(CommandBus);
  private readonly keyboard = inject(KeyboardShortcuts);
  private readonly textEditing = inject(TextEditingStore);
  private readonly settings = inject(EditorSettingsStore);
  private readonly viewport = inject(ViewportStore);
  private readonly snapping = inject(SnappingService);
  private readonly guides = inject(GuidesRenderer);

  private stage: Konva.Stage | null = null;
  private content: Konva.Layer | null = null;
  private transformer: Transformer | null = null;

  attach(stage: Konva.Stage, content: Konva.Layer, transformer: Transformer): void {
    this.detach();

    this.stage = stage;
    this.content = content;
    this.transformer = transformer;

    // The page layer does not listen, so a click on empty paper — or on the
    // grey around it — arrives here with the stage itself as the target.
    stage.on(`pointerdown${NS}`, (event) => {
      if (event.target === stage && !this.isPanGesture(event.evt)) {
        this.selection.clear();
      }
    });

    // Selection on pointer down, not on click: the same press has to be able to
    // start dragging what it just selected.
    content.on(`pointerdown${NS}`, (event) => this.onElementPointerDown(event));
    content.on(`dragstart${NS}`, (event) => this.onDragStart(event));
    content.on(`dragmove${NS}`, (event) => this.onDragMove(event.target as ElementNode));
    content.on(`dragend${NS}`, (event) => {
      this.commitDrag(event.target as ElementNode);
      this.guides.clear();
    });
    content.on(`dblclick${NS}`, (event) => this.onElementDoubleClick(event));
    transformer.on(`transformend${NS}`, () => this.commitTransform());
  }

  detach(): void {
    this.stage?.off(NS);
    this.content?.off(NS);
    this.transformer?.off(NS);
    this.stage = null;
    this.content = null;
    this.transformer = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }

  private onElementPointerDown(event: Konva.KonvaEventObject<PointerEvent>): void {
    const id = event.target.id();
    if (!id || this.isPanGesture(event.evt)) {
      return;
    }

    if (event.evt.shiftKey) {
      this.selection.toggle(id);
    } else if (!this.selection.isSelected(id)) {
      this.selection.select(id);
    }
  }

  /** A double-click on a text box opens it in the textarea overlay. */
  private onElementDoubleClick(event: Konva.KonvaEventObject<MouseEvent>): void {
    const id = event.target.id();
    const element = this.canvas.elementById(id);
    if (!element || element.type !== 'text' || element.locked) {
      return;
    }

    this.selection.select(id);
    this.textEditing.begin(id);
  }

  private onDragStart(event: Konva.KonvaEventObject<PointerEvent>): void {
    // The middle button — or the left button with space held — pans the
    // workspace; the element under the cursor must not come along for the ride.
    if (this.isPanGesture(event.evt)) {
      (event.target as ElementNode).stopDrag();
    }
  }

  /**
   * Nudges a node still being dragged onto whatever the grid or an alignment
   * guide offers, and shows the guides that matched. Konva has already moved
   * the node to the raw pointer position by the time this fires; overriding
   * it here is the sanctioned way to snap a native drag without fighting it.
   */
  private onDragMove(node: ElementNode): void {
    const element = this.canvas.elementById(node.id());
    const settings = this.settings.settings();
    if (!element || (!settings.snapEnabled && !settings.guidesVisible)) {
      return;
    }

    const page = this.canvas.activePage();
    const others = this.canvas
      .elements()
      .filter((candidate) => candidate.id !== element.id && candidate.visible);

    const result = this.snapping.snap(
      { x: node.x(), y: node.y(), width: element.width, height: element.height },
      others,
      {
        page: { width: page.width, height: page.height },
        margin: PAGE_MARGIN,
        gridSize: GRID_SIZE,
        threshold: SNAP_THRESHOLD / this.viewport.zoom(),
        snapToGrid: settings.snapEnabled,
        snapToGuides: settings.guidesVisible,
      },
    );

    node.position({ x: result.x, y: result.y });
    this.guides.render(result.guides, { width: page.width, height: page.height });
  }

  /**
   * Writes a finished drag into the document. The store still holds the
   * pre-drag position — Konva moved on its own during the gesture — so the
   * command captures the correct value to undo to without any bookkeeping here.
   */
  private commitDrag(node: ElementNode): void {
    const element = this.canvas.elementById(node.id());
    if (!element) {
      return;
    }

    const x = Math.round(node.x());
    const y = Math.round(node.y());
    if (x === element.x && y === element.y) {
      return;
    }

    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, element.id, { x, y }, { label: 'Move element' }),
    );
  }

  /** Writes a finished resize or rotation into the document. */
  private commitTransform(): void {
    for (const node of (this.transformer?.nodes() ?? []) as ElementNode[]) {
      const element = this.canvas.elementById(node.id());
      if (!element) {
        continue;
      }

      const patch = this.measureTransform(node, element);
      this.commands.dispatch(
        new UpdateElementCommand(this.canvas, element.id, patch, { label: 'Resize element' }),
      );
    }
  }

  /**
   * Converts the scale a transform left on the node into a size on the element,
   * and resets the node's scale — the document carries width and height, so a
   * node that stayed scaled would double the effect on the next render.
   *
   * The new size is derived from the element's stored size rather than read off
   * the node: `width()` means different things to a text box, a rule and a
   * shape, whereas the element's own size is exactly what was drawn at scale 1.
   */
  private measureTransform(node: ElementNode, element: CanvasElement): ElementPatch {
    const width = Math.max(Math.round(element.width * node.scaleX()), 1);
    const height = Math.max(Math.round(element.height * node.scaleY()), 1);
    node.scale({ x: 1, y: 1 });

    const patch: ElementPatch = {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      rotation: Math.round(node.rotation()),
      width,
      height,
    };

    if (element.type === 'text') {
      // Text height is measured, not chosen: re-wrap at the new width and take
      // whatever height that turns out to need.
      node.setAttr('width', width);
      patch.height = Math.round((node as Text).height());
    } else {
      node.setAttrs({ width, height });
    }

    return patch;
  }

  /**
   * The middle button, or the left button while space is held, belongs to the
   * workspace's pan gesture rather than to the canvas.
   */
  private isPanGesture(event: PointerEvent | MouseEvent): boolean {
    return (
      event.button === 1 ||
      (event.buttons & 4) !== 0 ||
      (event.button === 0 && this.keyboard.spaceHeld())
    );
  }
}
