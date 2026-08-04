import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { CanvasDocument } from '../models/canvas-document.model';
import { CanvasStore } from '../state/canvas.store';
import { LoadCanvasCommand } from './load-canvas.command';

describe('LoadCanvasCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should replace the whole document and restore the previous one on undo', () => {
    const existing = shapeElement();
    canvas.insertElement(existing);
    const before = canvas.document();

    const incoming: CanvasDocument = {
      version: 1,
      pages: [
        {
          id: 'loaded-page',
          width: 794,
          height: 1123,
          background: '#ffffff',
          elements: [shapeElement({ name: 'Loaded shape' })],
          groups: [],
        },
      ],
    };

    const command = new LoadCanvasCommand(canvas, incoming);
    command.execute();
    expect(canvas.document()).toEqual(incoming);

    command.undo();
    expect(canvas.document()).toEqual(before);
  });
});
