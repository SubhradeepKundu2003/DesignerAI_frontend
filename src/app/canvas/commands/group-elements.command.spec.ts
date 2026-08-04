import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { GroupElementsCommand } from './group-elements.command';

describe('GroupElementsCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should tag members with the new group and gather them contiguously', () => {
    const a = shapeElement({ name: 'A' });
    const b = shapeElement({ name: 'B' });
    const c = shapeElement({ name: 'C' });
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.insertElement(c);

    const command = new GroupElementsCommand(canvas, [a, c]);
    command.execute();

    expect(canvas.elements().map((element) => element.id)).toEqual([b.id, a.id, c.id]);
    expect(canvas.elementById(a.id)?.parentId).toBe(command.groupId);
    expect(canvas.elementById(c.id)?.parentId).toBe(command.groupId);
    expect(canvas.groupById(command.groupId)?.childIds).toEqual([a.id, c.id]);
  });

  it('should compute the group box as the bounding box of its members', () => {
    const a = shapeElement({ x: 0, y: 0, width: 50, height: 50, rotation: 0 });
    const b = shapeElement({ x: 100, y: 100, width: 50, height: 50, rotation: 0 });
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new GroupElementsCommand(canvas, [a, b]);
    command.execute();

    expect(canvas.groupById(command.groupId)).toMatchObject({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('should undo back to the exact original positions and remove the group record', () => {
    const a = shapeElement({ name: 'A' });
    const b = shapeElement({ name: 'B' });
    const c = shapeElement({ name: 'C' });
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.insertElement(c);

    const command = new GroupElementsCommand(canvas, [a, c]);
    command.execute();
    command.undo();

    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id, c.id]);
    expect(canvas.elementById(a.id)?.parentId).toBeUndefined();
    expect(canvas.elementById(c.id)?.parentId).toBeUndefined();
    expect(canvas.groupById(command.groupId)).toBeUndefined();
  });
});
