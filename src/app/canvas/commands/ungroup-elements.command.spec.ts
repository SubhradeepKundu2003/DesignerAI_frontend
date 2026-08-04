import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { GroupElementsCommand } from './group-elements.command';
import { UngroupElementsCommand } from './ungroup-elements.command';

describe('UngroupElementsCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should clear parentId on every member and remove the group record, without moving anything', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    const grouped = new GroupElementsCommand(canvas, [a, b]);
    grouped.execute();
    const group = canvas.groupById(grouped.groupId)!;
    const orderBeforeUngroup = canvas.elements().map((element) => element.id);

    const command = new UngroupElementsCommand(canvas, group);
    command.execute();

    expect(canvas.elementById(a.id)?.parentId).toBeUndefined();
    expect(canvas.elementById(b.id)?.parentId).toBeUndefined();
    expect(canvas.groupById(group.id)).toBeUndefined();
    expect(canvas.elements().map((element) => element.id)).toEqual(orderBeforeUngroup);
  });

  it('should restore the group and re-tie its members on undo', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    const grouped = new GroupElementsCommand(canvas, [a, b]);
    grouped.execute();
    const group = canvas.groupById(grouped.groupId)!;

    const command = new UngroupElementsCommand(canvas, group);
    command.execute();
    command.undo();

    expect(canvas.groupById(group.id)).toEqual(group);
    expect(canvas.elementById(a.id)?.parentId).toBe(group.id);
    expect(canvas.elementById(b.id)?.parentId).toBe(group.id);
  });
});
