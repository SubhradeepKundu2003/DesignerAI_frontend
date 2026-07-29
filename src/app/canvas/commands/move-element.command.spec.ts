import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { MoveElementCommand } from './move-element.command';

describe('MoveElementCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should move an element to an explicit index and undo back to its original one', () => {
    const a = shapeElement();
    const b = shapeElement();
    const c = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.insertElement(c);

    const command = new MoveElementCommand(canvas, a.id, 2);
    command.execute();
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id, c.id, a.id]);

    command.undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id, c.id]);
  });
});
