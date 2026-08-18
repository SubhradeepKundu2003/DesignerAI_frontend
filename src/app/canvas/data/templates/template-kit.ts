import {
  ArcOrientation,
  CanvasElement,
  DividerElement,
  FrameElement,
  FrameLayout,
  IconElement,
  ShapeElement,
  TextElement,
} from '../../models/canvas-element.model';
import { ThemeColorRef } from '../../models/design-theme.model';
import { computeFrameLayout } from '../../utils/geometry.util';
import { generateId } from '../../utils/id.util';
import { IconName } from '../../../shared/icons/icon-registry';

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
  props: Base &
    Partial<Omit<TextElement, keyof ReturnType<typeof base> | 'type'>> & { text: string; fillRef?: ThemeColorRef },
): TextElement {
  const { text: value, fontFamily, fontSize, fill, fillRef, fontStyle, align, letterSpacing, lineHeight, ...rest } =
    props;
  return {
    ...base(rest),
    type: 'text',
    text: value,
    fontFamily: fontFamily ?? 'Houschka Rounded Alt',
    fontSize: fontSize ?? 15,
    fill: fill ?? '#1c1f24',
    fillRef,
    fontStyle: fontStyle ?? 'normal',
    align: align ?? 'left',
    letterSpacing: letterSpacing ?? 0,
    lineHeight: lineHeight ?? 1.4,
  };
}

export function rect(
  props: Base & {
    fill: string;
    fillRef?: ThemeColorRef;
    stroke?: string;
    strokeRef?: ThemeColorRef;
    strokeWidth?: number;
    cornerRadius?: number;
  },
): ShapeElement {
  const { fill, fillRef, stroke, strokeRef, strokeWidth, cornerRadius, ...rest } = props;
  return {
    ...base(rest),
    type: 'shape',
    shape: 'rectangle',
    fill,
    fillRef,
    stroke: stroke ?? 'transparent',
    strokeRef,
    strokeWidth: strokeWidth ?? 0,
    cornerRadius: cornerRadius ?? 0,
  };
}

export function circle(
  props: Omit<Base, 'width' | 'height'> & {
    diameter: number;
    fill: string;
    fillRef?: ThemeColorRef;
    stroke?: string;
    strokeRef?: ThemeColorRef;
    strokeWidth?: number;
  },
): ShapeElement {
  const { diameter, fill, fillRef, stroke, strokeRef, strokeWidth, ...rest } = props;
  return {
    ...base({ ...rest, width: diameter, height: diameter }),
    type: 'shape',
    shape: 'circle',
    fill,
    fillRef,
    stroke: stroke ?? 'transparent',
    strokeRef,
    strokeWidth: strokeWidth ?? 0,
    cornerRadius: 0,
  };
}

/**
 * A decorative half-disc — flat (diameter) edge on `orientation`'s box edge,
 * dome bulging toward the opposite edge. Same theming guarantee as `circle()`:
 * `fillRef`/`strokeRef` let `ApplyThemeCommand` recolour it.
 */
export function halfCircle(
  props: Base & {
    orientation?: ArcOrientation;
    fill: string;
    fillRef?: ThemeColorRef;
    stroke?: string;
    strokeRef?: ThemeColorRef;
    strokeWidth?: number;
  },
): ShapeElement {
  const { orientation, fill, fillRef, stroke, strokeRef, strokeWidth, ...rest } = props;
  return {
    ...base(rest),
    type: 'shape',
    shape: 'semicircle',
    arcOrientation: orientation ?? 'up',
    fill,
    fillRef,
    stroke: stroke ?? 'transparent',
    strokeRef,
    strokeWidth: strokeWidth ?? 0,
    cornerRadius: 0,
  };
}

/** A straight rule between two points — rotation does the diagonal work. */
export function connector(
  from: { x: number; y: number },
  to: { x: number; y: number },
  props: { name: string; stroke: string; strokeRef?: ThemeColorRef; strokeWidth?: number; dash?: number[] },
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
    strokeRef: props.strokeRef,
    strokeWidth,
    dash: props.dash ?? [],
  };
}

/**
 * A small decorative glyph, drawn live from the shared icon set — unlike the
 * old flattened-SVG-image approach, this is a real `IconElement`: it can be
 * recoloured by `ApplyThemeCommand` when `fillRef` is set, and picked by an
 * AI agent from the same finite `IconName` list the properties panel uses.
 */
export function icon(props: {
  x: number;
  y: number;
  size: number;
  name: IconName;
  color: string;
  fillRef?: ThemeColorRef;
  label?: string;
}): IconElement {
  return {
    ...base({ x: props.x, y: props.y, width: props.size, height: props.size, name: props.label ?? 'Icon' }),
    type: 'icon',
    iconId: props.name,
    fill: props.color,
    fillRef: props.fillRef,
  };
}

/**
 * Wraps already-built `children` in a new `FrameElement`, laying them out
 * along one axis exactly like `CanvasStore.layoutFrame` would once the frame
 * lands on the canvas — computed here, offline, via the same
 * {@link computeFrameLayout} the live store uses, so a template's initial
 * placement is pixel-identical to what dragging the frame's own gap/padding
 * controls afterwards would produce. Returns a flat `[frame, ...children]`
 * bundle, ready to spread into a template's element list. `children` should
 * be authored at `x: 0, y: 0` — their final position is computed here and
 * overwrites whatever they were built with.
 */
export function frame(props: {
  x: number;
  y: number;
  name: string;
  layout: FrameLayout;
  gap: number;
  padding: number;
  background?: string;
  fillRef?: ThemeColorRef;
  children: CanvasElement[];
}): CanvasElement[] {
  const frameShell: FrameElement = {
    ...base({ x: props.x, y: props.y, width: 0, height: 0, name: props.name }),
    type: 'frame',
    layout: props.layout,
    gap: props.gap,
    padding: props.padding,
    childIds: props.children.map((child) => child.id),
    background: props.background,
    fillRef: props.fillRef,
  };

  const { width, height, positions } = computeFrameLayout(frameShell, props.children);
  const positionedChildren = props.children.map((child) => {
    const position = positions.get(child.id);
    return position ? { ...child, ...position } : child;
  });

  return [{ ...frameShell, width, height }, ...positionedChildren];
}

/** Shifts a whole bundle by a placement offset — every builder above authors local coordinates. */
export function translate<T extends readonly CanvasElement[]>(elements: T, origin: { x: number; y: number }): T {
  return elements.map((element) => ({ ...element, x: element.x + origin.x, y: element.y + origin.y })) as unknown as T;
}

/**
 * Positionally merges content overrides onto a template's default fixed-size
 * list (bar-chart's bars, KPI dashboard's tiles, timeline steps, bullet-list
 * items) — used by the handful of templates whose `build()` accepts a
 * generation-time `content` override (Track P4). The result always has the
 * same length as `defaults`: a document with fewer data points than the
 * template's slot count just leaves the remaining slots at their polished
 * placeholder copy, and extra data points beyond the slot count are dropped,
 * rather than resizing the template's own geometry (`WIDTH`/`HEIGHT` are
 * computed from `defaults.length` at module load time in every such file).
 */
export function mergeFixedList<T>(defaults: readonly T[], overrides?: readonly Partial<T>[]): T[] {
  return defaults.map((base, i) => (overrides?.[i] ? { ...base, ...overrides[i] } : base));
}
