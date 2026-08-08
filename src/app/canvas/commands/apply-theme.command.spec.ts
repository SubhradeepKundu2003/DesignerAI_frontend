import { TestBed } from '@angular/core/testing';

import { dividerElement, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { DesignTheme } from '../models/design-theme.model';
import { CanvasStore } from '../state/canvas.store';
import { ApplyThemeCommand } from './apply-theme.command';

const THEME_A: DesignTheme = {
  id: 'theme-a',
  name: 'Theme A',
  colors: {
    ink: '#111111',
    muted: '#222222',
    surface: '#ffffff',
    border: '#333333',
    accents: [{ name: 'Blue', solid: '#0000ff', tint: '#eeeeff' }],
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: 8,
  spacing: 20,
};

const THEME_B: DesignTheme = {
  id: 'theme-b',
  name: 'Theme B',
  colors: {
    ink: '#444444',
    muted: '#555555',
    surface: '#fafafa',
    border: '#666666',
    accents: [{ name: 'Green', solid: '#00ff00', tint: '#eeffee' }],
  },
  fonts: { heading: 'Georgia', body: 'Arial' },
  radius: 2,
  spacing: 24,
};

describe('ApplyThemeCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should set the document theme', () => {
    new ApplyThemeCommand(canvas, THEME_A).execute();
    expect(canvas.document().theme).toBe(THEME_A);
  });

  it('should recompute a themed element to the new theme, and undo back to the old colour', () => {
    const shape = shapeElement({ fill: '#c7d2fe', fillRef: 'accent-0-solid' });
    canvas.insertElement(shape);

    const command = new ApplyThemeCommand(canvas, THEME_A);
    command.execute();
    expect(canvas.elementById(shape.id)).toMatchObject({ fill: '#0000ff' });

    command.undo();
    expect(canvas.elementById(shape.id)).toMatchObject({ fill: '#c7d2fe' });
    expect(canvas.document().theme).toBeUndefined();
  });

  it('should leave an element with no *Ref untouched', () => {
    const shape = shapeElement({ fill: '#abcdef' });
    canvas.insertElement(shape);

    new ApplyThemeCommand(canvas, THEME_A).execute();

    expect(canvas.elementById(shape.id)).toMatchObject({ fill: '#abcdef' });
  });

  it('should resolve text fill, shape stroke and divider stroke refs', () => {
    const text = textElement({ fill: '#000000', fillRef: 'ink' });
    const shape = shapeElement({ stroke: '#000000', strokeRef: 'border' });
    const divider = dividerElement({ stroke: '#000000', strokeRef: 'muted' });
    canvas.insertElement(text);
    canvas.insertElement(shape);
    canvas.insertElement(divider);

    new ApplyThemeCommand(canvas, THEME_A).execute();

    expect(canvas.elementById(text.id)).toMatchObject({ fill: '#111111' });
    expect(canvas.elementById(shape.id)).toMatchObject({ stroke: '#333333' });
    expect(canvas.elementById(divider.id)).toMatchObject({ stroke: '#222222' });
  });

  it('should recolour every page, not just the active one', () => {
    canvas.insertPage({
      id: 'page-2',
      name: 'Page 2',
      width: 794,
      height: 1123,
      background: '#fff',
      elements: [],
      groups: [],
    });

    const onFirstPage = shapeElement({ fill: '#000000', fillRef: 'ink' });
    canvas.setActivePage(canvas.document().pages[0].id);
    canvas.insertElement(onFirstPage);

    const onSecondPage = shapeElement({ fill: '#000000', fillRef: 'ink' });
    canvas.setActivePage('page-2');
    canvas.insertElement(onSecondPage);

    new ApplyThemeCommand(canvas, THEME_A).execute();

    expect(canvas.elementById(onFirstPage.id)).toMatchObject({ fill: '#111111' });
    expect(canvas.elementById(onSecondPage.id)).toMatchObject({ fill: '#111111' });
  });

  it('should switch cleanly between two themes and back', () => {
    const shape = shapeElement({ fill: '#c7d2fe', fillRef: 'accent-0-solid' });
    canvas.insertElement(shape);

    const toA = new ApplyThemeCommand(canvas, THEME_A);
    toA.execute();
    const toB = new ApplyThemeCommand(canvas, THEME_B);
    toB.execute();
    expect(canvas.elementById(shape.id)).toMatchObject({ fill: '#00ff00' });

    toB.undo();
    expect(canvas.elementById(shape.id)).toMatchObject({ fill: '#0000ff' });
    expect(canvas.document().theme).toBe(THEME_A);
  });
});
