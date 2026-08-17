import Konva from 'konva/lib/Core';

/**
 * Konva paint attrs for `depth: true` elements (see `CanvasElement.depth`):
 * a soft drop shadow for any node, plus a light-to-dark gradient for shapes.
 *
 * Deliberately computed at render time from the element's flat `fill` rather
 * than stored in the document — a theme swap or a colour edit just changes
 * `fill` as it always did, and the gradient/shadow follow for free.
 */

/** Shadow in the element's own local px, so it scales with zoom and with the element itself, like a physically embossed asset would. */
const DEPTH_SHADOW = {
  color: '#1c1f24',
  blur: 10,
  offsetX: 0,
  offsetY: 4,
  opacity: 0.24,
} as const;

/**
 * Applies the shared drop shadow via individual Konva accessors rather than
 * `setAttrs`, so it works uniformly on every node type `depth` touches —
 * `Konva.Image`'s `ImageConfig` requires `image` in its `setAttrs` argument,
 * which a shadow-only partial can't satisfy.
 */
export function applyDepthShadow(node: Konva.Shape, enabled: boolean): void {
  node.shadowEnabled(enabled);
  node.shadowColor(DEPTH_SHADOW.color);
  node.shadowBlur(DEPTH_SHADOW.blur);
  node.shadowOffsetX(DEPTH_SHADOW.offsetX);
  node.shadowOffsetY(DEPTH_SHADOW.offsetY);
  node.shadowOpacity(DEPTH_SHADOW.opacity);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Mixes `hex` toward `toward` (0 or 255 per channel) by `amount` (0-1). Non-hex colours (e.g. `'transparent'`) pass through unchanged. */
function shade(hex: string, amount: number, toward: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  return rgbToHex(
    rgb[0] + (toward - rgb[0]) * amount,
    rgb[1] + (toward - rgb[1]) * amount,
    rgb[2] + (toward - rgb[2]) * amount,
  );
}

export const lighten = (hex: string, amount: number): string => shade(hex, amount, 255);
export const darken = (hex: string, amount: number): string => shade(hex, amount, 0);

/**
 * Vertical light-to-dark Konva gradient attrs derived from a flat base
 * colour — a "glossy button" fill swapped in for a solid `fill` when `depth`
 * is on.
 */
export function depthGradientAttrs(baseHex: string, width: number, height: number): Record<string, unknown> {
  return {
    fillPriority: 'linear-gradient',
    fillLinearGradientStartPoint: { x: width / 2, y: 0 },
    fillLinearGradientEndPoint: { x: width / 2, y: height },
    fillLinearGradientColorStops: [0, lighten(baseHex, 0.32), 0.5, baseHex, 1, darken(baseHex, 0.22)],
  };
}
