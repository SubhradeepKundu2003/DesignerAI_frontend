import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from './canvas.store';
import { SelectionStore } from './selection.store';

describe('SelectionStore', () => {
  let selection: SelectionStore;
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
  });

  it('should start with nothing selected', () => {
    expect(selection.hasSelection()).toBe(false);
    expect(selection.primary()).toBeNull();
  });

  it('should resolve selected ids against the document', () => {
    const element = shapeElement();
    canvas.insertElement(element);

    selection.select(element.id);

    expect(selection.selectedElements()).toEqual([element]);
    expect(selection.primary()).toEqual(element);
  });

  it('should replace the selection on select', () => {
    const first = shapeElement();
    const second = shapeElement();
    canvas.insertElement(first);
    canvas.insertElement(second);

    selection.select(first.id);
    selection.select(second.id);

    expect(selection.selectedIds()).toEqual([second.id]);
  });

  it('should extend and shrink the selection on toggle', () => {
    const first = shapeElement();
    const second = shapeElement();
    canvas.insertElement(first);
    canvas.insertElement(second);

    selection.select(first.id);
    selection.toggle(second.id);
    expect(selection.selectedIds()).toEqual([first.id, second.id]);

    selection.toggle(second.id);
    expect(selection.selectedIds()).toEqual([first.id]);
  });

  it('should report selected elements in paint order, not click order', () => {
    const bottom = shapeElement();
    const top = shapeElement();
    canvas.insertElement(bottom);
    canvas.insertElement(top);

    selection.selectMany([top.id, bottom.id]);

    expect(selection.selectedElements().map((element) => element.id)).toEqual([bottom.id, top.id]);
  });

  it('should drop elements that have left the document', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    canvas.removeElement(element.id);

    expect(selection.selectedElements()).toEqual([]);
    expect(selection.hasSelection()).toBe(false);
  });

  it('should clear', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    selection.clear();

    expect(selection.selectedIds()).toEqual([]);
  });
});
