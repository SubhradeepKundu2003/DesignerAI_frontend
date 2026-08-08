import { TestBed } from '@angular/core/testing';
import Konva from 'konva/lib/Core';
import { Line } from 'konva/lib/shapes/Line';
import { Text } from 'konva/lib/shapes/Text';

import {
  dividerElement,
  frameElement,
  iconElement,
  shapeElement,
  textElement,
} from '../../../testing/canvas-fixtures';
import { ElementRendererRegistry } from './element-renderer.registry';

describe('ElementRendererRegistry', () => {
  let registry: ElementRendererRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ElementRendererRegistry] });
    registry = TestBed.inject(ElementRendererRegistry);
  });

  it('should draw a text element as a Konva text node', () => {
    const element = textElement({ text: 'Newsletter', fontSize: 32, align: 'center' });

    const node = registry.create(element) as Text;

    expect(node).toBeInstanceOf(Text);
    expect(node.text()).toBe('Newsletter');
    expect(node.fontSize()).toBe(32);
    expect(node.align()).toBe('center');
  });

  it('should let a text box measure its own height', () => {
    const element = textElement({ height: 999 });

    const node = registry.create(element) as Text;

    // The authored width is honoured; the height is whatever the wrapped text
    // needs, so the stored 999 must not have been applied.
    expect(node.width()).toBe(element.width);
    expect(node.height()).not.toBe(999);
  });

  it('should draw a shape in its own box, so x/y stay the top-left corner', () => {
    const rectangle = registry.create(shapeElement({ width: 200, height: 100 }));
    const circle = registry.create(shapeElement({ shape: 'circle', width: 200, height: 100 }));

    for (const node of [rectangle, circle]) {
      expect(node.width()).toBe(200);
      expect(node.height()).toBe(100);
      expect(node.offsetX()).toBe(0);
      expect(node.offsetY()).toBe(0);
    }
  });

  it('should switch a rectangle to a circle in place', () => {
    const element = shapeElement({ shape: 'rectangle' });
    const node = registry.create(element);

    registry.update(node, { ...element, shape: 'circle' });

    expect(node.getAttr('shape')).toBe('circle');
  });

  it('should not stroke a shape whose stroke width is zero', () => {
    const node = registry.create(shapeElement({ strokeWidth: 0 }));
    expect(node.getAttr('strokeEnabled')).toBe(false);

    registry.update(node, shapeElement({ strokeWidth: 3 }));
    expect(node.getAttr('strokeEnabled')).toBe(true);
  });

  it('should draw a divider down the middle of its box', () => {
    const node = registry.create(dividerElement({ width: 300, height: 4 })) as Line;

    expect(node).toBeInstanceOf(Line);
    expect(node.points()).toEqual([0, 2, 300, 2]);
  });

  it('should only dash a divider that asks for it', () => {
    const solid = registry.create(dividerElement({ dash: [] }));
    expect(solid.getAttr('dashEnabled')).toBe(false);

    const dashed = registry.create(dividerElement({ dash: [6, 4] }));
    expect(dashed.getAttr('dashEnabled')).toBe(true);
    expect(dashed.getAttr('dash')).toEqual([6, 4]);
  });

  it('should draw an icon at its box size and colour', () => {
    const node = registry.create(
      iconElement({ iconId: 'check', fill: '#0d9488', width: 40, height: 40 }),
    ) as Konva.Shape;

    expect(node.width()).toBe(40);
    expect(node.height()).toBe(40);
    expect(node.getAttr('iconId')).toBe('check');
    expect(node.fill()).toBe('#0d9488');
  });

  it('should draw a frame as its own box', () => {
    const node = registry.create(
      frameElement({ width: 300, height: 120, background: '#eef2ff' }),
    ) as Konva.Shape;

    expect(node.width()).toBe(300);
    expect(node.height()).toBe(120);
    expect(node.fill()).toBe('#eef2ff');
  });

  it('should update a node in place rather than rebuilding it', () => {
    const element = textElement({ text: 'Before' });
    const node = registry.create(element) as Text;

    registry.update(node, { ...element, text: 'After' });

    expect(node.text()).toBe('After');
  });
});
