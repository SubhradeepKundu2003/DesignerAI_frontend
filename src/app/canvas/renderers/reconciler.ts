import { Injectable, OnDestroy, inject } from '@angular/core';
import Konva from 'konva/lib/Core';

import { CanvasElement } from '../models/canvas-element.model';
import { CanvasStore } from '../state/canvas.store';
import { ELEMENT_TYPE_ATTR, ElementNode, applyBaseAttrs } from './element-renderer';
import { ElementRendererRegistry } from './element-renderer.registry';

/**
 * Turns the Canvas JSON into Konva nodes, and keeps them that way.
 *
 * This is the whole of "JSON → pixels". It diffs the element list against the
 * nodes already on the content layer: matched elements are updated in place,
 * new ones are created, and nodes whose element is gone are destroyed. Nothing
 * else in the editor creates or removes a node, so the layer cannot drift away
 * from the document.
 *
 * Provided per workspace, not in root: the node map belongs to one stage.
 */
@Injectable()
export class Reconciler implements OnDestroy {
  private readonly registry = inject(ElementRendererRegistry);
  private readonly canvas = inject(CanvasStore);

  private layer: Konva.Layer | null = null;
  private readonly nodes = new Map<string, ElementNode>();

  attach(layer: Konva.Layer): void {
    this.detach();
    this.layer = layer;
  }

  /** The node drawing `id`, if it is currently on the layer. */
  nodeFor(id: string): ElementNode | undefined {
    return this.nodes.get(id);
  }

  /** The nodes drawing `ids`, skipping any that are not on the layer. */
  nodesFor(ids: readonly string[]): ElementNode[] {
    return ids
      .map((id) => this.nodes.get(id))
      .filter((node): node is ElementNode => node !== undefined);
  }

  /** Brings the content layer in line with `elements`. Safe to call at will. */
  sync(elements: readonly CanvasElement[]): void {
    const layer = this.layer;
    if (!layer) {
      return;
    }

    const rendered = new Set<string>();

    elements.forEach((element, index) => {
      rendered.add(element.id);
      const effective = this.effectiveElement(element);

      let node = this.nodes.get(element.id);
      // An element that changed type is a different drawing altogether — its
      // old node cannot be updated into the new one, so it is replaced.
      if (node && node.getAttr(ELEMENT_TYPE_ATTR) !== effective.type) {
        node.destroy();
        this.nodes.delete(element.id);
        node = undefined;
      }

      if (node) {
        applyBaseAttrs(node, effective);
        this.registry.update(node, effective);
      } else {
        node = this.registry.create(effective);
        node.setAttr(ELEMENT_TYPE_ATTR, effective.type);
        applyBaseAttrs(node, effective);
        // Renderers produce shapes and groups; `Layer.add` types that narrowly,
        // while everything downstream only needs the base node.
        layer.add(node as Konva.Shape);
        this.nodes.set(element.id, node);
      }

      // The array index is the z-order. The content layer holds element nodes
      // and nothing else, so index and zIndex line up one to one.
      if (node.zIndex() !== index) {
        node.zIndex(index);
      }
    });

    for (const [id, node] of this.nodes) {
      if (!rendered.has(id)) {
        node.destroy();
        this.nodes.delete(id);
      }
    }

    // One draw for the whole sync, however many nodes it touched.
    layer.batchDraw();
  }

  /**
   * A grouped element's own `visible`/`locked` are not the whole story: hiding
   * or locking a group must hide or lock its members too. Overlaying that here
   * — rather than in `CanvasStore` — keeps a member's *stored* flags exactly
   * what the user set, so ungrouping doesn't need to remember what to restore.
   */
  private effectiveElement(element: CanvasElement): CanvasElement {
    const parent = element.parentId ? this.canvas.groupById(element.parentId) : undefined;
    if (!parent) {
      return element;
    }
    return {
      ...element,
      visible: element.visible && parent.visible,
      locked: element.locked || parent.locked,
    };
  }

  detach(): void {
    for (const node of this.nodes.values()) {
      node.destroy();
    }
    this.nodes.clear();
    this.layer = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }
}
