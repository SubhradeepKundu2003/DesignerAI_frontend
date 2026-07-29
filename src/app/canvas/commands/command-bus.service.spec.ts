import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { HistoryStore } from '../state/history.store';
import { AddElementCommand } from './add-element.command';
import { CommandBus } from './command-bus.service';
import { UpdateElementCommand } from './update-element.command';

describe('CommandBus', () => {
  let bus: CommandBus;
  let canvas: CanvasStore;
  let history: HistoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    bus = TestBed.inject(CommandBus);
    canvas = TestBed.inject(CanvasStore);
    history = TestBed.inject(HistoryStore);
  });

  it('should apply a command and make it undoable', () => {
    const element = shapeElement();

    bus.dispatch(new AddElementCommand(canvas, element));

    expect(canvas.elements()).toEqual([element]);
    expect(bus.canUndo()).toBe(true);
    expect(bus.undoLabel()).toBe(`Add ${element.name}`);
  });

  it('should reverse and replay an add', () => {
    const element = shapeElement();
    bus.dispatch(new AddElementCommand(canvas, element));

    bus.undo();
    expect(canvas.elements()).toEqual([]);
    expect(bus.canRedo()).toBe(true);

    bus.redo();
    expect(canvas.elements()).toEqual([element]);
  });

  it('should restore an element to its original depth on redo', () => {
    const bottom = shapeElement();
    const top = shapeElement();
    const inserted = shapeElement();
    bus.dispatch(new AddElementCommand(canvas, bottom));
    bus.dispatch(new AddElementCommand(canvas, top));
    bus.dispatch(new AddElementCommand(canvas, inserted, 1));

    bus.undo();
    bus.redo();

    expect(canvas.elements().map((element) => element.id)).toEqual([
      bottom.id,
      inserted.id,
      top.id,
    ]);
  });

  it('should reverse a property change to the value it replaced', () => {
    const element = shapeElement({ fill: '#ffffff' });
    canvas.insertElement(element);

    bus.dispatch(new UpdateElementCommand(canvas, element.id, { fill: '#000000' }));
    expect(canvas.elementById(element.id)).toMatchObject({ fill: '#000000' });

    bus.undo();
    expect(canvas.elementById(element.id)).toMatchObject({ fill: '#ffffff' });

    bus.redo();
    expect(canvas.elementById(element.id)).toMatchObject({ fill: '#000000' });
  });

  it('should undo a whole stack of changes in order', () => {
    const element = shapeElement({ x: 0, y: 0 });
    canvas.insertElement(element);

    bus.dispatch(new UpdateElementCommand(canvas, element.id, { x: 50 }));
    bus.dispatch(new UpdateElementCommand(canvas, element.id, { y: 80 }));

    bus.undo();
    expect(canvas.elementById(element.id)).toMatchObject({ x: 50, y: 0 });

    bus.undo();
    expect(canvas.elementById(element.id)).toMatchObject({ x: 0, y: 0 });
    expect(bus.canUndo()).toBe(false);
  });

  it('should do nothing when there is nothing to undo or redo', () => {
    expect(() => bus.undo()).not.toThrow();
    expect(() => bus.redo()).not.toThrow();
    expect(history.depth()).toBe(0);
  });
});
