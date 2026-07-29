import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { DuplicateElementCommand } from './duplicate-element.command';

describe('DuplicateElementCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should insert the copy and remove it again on undo', () => {
    const original = shapeElement({ name: 'Rectangle 1' });
    canvas.insertElement(original);
    const copy = shapeElement({ name: 'Rectangle 2' });

    const command = new DuplicateElementCommand(canvas, [{ element: copy, index: 1 }]);
    expect(command.label).toBe('Duplicate Rectangle 2');
    expect(command.elementIds).toEqual([copy.id]);

    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([original.id, copy.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([original.id]);
  });

  it('should place a whole batch of copies as one undo step', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    const copyA = shapeElement();
    const copyB = shapeElement();

    const command = new DuplicateElementCommand(canvas, [
      { element: copyA, index: 1 },
      { element: copyB, index: 3 },
    ]);
    expect(command.label).toBe('Duplicate 2 elements');

    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([
      a.id,
      copyA.id,
      b.id,
      copyB.id,
    ]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id]);
  });
});
