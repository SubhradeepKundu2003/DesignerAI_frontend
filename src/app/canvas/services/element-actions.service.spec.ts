import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { SelectionStore } from '../state/selection.store';
import { ElementActions } from './element-actions.service';

describe('ElementActions', () => {
  let actions: ElementActions;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let history: HistoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    actions = TestBed.inject(ElementActions);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    history = TestBed.inject(HistoryStore);
  });

  describe('deleteSelection', () => {
    it('should do nothing when nothing is selected', () => {
      expect(actions.canDelete()).toBe(false);
      actions.deleteSelection();
      expect(history.depth()).toBe(0);
    });

    it('should delete the selection and clear it', () => {
      const element = shapeElement();
      canvas.insertElement(element);
      selection.select(element.id);

      actions.deleteSelection();

      expect(canvas.elements()).toEqual([]);
      expect(selection.selectedIds()).toEqual([]);
    });

    it('should delete a multi-selection in one undo step', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);

      actions.deleteSelection();

      expect(canvas.elements()).toEqual([]);
      expect(history.depth()).toBe(1);
    });
  });

  describe('duplicateSelection', () => {
    it('should do nothing when nothing is selected', () => {
      expect(actions.canDuplicate()).toBe(false);
      actions.duplicateSelection();
      expect(history.depth()).toBe(0);
    });

    it('should duplicate the selection and select the copies', () => {
      const element = shapeElement();
      canvas.insertElement(element);
      selection.select(element.id);

      actions.duplicateSelection();

      expect(canvas.elementCount()).toBe(2);
      expect(selection.selectedIds()).not.toEqual([element.id]);
      expect(selection.selectedIds().length).toBe(1);
    });
  });

  describe('reordering', () => {
    it('should reflect whether the primary element can move further', () => {
      const bottom = shapeElement();
      const top = shapeElement();
      canvas.insertElement(bottom);
      canvas.insertElement(top);

      selection.select(bottom.id);
      expect(actions.canBringForward()).toBe(true);
      expect(actions.canSendBackward()).toBe(false);

      selection.select(top.id);
      expect(actions.canBringForward()).toBe(false);
      expect(actions.canSendBackward()).toBe(true);
    });

    it('should no-op past the top or bottom rather than recording a change', () => {
      const only = shapeElement();
      canvas.insertElement(only);
      selection.select(only.id);

      actions.bringForward();
      actions.sendBackward();

      expect(history.depth()).toBe(0);
    });

    it('should move the primary element one step', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.select(a.id);

      actions.bringForward();

      expect(canvas.elements().map((element) => element.id)).toEqual([b.id, a.id]);
    });
  });

  describe('nudgeSelection', () => {
    it('should move every unlocked selected element by the same delta', () => {
      const a = shapeElement({ x: 0, y: 0, locked: false });
      const b = shapeElement({ x: 10, y: 10, locked: true });
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);

      actions.nudgeSelection(5, -5);

      expect(canvas.elementById(a.id)).toMatchObject({ x: 5, y: -5 });
      // Locked elements are left alone.
      expect(canvas.elementById(b.id)).toMatchObject({ x: 10, y: 10 });
    });

    it('should collapse a shared merge key into one undo step', () => {
      const element = shapeElement({ x: 0, y: 0 });
      canvas.insertElement(element);
      selection.select(element.id);

      actions.nudgeSelection(1, 0, 'hold-1');
      actions.nudgeSelection(1, 0, 'hold-1');
      actions.nudgeSelection(1, 0, 'hold-1');

      expect(canvas.elementById(element.id)).toMatchObject({ x: 3, y: 0 });
      expect(history.depth()).toBe(1);
    });
  });
});
