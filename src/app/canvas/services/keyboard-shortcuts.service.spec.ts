import { TestBed } from '@angular/core/testing';

import { groupElement, shapeElement } from '../../../testing/canvas-fixtures';
import { AddElementCommand } from '../commands/add-element.command';
import { CommandBus } from '../commands/command-bus.service';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { SelectionStore } from '../state/selection.store';
import { KeyboardShortcuts } from './keyboard-shortcuts.service';

/** The handful of `KeyboardEvent` fields the service actually reads. */
function keyEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: '',
    code: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    target: document.body,
    preventDefault: () => {},
    ...overrides,
  } as KeyboardEvent;
}

describe('KeyboardShortcuts', () => {
  let shortcuts: KeyboardShortcuts;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let history: HistoryStore;
  let bus: CommandBus;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    shortcuts = TestBed.inject(KeyboardShortcuts);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    history = TestBed.inject(HistoryStore);
    bus = TestBed.inject(CommandBus);
  });

  it('should ignore every shortcut while a form control has focus', () => {
    const input = document.createElement('input');
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'Delete', target: input }));

    expect(canvas.elements()).toEqual([element]);
  });

  it('should undo and redo with Ctrl+Z and Ctrl+Shift+Z', () => {
    bus.dispatch(new AddElementCommand(canvas, shapeElement()));

    shortcuts.handleKeydown(keyEvent({ key: 'z', ctrlKey: true }));
    expect(canvas.elements()).toEqual([]);

    shortcuts.handleKeydown(keyEvent({ key: 'z', ctrlKey: true, shiftKey: true }));
    expect(canvas.elementCount()).toBe(1);
  });

  it('should redo with Ctrl+Y', () => {
    bus.dispatch(new AddElementCommand(canvas, shapeElement()));
    bus.undo();

    shortcuts.handleKeydown(keyEvent({ key: 'y', ctrlKey: true }));

    expect(canvas.elementCount()).toBe(1);
  });

  it('should delete the selection on Delete or Backspace', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'Delete' }));

    expect(canvas.elements()).toEqual([]);
  });

  it('should duplicate the selection on Ctrl+D', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'd', ctrlKey: true }));

    expect(canvas.elementCount()).toBe(2);
  });

  it('should clear the selection on Escape', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'Escape' }));

    expect(selection.selectedIds()).toEqual([]);
  });

  it('should exit an entered group on Escape', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.groupElements(groupElement({ id: 'g1', childIds: [a.id, b.id] }), [a.id, b.id]);
    selection.enterGroup('g1');

    shortcuts.handleKeydown(keyEvent({ key: 'Escape' }));

    expect(selection.enteredGroupId()).toBeNull();
  });

  it('should group the selection on Ctrl+G and ungroup on Ctrl+Shift+G', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    selection.selectMany([a.id, b.id]);

    shortcuts.handleKeydown(keyEvent({ key: 'g', ctrlKey: true }));
    expect(canvas.elementById(a.id)?.parentId).toBeDefined();
    const groupId = canvas.elementById(a.id)!.parentId!;

    shortcuts.handleKeydown(keyEvent({ key: 'g', ctrlKey: true, shiftKey: true }));
    expect(canvas.elementById(a.id)?.parentId).toBeUndefined();
    expect(canvas.groupById(groupId)).toBeUndefined();
  });

  it('should nudge the selection with the arrow keys, and further with Shift', () => {
    const element = shapeElement({ x: 0, y: 0 });
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'ArrowRight' }));
    expect(canvas.elementById(element.id)).toMatchObject({ x: 1, y: 0 });

    shortcuts.handleKeydown(keyEvent({ key: 'ArrowDown', shiftKey: true }));
    expect(canvas.elementById(element.id)).toMatchObject({ x: 1, y: 10 });
  });

  it('should collapse a held arrow key into one undo step, and split on release', () => {
    const element = shapeElement({ x: 0, y: 0 });
    canvas.insertElement(element);
    selection.select(element.id);

    shortcuts.handleKeydown(keyEvent({ key: 'ArrowRight' }));
    shortcuts.handleKeydown(keyEvent({ key: 'ArrowRight', repeat: true }));
    shortcuts.handleKeydown(keyEvent({ key: 'ArrowRight', repeat: true }));
    expect(history.depth()).toBe(1);
    expect(canvas.elementById(element.id)).toMatchObject({ x: 3 });

    shortcuts.handleKeyup(keyEvent({ key: 'ArrowRight' }));
    shortcuts.handleKeydown(keyEvent({ key: 'ArrowRight' }));
    expect(history.depth()).toBe(2);
    expect(canvas.elementById(element.id)).toMatchObject({ x: 4 });
  });

  it('should track the space bar as the pan modifier', () => {
    expect(shortcuts.spaceHeld()).toBe(false);

    shortcuts.handleKeydown(keyEvent({ code: 'Space' }));
    expect(shortcuts.spaceHeld()).toBe(true);

    shortcuts.handleKeyup(keyEvent({ code: 'Space' }));
    expect(shortcuts.spaceHeld()).toBe(false);
  });

  it('should not treat the space bar as a shortcut while typing', () => {
    const input = document.createElement('input');

    shortcuts.handleKeydown(keyEvent({ code: 'Space', target: input }));

    expect(shortcuts.spaceHeld()).toBe(false);
  });
});
