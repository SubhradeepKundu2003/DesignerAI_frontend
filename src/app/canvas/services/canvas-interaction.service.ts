import { Injectable, OnDestroy, inject } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Text } from 'konva/lib/shapes/Text';
import { Transformer } from 'konva/lib/shapes/Transformer';

import { CompositeCommand } from '../commands/composite.command';
import { UpdateElementCommand } from '../commands/update-element.command';
import { CanvasElement, ElementPatch } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
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

  /**
   * Every node moving as part of the drag gesture in progress, with the
   * position each held when the gesture started. Konva only natively drags
   * the node under the pointer — this is what makes the rest of a
   * multi-selection (or a group's members) follow along and land in one
   * `commitDrag`, instead of only the grabbed node actually moving.
   */
  private readonly dragOrigin = new Map<ElementNode, { x: number; y: number }>();

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
        this.selection.exitGroup();
      }
    });

    // Selection on pointer down, not on click: the same press has to be able to
    // start dragging what it just selected.
    content.on(`pointerdown${NS}`, (event) => this.onElementPointerDown(event));
    content.on(`dragstart${NS}`, (event) => this.onDragStart(event));
    content.on(`dragmove${NS}`, (event) => this.onDragMove(event.target as ElementNode));
    content.on(`dragend${NS}`, () => {
      this.commitDrag();
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

  /**
   * Resolves a click to what it should actually select: a group, unless the
   * user has double-clicked into it, in which case a click on one of its
   * members selects that member directly. Clicking anything outside the
   * entered group — including empty paper, handled above — leaves it.
   */
  private onElementPointerDown(event: Konva.KonvaEventObject<PointerEvent>): void {
    const rawId = event.target.id();
    if (!rawId || this.isPanGesture(event.evt)) {
      return;
    }

    const element = this.canvas.elementById(rawId);
    const entered = this.selection.enteredGroupId();
    const insideEntered = !!element?.parentId && element.parentId === entered;
    const id = insideEntered ? rawId : this.canvas.topLevelIdOf(rawId);

    if (entered && !insideEntered) {
      this.selection.exitGroup();
    }

    if (event.evt.shiftKey) {
      this.selection.toggle(id);
    } else if (!this.selection.isSelected(id)) {
      this.selection.select(id);
    }
  }

  /**
   * A double-click on a grouped element enters its group and selects that
   * member directly, instead of the whole group. A double-click on a text
   * box also opens it in the textarea overlay — for grouped text this lands
   * in the same gesture as entering, rather than requiring a second one.
   */
  private onElementDoubleClick(event: Konva.KonvaEventObject<MouseEvent>): void {
    const id = event.target.id();
    const element = this.canvas.elementById(id);
    if (!element || element.locked) {
      return;
    }

    if (element.parentId && this.selection.enteredGroupId() !== element.parentId) {
      this.selection.enterGroup(element.parentId);
      this.selection.select(id);
    }

    if (element.type !== 'text') {
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
      return;
    }

    this.dragOrigin.clear();
    for (const node of (this.transformer?.nodes() ?? []) as ElementNode[]) {
      this.dragOrigin.set(node, { x: node.x(), y: node.y() });
    }
  }

  /**
   * Nudges a node still being dragged onto whatever the grid or an alignment
   * guide offers, and shows the guides that matched. Konva has already moved
   * the node to the raw pointer position by the time this fires; overriding
   * it here is the sanctioned way to snap a native drag without fighting it.
   * Every other node captured at drag-start then follows by the same delta.
   */
  private onDragMove(node: ElementNode): void {
    const element = this.canvas.elementById(node.id());
    if (!element) {
      return;
    }

    const settings = this.settings.settings();
    if (settings.snapEnabled || settings.guidesVisible) {
      const page = this.canvas.activePage();
      const movingIds = new Set([...this.dragOrigin.keys()].map((moving) => moving.id()));
      const others = this.canvas
        .elements()
        .filter((candidate) => !movingIds.has(candidate.id) && candidate.visible);

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

    this.followDrag(node);
  }

  /** Moves every other captured node by the delta `node` has moved since drag-start. */
  private followDrag(node: ElementNode): void {
    const origin = this.dragOrigin.get(node);
    if (!origin) {
      return;
    }
    const dx = node.x() - origin.x;
    const dy = node.y() - origin.y;
    if (dx === 0 && dy === 0) {
      return;
    }

    for (const [other, start] of this.dragOrigin) {
      if (other !== node) {
        other.position({ x: start.x + dx, y: start.y + dy });
      }
    }
  }

  /**
   * Writes a finished drag into the document, one `UpdateElementCommand` per
   * node that actually moved. The store still holds the pre-drag position —
   * Konva moved on its own during the gesture — so each command captures the
   * correct value to undo to without any bookkeeping here. More than one
   * moved node still lands as a single undo step.
   */
  private commitDrag(): void {
    const updates: Command[] = [];
    for (const node of this.dragOrigin.keys()) {
      const element = this.canvas.elementById(node.id());
      if (!element) {
        continue;
      }

      const x = Math.round(node.x());
      const y = Math.round(node.y());
      if (x !== element.x || y !== element.y) {
        updates.push(
          new UpdateElementCommand(this.canvas, element.id, { x, y }, { label: 'Move element' }),
        );
      }
    }
    this.dragOrigin.clear();

    if (updates.length === 0) {
      return;
    }
    this.commands.dispatch(
      updates.length === 1 ? updates[0] : new CompositeCommand(updates, `Move ${updates.length} elements`),
    );
  }

  /** Writes a finished resize or rotation into the document, as one undo step. */
  private commitTransform(): void {
    const updates: Command[] = [];
    for (const node of (this.transformer?.nodes() ?? []) as ElementNode[]) {
      const element = this.canvas.elementById(node.id());
      if (!element) {
        continue;
      }

      const patch = this.measureTransform(node, element);
      updates.push(
        new UpdateElementCommand(this.canvas, element.id, patch, { label: 'Resize element' }),
      );
    }

    if (updates.length === 0) {
      return;
    }
    this.commands.dispatch(
      updates.length === 1
        ? updates[0]
        : new CompositeCommand(updates, `Resize ${updates.length} elements`),
    );
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
