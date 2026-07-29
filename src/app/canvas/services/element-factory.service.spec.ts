import { TestBed } from '@angular/core/testing';

import { PAGE_MARGIN } from '../models/editor-config';
import { CanvasStore } from '../state/canvas.store';
import { ElementFactory } from './element-factory.service';

describe('ElementFactory', () => {
  let factory: ElementFactory;
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    factory = TestBed.inject(ElementFactory);
    canvas = TestBed.inject(CanvasStore);
  });

  it('should build each insertable kind with its type', () => {
    expect(factory.create('text').type).toBe('text');
    expect(factory.create('rectangle')).toMatchObject({ type: 'shape', shape: 'rectangle' });
    expect(factory.create('circle')).toMatchObject({ type: 'shape', shape: 'circle' });
    expect(factory.create('divider').type).toBe('divider');
  });

  it('should produce elements that are unlocked, visible and unrotated', () => {
    expect(factory.create('rectangle')).toMatchObject({
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
    });
  });

  it('should give every element a unique id', () => {
    const ids = new Set([
      factory.create('text').id,
      factory.create('text').id,
      factory.create('rectangle').id,
    ]);

    expect(ids.size).toBe(3);
  });

  it('should centre the first element on the page', () => {
    const page = canvas.activePage();
    const element = factory.createShape('rectangle');

    expect(element.x).toBe(Math.round((page.width - element.width) / 2));
    expect(element.y).toBe(Math.round((page.height - element.height) / 2));
  });

  it('should cascade later elements so identical shapes do not hide each other', () => {
    const first = factory.createShape('rectangle');
    canvas.insertElement(first);
    const second = factory.createShape('rectangle');

    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);
  });

  it('should number names per kind, from the highest already in use', () => {
    expect(factory.createShape('rectangle').name).toBe('Rectangle 1');

    canvas.insertElement(factory.createShape('rectangle'));
    canvas.insertElement(factory.createShape('rectangle'));
    expect(factory.createShape('rectangle').name).toBe('Rectangle 3');

    // A different kind numbers independently.
    expect(factory.createText().name).toBe('Text 1');
  });

  it('should keep names unique after a deletion', () => {
    const first = factory.createShape('circle');
    canvas.insertElement(first);
    canvas.insertElement(factory.createShape('circle'));

    canvas.removeElement(first.id);

    // "Circle 1" is free again, but reusing it would give two layers the same
    // name for anyone who undoes the deletion.
    expect(factory.createShape('circle').name).toBe('Circle 3');
  });

  it('should span a divider across the safe area', () => {
    const page = canvas.activePage();
    const divider = factory.createDivider();

    expect(divider.width).toBe(page.width - PAGE_MARGIN * 2);
    expect(divider.x).toBe(PAGE_MARGIN);
    // A rule has no second dimension: its box is exactly the line it draws.
    expect(divider.height).toBe(divider.strokeWidth);
  });

  it('should keep text inside the safe area', () => {
    const page = canvas.activePage();
    const text = factory.createText();

    expect(text.width).toBeLessThanOrEqual(page.width - PAGE_MARGIN * 2);
    expect(text.text.length).toBeGreaterThan(0);
  });

  it('should scale an oversized image down to the safe area, preserving its shape', () => {
    const page = canvas.activePage();
    const image = factory.createImage('data:image/png;base64,AAAA', {
      width: 4000,
      height: 3000,
    });

    expect(image.width).toBeLessThanOrEqual(page.width - PAGE_MARGIN * 2);
    expect(image.width / image.height).toBeCloseTo(4 / 3, 1);
  });

  it('should place a small image at its natural size', () => {
    const image = factory.createImage('data:image/png;base64,AAAA', { width: 120, height: 90 });

    expect(image).toMatchObject({ width: 120, height: 90 });
  });

  describe('duplicate', () => {
    it('should give the copy a fresh id and offset position', () => {
      const original = factory.createShape('rectangle');
      canvas.insertElement(original);

      const copy = factory.duplicate(original);

      expect(copy.id).not.toBe(original.id);
      expect(copy.x).toBeGreaterThan(original.x);
      expect(copy.y).toBeGreaterThan(original.y);
      expect(copy).toMatchObject({ type: 'shape', shape: 'rectangle', fill: original.fill });
    });

    it('should number the copy after the base name, not the original name', () => {
      const original = factory.createShape('rectangle');
      canvas.insertElement(original); // "Rectangle 1"

      const copy = factory.duplicate(original);
      expect(copy.name).toBe('Rectangle 2');
    });

    it('should clone array-valued properties rather than share them', () => {
      const original = factory.createDivider();
      canvas.insertElement(original);

      const copy = factory.duplicate(original);
      expect(copy).not.toBe(original);
      if (copy.type === 'divider' && original.type === 'divider') {
        expect(copy.dash).not.toBe(original.dash);
      }
    });
  });
});
