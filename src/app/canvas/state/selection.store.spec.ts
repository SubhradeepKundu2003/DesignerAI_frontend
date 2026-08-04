import { TestBed } from '@angular/core/testing';

import { groupElement, shapeElement } from '../../../testing/canvas-fixtures';
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

  describe('groups', () => {
    function place(): { a: ReturnType<typeof shapeElement>; b: ReturnType<typeof shapeElement> } {
      const a = shapeElement({ name: 'A' });
      const b = shapeElement({ name: 'B' });
      canvas.insertElement(a);
      canvas.insertElement(b);
      canvas.groupElements(groupElement({ id: 'g1', childIds: [a.id, b.id] }), [a.id, b.id]);
      return { a, b };
    }

    it('should expand a selected group into its members', () => {
      const { a, b } = place();

      selection.select('g1');

      expect(selection.selectedElements().map((element) => element.id)).toEqual([a.id, b.id]);
      expect(selection.primary()?.id).toBe(a.id);
    });

    it('should expose the group itself only when it is the sole selection', () => {
      const { a } = place();
      selection.select('g1');
      expect(selection.primaryGroup()?.id).toBe('g1');

      selection.selectMany(['g1', a.id]);
      expect(selection.primaryGroup()).toBeNull();
    });

    it('should mark a grouped child as selected when its group is', () => {
      const { a, b } = place();

      selection.select('g1');

      expect(selection.isSelected(a.id)).toBe(true);
      expect(selection.isSelected(b.id)).toBe(true);
      expect(selection.isSelected('g1')).toBe(true);
    });

    it('should self-heal when the entered group is ungrouped elsewhere', () => {
      place();
      selection.enterGroup('g1');
      expect(selection.enteredGroupId()).toBe('g1');

      canvas.removeGroup('g1');

      expect(selection.enteredGroupId()).toBeNull();
    });

    it('should exit a group on demand', () => {
      place();
      selection.enterGroup('g1');

      selection.exitGroup();

      expect(selection.enteredGroupId()).toBeNull();
    });
  });
});
