import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { UpdateElementCommand } from './update-element.command';

describe('UpdateElementCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should name itself after the properties it changes', () => {
    const element = shapeElement();
    canvas.insertElement(element);

    expect(new UpdateElementCommand(canvas, element.id, { x: 1, y: 2 }).label).toBe('Change x, y');
    expect(
      new UpdateElementCommand(canvas, element.id, { x: 1 }, { label: 'Move element' }).label,
    ).toBe('Move element');
  });

  it('should capture the previous values when it is built, not when it runs', () => {
    const element = shapeElement({ x: 0 });
    canvas.insertElement(element);

    const command = new UpdateElementCommand(canvas, element.id, { x: 100 });
    // Something else moves the element before this command is dispatched.
    canvas.patchElement(element.id, { x: 40 });

    command.execute();
    command.undo();

    expect(canvas.elementById(element.id)).toMatchObject({ x: 0 });
  });

  it('should survive an element that has since been deleted', () => {
    const element = shapeElement();
    canvas.insertElement(element);
    const command = new UpdateElementCommand(canvas, element.id, { x: 5 });
    canvas.removeElement(element.id);

    expect(() => {
      command.execute();
      command.undo();
    }).not.toThrow();
  });

  describe('merging', () => {
    const scrub = (canvas: CanvasStore, id: string, opacity: number) =>
      new UpdateElementCommand(canvas, id, { opacity }, { mergeKey: 'opacity-drag-1' });

    it('should collapse one interaction into a single undo step', () => {
      const element = shapeElement({ opacity: 1 });
      canvas.insertElement(element);

      const first = scrub(canvas, element.id, 0.8);
      first.execute();
      const second = scrub(canvas, element.id, 0.4);
      second.execute();

      expect(first.mergeWith(second)).toBe(true);

      // Undoing the merged command reaches back past both steps.
      first.undo();
      expect(canvas.elementById(element.id)).toMatchObject({ opacity: 1 });

      // And redo replays the whole gesture, not just its first frame.
      first.execute();
      expect(canvas.elementById(element.id)).toMatchObject({ opacity: 0.4 });
    });

    it('should keep separate interactions apart', () => {
      const element = shapeElement();
      canvas.insertElement(element);

      const first = new UpdateElementCommand(
        canvas,
        element.id,
        { opacity: 0.5 },
        { mergeKey: 'opacity-drag-1' },
      );
      const second = new UpdateElementCommand(
        canvas,
        element.id,
        { opacity: 0.2 },
        { mergeKey: 'opacity-drag-2' },
      );

      expect(first.mergeWith(second)).toBe(false);
    });

    it('should not merge unkeyed updates, or updates to another element', () => {
      const element = shapeElement();
      const other = shapeElement();
      canvas.insertElement(element);
      canvas.insertElement(other);

      const unkeyed = new UpdateElementCommand(canvas, element.id, { x: 1 });
      expect(unkeyed.mergeWith(new UpdateElementCommand(canvas, element.id, { x: 2 }))).toBe(false);

      const keyed = new UpdateElementCommand(canvas, element.id, { x: 1 }, { mergeKey: 'drag' });
      expect(
        keyed.mergeWith(new UpdateElementCommand(canvas, other.id, { x: 2 }, { mergeKey: 'drag' })),
      ).toBe(false);
    });
  });
});
