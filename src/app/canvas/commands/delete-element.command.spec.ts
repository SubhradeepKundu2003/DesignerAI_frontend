import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { DeleteElementCommand } from './delete-element.command';

describe('DeleteElementCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should remove a single element and restore it at its index on undo', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new DeleteElementCommand(canvas, [a]);
    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id]);
  });

  it('should name itself after the element for a single delete', () => {
    const element = shapeElement({ name: 'Rectangle 1' });
    canvas.insertElement(element);

    expect(new DeleteElementCommand(canvas, [element]).label).toBe('Delete Rectangle 1');
  });

  it('should delete a whole multi-selection as one undo step', () => {
    const a = shapeElement();
    const b = shapeElement();
    const c = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.insertElement(c);

    const command = new DeleteElementCommand(canvas, [a, c]);
    expect(command.label).toBe('Delete 2 elements');

    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id, c.id]);
  });
});
