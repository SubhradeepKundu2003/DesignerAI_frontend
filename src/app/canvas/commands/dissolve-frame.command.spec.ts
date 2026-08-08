import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { FrameElement } from '../models/canvas-element.model';
import { CanvasStore } from '../state/canvas.store';
import { CreateFrameCommand } from './create-frame.command';
import { DissolveFrameCommand } from './dissolve-frame.command';

describe('DissolveFrameCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should remove the frame but leave its children where the layout put them', () => {
    const a = shapeElement({ width: 100, height: 50 });
    canvas.insertElement(a);
    const create = new CreateFrameCommand(canvas, [a], 'row');
    create.execute();
    const laidOutPosition = canvas.elementById(a.id);
    const frame = canvas.elementById(create.frameId) as FrameElement;

    const dissolve = new DissolveFrameCommand(canvas, frame);
    dissolve.execute();

    expect(canvas.elementById(create.frameId)).toBeUndefined();
    expect(canvas.elementById(a.id)).toMatchObject({ x: laidOutPosition?.x, y: laidOutPosition?.y });
  });

  it('should restore the frame at its original index on undo', () => {
    const a = shapeElement();
    canvas.insertElement(a);
    const create = new CreateFrameCommand(canvas, [a], 'row');
    create.execute();
    const frame = canvas.elementById(create.frameId) as FrameElement;
    const index = canvas.indexOf(frame.id);

    const dissolve = new DissolveFrameCommand(canvas, frame);
    dissolve.execute();
    dissolve.undo();

    expect(canvas.elementById(create.frameId)).toMatchObject({ id: frame.id, childIds: frame.childIds });
    expect(canvas.indexOf(frame.id)).toBe(index);
  });

  it('should expose the dissolved frame\'s child ids', () => {
    const a = shapeElement();
    const b = shapeElement();
    canvas.insertElement(a);
    canvas.insertElement(b);
    const create = new CreateFrameCommand(canvas, [a, b], 'row');
    create.execute();
    const frame = canvas.elementById(create.frameId) as FrameElement;

    const dissolve = new DissolveFrameCommand(canvas, frame);

    expect([...dissolve.childIds]).toEqual([a.id, b.id]);
  });
});
