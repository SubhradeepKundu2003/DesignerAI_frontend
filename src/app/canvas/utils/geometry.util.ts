/**
 * Bounding-box math shared by grouping and marquee selection.
 *
 * Kept separate from `models/geometry.model.ts`, which only holds plain
 * shapes: this file has actual logic.
 */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RotatedBox extends Box {
  /** Clockwise degrees, around the box's own top-left corner. */
  rotation: number;
}

/**
 * The smallest axis-aligned box containing every given box, each rotated
 * around its own top-left corner — matching how element rotation works
 * elsewhere in the document (see `BaseElement.rotation`).
 */
export function computeBoundingBox(boxes: readonly RotatedBox[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const box of boxes) {
    for (const corner of corners(box)) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Whether two axis-aligned boxes overlap; merely touching edges don't count. */
export function boxesIntersect(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

interface FrameLayoutInput {
  x: number;
  y: number;
  layout: 'row' | 'column';
  gap: number;
  padding: number;
}

interface FrameChildBox {
  id: string;
  width: number;
  height: number;
}

export interface FrameLayoutResult {
  width: number;
  height: number;
  positions: ReadonlyMap<string, { x: number; y: number }>;
}

/**
 * The flexbox-lite math behind `FrameElement`: stacks `children` along one
 * axis, inset by `padding` and spaced by `gap`, centring the cross axis —
 * pure so both the live `CanvasStore.layoutFrame` and offline template
 * builders (which need a frame's final geometry before any element is added
 * to the document) share one implementation instead of two that can drift.
 */
export function computeFrameLayout(frame: FrameLayoutInput, children: readonly FrameChildBox[]): FrameLayoutResult {
  const isRow = frame.layout === 'row';
  const main = (child: FrameChildBox) => (isRow ? child.width : child.height);
  const cross = (child: FrameChildBox) => (isRow ? child.height : child.width);

  const contentMain = children.length
    ? children.reduce((sum, child) => sum + main(child), 0) + frame.gap * (children.length - 1)
    : 0;
  const contentCross = children.reduce((max, child) => Math.max(max, cross(child)), 0);

  const width = isRow ? contentMain + frame.padding * 2 : contentCross + frame.padding * 2;
  const height = isRow ? contentCross + frame.padding * 2 : contentMain + frame.padding * 2;

  const positions = new Map<string, { x: number; y: number }>();
  let offset = frame.padding;
  for (const child of children) {
    const centering = (contentCross - cross(child)) / 2;
    positions.set(
      child.id,
      isRow
        ? { x: frame.x + offset, y: frame.y + frame.padding + centering }
        : { x: frame.x + frame.padding + centering, y: frame.y + offset },
    );
    offset += main(child) + frame.gap;
  }

  return { width, height, positions };
}

function corners({ x, y, width, height, rotation }: RotatedBox): { x: number; y: number }[] {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Rotated around (x, y), the box's own top-left corner.
  const points: [number, number][] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];

  return points.map(([px, py]) => ({
    x: x + px * cos - py * sin,
    y: y + px * sin + py * cos,
  }));
}
