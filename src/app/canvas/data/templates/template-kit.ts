import {
  CanvasElement,
  DividerElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '../../models/canvas-element.model';
import { generateId } from '../../utils/id.util';
import { IconName, iconDataUrl } from './icon-svg';

/**
 * Terse builders for the element bundles in this folder — every template file
 * would otherwise repeat the same `id`/`rotation`/`opacity`/`locked`/`visible`
 * boilerplate for every single text box, bar and connector line it places.
 * Coordinates are authored relative to a template's own origin; callers
 * translate by the placement offset once, in `infographic-template.model.ts`.
 */

type Base = { x: number; y: number; width: number; height: number; name: string };

function base({ x, y, width, height, name }: Base) {
  return { id: generateId(), name, x, y, width, height, rotation: 0, opacity: 1, locked: false, visible: true };
}

export function text(
  props: Base & Partial<Omit<TextElement, keyof ReturnType<typeof base> | 'type'>> & { text: string },
): TextElement {
  const { text: value, fontFamily, fontSize, fill, fontStyle, align, letterSpacing, lineHeight, ...rest } = props;
  return {
    ...base(rest),
    type: 'text',
    text: value,
    fontFamily: fontFamily ?? 'Inter',
    fontSize: fontSize ?? 15,
    fill: fill ?? '#1c1f24',
    fontStyle: fontStyle ?? 'normal',
    align: align ?? 'left',
    letterSpacing: letterSpacing ?? 0,
    lineHeight: lineHeight ?? 1.4,
  };
}

export function rect(
  props: Base & { fill: string; stroke?: string; strokeWidth?: number; cornerRadius?: number },
): ShapeElement {
  const { fill, stroke, strokeWidth, cornerRadius, ...rest } = props;
  return {
    ...base(rest),
    type: 'shape',
    shape: 'rectangle',
    fill,
    stroke: stroke ?? 'transparent',
    strokeWidth: strokeWidth ?? 0,
    cornerRadius: cornerRadius ?? 0,
  };
}

export function circle(
  props: Omit<Base, 'width' | 'height'> & {
    diameter: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
  },
): ShapeElement {
  const { diameter, fill, stroke, strokeWidth, ...rest } = props;
  return {
    ...base({ ...rest, width: diameter, height: diameter }),
    type: 'shape',
    shape: 'circle',
    fill,
    stroke: stroke ?? 'transparent',
    strokeWidth: strokeWidth ?? 0,
    cornerRadius: 0,
  };
}

/** A straight rule between two points — rotation does the diagonal work. */
export function connector(
  from: { x: number; y: number },
  to: { x: number; y: number },
  props: { name: string; stroke: string; strokeWidth?: number; dash?: number[] },
): DividerElement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const strokeWidth = props.strokeWidth ?? 2;

  return {
    ...base({ x: from.x, y: from.y - strokeWidth / 2, width: length, height: strokeWidth, name: props.name }),
    rotation: angle,
    type: 'divider',
    stroke: props.stroke,
    strokeWidth,
    dash: props.dash ?? [],
  };
}

/** A small decorative icon, placed as a self-contained SVG image. */
export function icon(props: {
  x: number;
  y: number;
  size: number;
  name: IconName;
  color: string;
  label?: string;
}): ImageElement {
  return {
    ...base({ x: props.x, y: props.y, width: props.size, height: props.size, name: props.label ?? 'Icon' }),
    type: 'image',
    src: iconDataUrl(props.name, props.color, Math.round(props.size * 2)),
  };
}

/** Shifts a whole bundle by a placement offset — every builder above authors local coordinates. */
export function translate<T extends readonly CanvasElement[]>(elements: T, origin: { x: number; y: number }): T {
  return elements.map((element) => ({ ...element, x: element.x + origin.x, y: element.y + origin.y })) as unknown as T;
}
