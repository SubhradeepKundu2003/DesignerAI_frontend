import { Injectable } from '@angular/core';

import { CanvasElement, ElementOfType, ElementType } from '../models/canvas-element.model';
import { DividerRenderer } from './divider.renderer';
import { ElementNode, ElementRenderer } from './element-renderer';
import { ImageRenderer } from './image.renderer';
import { ShapeRenderer } from './shape.renderer';
import { TextRenderer } from './text.renderer';

type RendererMap = {
  readonly [K in ElementType]: ElementRenderer<ElementOfType<K>>;
};

/**
 * Looks up the renderer for an element type.
 *
 * The one place that knows the full set of element types. Supporting a new one
 * — a button, a QR code, whatever the AI service starts emitting — is a new
 * renderer file and an entry in this table; the reconciler, the stores and the
 * stage never learn about it.
 */
@Injectable()
export class ElementRendererRegistry {
  private readonly renderers: RendererMap = {
    text: new TextRenderer(),
    shape: new ShapeRenderer(),
    divider: new DividerRenderer(),
    image: new ImageRenderer(),
  };

  create(element: CanvasElement): ElementNode {
    return this.rendererFor(element).create(element);
  }

  update(node: ElementNode, element: CanvasElement): void {
    this.rendererFor(element).update(node, element);
  }

  /**
   * TypeScript cannot correlate the index into the table with the element that
   * produced it, so the pairing is asserted here — in the single place where it
   * is enforced by the table's own type — rather than at each call site.
   */
  private rendererFor<T extends CanvasElement>(element: T): ElementRenderer<T> {
    return this.renderers[element.type] as unknown as ElementRenderer<T>;
  }
}
