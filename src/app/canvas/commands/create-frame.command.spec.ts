import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { FrameElement } from '../models/canvas-element.model';
import { CanvasStore } from '../state/canvas.store';
import { CreateFrameCommand } from './create-frame.command';

describe('CreateFrameCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should wrap the given elements in a new, laid-out frame', () => {
    const a = shapeElement({ width: 100, height: 50 });
    const b = shapeElement({ width: 100, height: 50 });
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new CreateFrameCommand(canvas, [a, b], 'row');
    command.execute();

    const frame = canvas.elementById(command.frameId) as FrameElement;
    expect(canvas.elementById(command.frameId)).toMatchObject({
      type: 'frame',
      layout: 'row',
      childIds: [a.id, b.id],
    });
    // Laid out immediately (inset by padding from the frame's own corner),
    // not left sitting at wherever the raw pre-frame bounding box put it.
    expect(canvas.elementById(a.id)).toMatchObject({ x: frame.x + frame.padding, y: frame.y + frame.padding });
  });

  it('should default gap and padding to the active theme spacing', () => {
    const a = shapeElement();
    canvas.insertElement(a);

    const command = new CreateFrameCommand(canvas, [a], 'row');
    command.execute();

    const frame = canvas.elementById(command.frameId);
    expect(frame).toMatchObject({ gap: canvas.theme().spacing, padding: canvas.theme().spacing });
  });

  it('should restore members to their pre-frame positions on undo, and remove the frame', () => {
    const a = shapeElement({ x: 5, y: 7, width: 100, height: 50 });
    const b = shapeElement({ x: 300, y: 7, width: 100, height: 50 });
    canvas.insertElement(a);
    canvas.insertElement(b);

    const command = new CreateFrameCommand(canvas, [a, b], 'row');
    command.execute();
    command.undo();

    expect(canvas.elementById(command.frameId)).toBeUndefined();
    expect(canvas.elementById(a.id)).toMatchObject({ x: 5, y: 7 });
    expect(canvas.elementById(b.id)).toMatchObject({ x: 300, y: 7 });
  });
});
