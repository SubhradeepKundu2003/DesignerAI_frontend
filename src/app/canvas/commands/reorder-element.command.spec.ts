import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { ReorderElementCommand } from './reorder-element.command';

describe('ReorderElementCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should move an element forward and undo back to its original index', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new ReorderElementCommand(canvas, a.id, 'forward');
    expect(command.label).toBe('Bring forward');

    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id, a.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id]);
  });

  it('should move an element backward and undo back to its original index', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new ReorderElementCommand(canvas, b.id, 'backward');
    expect(command.label).toBe('Send backward');

    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id, a.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id]);
  });
});
