import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CommandBus } from '../commands/command-bus.service';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { SelectionStore } from '../state/selection.store';
import { ElementActions } from './element-actions.service';

describe('ElementActions', () => {
  let actions: ElementActions;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let history: HistoryStore;
  let commands: CommandBus;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    actions = TestBed.inject(ElementActions);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    history = TestBed.inject(HistoryStore);
    commands = TestBed.inject(CommandBus);
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

    it('should give each duplicate in a multi-selection a distinct name', () => {
      const a = shapeElement({ name: 'Rectangle 1' });
      const b = shapeElement({ name: 'Rectangle 2' });
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);

      actions.duplicateSelection();

      const names = canvas.elements().map((element) => element.name);
      expect(new Set(names).size).toBe(names.length);
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

  describe('grouping', () => {
    it('should require at least two top-level, unlocked elements to group', () => {
      const a = shapeElement();
      const b = shapeElement({ locked: true });
      canvas.insertElement(a);
      canvas.insertElement(b);

      selection.select(a.id);
      expect(actions.canGroup()).toBe(false);

      selection.selectMany([a.id, b.id]);
      expect(actions.canGroup()).toBe(false);
    });

    it('should group the selection into one group and select it', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);

      actions.groupSelection();

      expect(selection.primaryGroup()).not.toBeNull();
      expect(canvas.elementById(a.id)?.parentId).toBe(selection.selectedIds()[0]);
      expect(canvas.elementById(b.id)?.parentId).toBe(selection.selectedIds()[0]);
    });

    it('should ungroup and select the loose members', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);
      actions.groupSelection();

      actions.ungroupSelection();

      expect(actions.canUngroup()).toBe(false);
      expect(canvas.elementById(a.id)?.parentId).toBeUndefined();
      expect(canvas.elementById(b.id)?.parentId).toBeUndefined();
      expect([...selection.selectedIds()].sort()).toEqual([a.id, b.id].sort());
    });

    it('should delete a selected group and its members as one undo step', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);
      actions.groupSelection();
      const groupId = selection.selectedIds()[0];

      const depthAfterGrouping = history.depth();
      actions.deleteSelection();
      expect(canvas.elements()).toEqual([]);
      expect(canvas.groupById(groupId)).toBeUndefined();
      // The delete itself is one undo step, on top of the earlier group step.
      expect(history.depth()).toBe(depthAfterGrouping + 1);

      commands.undo();
      expect(canvas.elements().map((element) => element.id).sort()).toEqual([a.id, b.id].sort());
      expect(canvas.groupById(groupId)).toBeDefined();
    });

    it('should duplicate a selected group into a fresh group', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);
      actions.groupSelection();
      const originalGroupId = selection.selectedIds()[0];

      actions.duplicateSelection();

      const newGroupId = selection.selectedIds()[0];
      expect(newGroupId).not.toBe(originalGroupId);
      const newGroup = canvas.groupById(newGroupId)!;
      expect(newGroup.childIds.length).toBe(2);
      for (const childId of newGroup.childIds) {
        expect(canvas.elementById(childId)?.parentId).toBe(newGroupId);
      }
      // The original group and its members are untouched.
      expect(canvas.groupById(originalGroupId)?.childIds.length).toBe(2);

      // The new group's members land as one contiguous run — not interleaved
      // with the originals — and each gets its own, non-colliding name.
      const parentIds = canvas.elements().map((element) => element.parentId);
      const newRunStart = parentIds.indexOf(newGroupId);
      const newRunEnd = parentIds.lastIndexOf(newGroupId);
      expect(newRunEnd - newRunStart).toBe(1);
      const newNames = newGroup.childIds.map((id) => canvas.elementById(id)!.name);
      expect(new Set(newNames).size).toBe(2);
    });

    it('should not let bring-forward/send-backward act on a grouped selection', () => {
      const a = shapeElement();
      const b = shapeElement();
      canvas.insertElement(a);
      canvas.insertElement(b);
      selection.selectMany([a.id, b.id]);
      actions.groupSelection();

      expect(actions.canBringForward()).toBe(false);
      expect(actions.canSendBackward()).toBe(false);
    });
  });
});
