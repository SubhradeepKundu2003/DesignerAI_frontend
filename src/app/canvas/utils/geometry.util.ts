/**
 * Bounding-box math shared by grouping.
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
