import Konva from 'konva/lib/Core';

import { IconElement } from '../models/canvas-element.model';
import { ICON_GLYPHS, IconGlyphPart, IconName } from '../../shared/icons/icon-registry';
import { applyDepthShadow } from '../utils/depth-style.util';
import { ElementRenderer } from './element-renderer';

const VIEWBOX = 24;
const STROKE_WIDTH = 1.8;

/**
 * Draws one glyph from the shared icon set as a live, single-colour shape.
 *
 * Every glyph part becomes its own `Path2D` — `Konva.Context.stroke`/`.fill`
 * both take one directly — rather than one `Konva.Shape` per part, so an icon
 * stays a single node like every other element the reconciler tracks.
 */
export class IconRenderer implements ElementRenderer<IconElement, Konva.Shape> {
  create(element: IconElement): Konva.Shape {
    const node = new Konva.Shape({
      perfectDrawEnabled: false,
      sceneFunc: drawIcon,
    });
    this.update(node, element);
    return node;
  }

  update(node: Konva.Shape, element: IconElement): void {
    node.setAttrs({
      width: element.width,
      height: element.height,
      iconId: element.iconId,
      fill: element.fill,
      stroke: element.fill,
    });
    applyDepthShadow(node, element.depth ?? false);
  }
}

function drawIcon(context: Konva.Context, shape: Konva.Shape): void {
  const glyph = ICON_GLYPHS[shape.getAttr('iconId') as IconName] as readonly IconGlyphPart[] | undefined;
  if (!glyph) {
    return;
  }

  const width = shape.width();
  const height = shape.height();
  if (width <= 0 || height <= 0) {
    return;
  }

  context.save();
  context.scale(width / VIEWBOX, height / VIEWBOX);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = STROKE_WIDTH;
  context.strokeStyle = shape.stroke() as string;
  context.fillStyle = shape.fill() as string;

  for (const part of glyph) {
    const path = partPath(part);
    if (part.kind === 'circle' && part.filled) {
      context.fill(path);
    } else {
      context.stroke(path);
    }
  }

  context.restore();
}

function partPath(part: IconGlyphPart): Path2D {
  const path = new Path2D();
  switch (part.kind) {
    case 'path':
      path.addPath(new Path2D(part.d));
      break;
    case 'circle':
      path.arc(part.cx, part.cy, part.r, 0, Math.PI * 2);
      break;
    case 'rect':
      path.rect(part.x, part.y, part.width, part.height);
      break;
  }
  return path;
}
