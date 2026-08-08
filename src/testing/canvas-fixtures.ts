import {
  DividerElement,
  FrameElement,
  GroupElement,
  IconElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '../app/canvas/models/canvas-element.model';

/**
 * Element builders for specs.
 *
 * Written out by hand rather than taken from `ElementFactory`, so a change to
 * the editor's default styling cannot silently rewrite what the tests assert
 * against — and so a spec can state only the properties it actually cares about.
 */

let sequence = 0;

function baseElement(name: string) {
  sequence += 1;
  return {
    id: `${name.toLowerCase()}-${sequence}`,
    name: `${name} ${sequence}`,
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
  };
}

export function shapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    ...baseElement('Rectangle'),
    type: 'shape',
    shape: 'rectangle',
    fill: '#c7d2fe',
    stroke: '#4f46e5',
    strokeWidth: 0,
    cornerRadius: 8,
    ...overrides,
  };
}

export function textElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    ...baseElement('Text'),
    type: 'text',
    text: 'Hello',
    fontFamily: 'Inter',
    fontSize: 16,
    fill: '#1c1f24',
    fontStyle: 'normal',
    align: 'left',
    letterSpacing: 0,
    lineHeight: 1.4,
    ...overrides,
  };
}

export function dividerElement(overrides: Partial<DividerElement> = {}): DividerElement {
  return {
    ...baseElement('Divider'),
    type: 'divider',
    height: 2,
    stroke: '#cbcfd6',
    strokeWidth: 2,
    dash: [],
    ...overrides,
  };
}

export function imageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    ...baseElement('Image'),
    type: 'image',
    src: 'data:image/png;base64,stub',
    ...overrides,
  };
}

export function iconElement(overrides: Partial<IconElement> = {}): IconElement {
  return {
    ...baseElement('Icon'),
    type: 'icon',
    iconId: 'star',
    fill: '#4f46e5',
    ...overrides,
  };
}

export function frameElement(overrides: Partial<FrameElement> = {}): FrameElement {
  return {
    ...baseElement('Frame'),
    type: 'frame',
    layout: 'row',
    gap: 20,
    padding: 20,
    childIds: [],
    ...overrides,
  };
}

export function groupElement(overrides: Partial<GroupElement> = {}): GroupElement {
  sequence += 1;
  return {
    id: `group-${sequence}`,
    type: 'group',
    name: `Group ${sequence}`,
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    locked: false,
    visible: true,
    childIds: [],
    ...overrides,
  };
}
