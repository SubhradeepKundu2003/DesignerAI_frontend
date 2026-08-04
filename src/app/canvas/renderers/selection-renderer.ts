import { Injectable, OnDestroy } from '@angular/core';
import Konva from 'konva/lib/Core';
import { Box, Transformer } from 'konva/lib/shapes/Transformer';

import { CanvasElement } from '../models/canvas-element.model';
import { MIN_TRANSFORM_BOX } from '../models/editor-config';
import { readToken } from '../utils/theme.util';
import { ElementNode } from './element-renderer';

/**
 * Handle metrics in screen px. Konva's Transformer already draws its anchors
 * at a constant absolute size regardless of the stage's scale — verified by
 * setting the stage scale directly and watching the anchors not move a pixel
 * while the page itself scaled — so these are handed to it as-is, not
 * pre-divided by zoom.
 */
const HANDLE = {
  anchorSize: 9,
  anchorStrokeWidth: 1.5,
  borderStrokeWidth: 1.5,
  padding: 2,
  rotateAnchorOffset: 22,
} as const;

const ALL_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

/** Elements with only one meaningful dimension resize along it alone. */
const HORIZONTAL_ANCHORS = ['middle-left', 'middle-right'] as const;

/**
 * Draws the selection: the outline and the resize/rotate handles.
 *
 * Lives on the overlay layer so grabbing a handle never repaints the page or
 * the artwork. It reflects the selection it is handed and nothing else — which
 * elements are selected is the selection store's business, and what a drag on a
 * handle *means* is the interaction service's.
 */
@Injectable()
export class SelectionRenderer implements OnDestroy {
  private transformer: Transformer | null = null;

  /** The transformer, for the interaction service to listen to. */
  get node(): Transformer | null {
    return this.transformer;
  }

  attach(layer: Konva.Layer): void {
    this.detach();

    const accent = readToken('--color-selection', '#4f46e5');
    this.transformer = new Transformer({
      anchorFill: readToken('--color-surface', '#ffffff'),
      anchorStroke: accent,
      anchorCornerRadius: 2,
      borderStroke: accent,
      flipEnabled: false,
      ignoreStroke: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      shouldOverdrawWholeArea: false,
      boundBoxFunc: refuseCollapse,
    });

    layer.add(this.transformer);
  }

  /**
   * Points the handles at `elements`, using `nodes` as their on-stage
   * counterparts. An empty selection hides the transformer entirely.
   */
  render(elements: readonly CanvasElement[], nodes: readonly ElementNode[], zoom: number): void {
    const transformer = this.transformer;
    if (!transformer) {
      return;
    }

    transformer.setAttrs({
      anchorSize: HANDLE.anchorSize,
      anchorStrokeWidth: HANDLE.anchorStrokeWidth,
      borderStrokeWidth: HANDLE.borderStrokeWidth,
      padding: HANDLE.padding,
      rotateAnchorOffset: HANDLE.rotateAnchorOffset / zoom,
      enabledAnchors: [...anchorsFor(elements)],
      visible: nodes.length > 0,
    });
    transformer.nodes([...nodes]);
    transformer.getLayer()?.batchDraw();
  }

  detach(): void {
    this.transformer?.destroy();
    this.transformer = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }
}

/**
 * Text reflows to the width it is given and finds its own height; a divider is
 * a rule with no thickness to drag. Offering corner handles on either would
 * promise a resize the model cannot express.
 */
function anchorsFor(elements: readonly CanvasElement[]): readonly string[] {
  const horizontalOnly = elements.every(
    (element) => element.type === 'text' || element.type === 'divider',
  );
  return elements.length > 0 && horizontalOnly ? HORIZONTAL_ANCHORS : ALL_ANCHORS;
}

/**
 * Stops a resize from collapsing an element to nothing, while leaving genuinely
 * flat elements — a divider is two px tall — draggable along the axis they do
 * have. Only a dimension that is both below the floor *and* shrinking is refused.
 */
function refuseCollapse(oldBox: Box, newBox: Box): Box {
  const collapsing = (next: number, previous: number) =>
    Math.abs(next) < MIN_TRANSFORM_BOX && Math.abs(next) < Math.abs(previous);

  return collapsing(newBox.width, oldBox.width) || collapsing(newBox.height, oldBox.height)
    ? oldBox
    : newBox;
}
