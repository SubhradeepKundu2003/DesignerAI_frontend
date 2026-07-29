import { ComponentFixture, TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { AddElementCommand } from '../../canvas/commands/add-element.command';
import { CommandBus } from '../../canvas/commands/command-bus.service';
import { CanvasStore } from '../../canvas/state/canvas.store';
import { SelectionStore } from '../../canvas/state/selection.store';
import { EditorToolbar } from './editor-toolbar';

describe('EditorToolbar', () => {
  let component: EditorToolbar;
  let fixture: ComponentFixture<EditorToolbar>;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let bus: CommandBus;

  /** Finds a toolbar button by the start of its accessible name. */
  const button = (name: string): HTMLButtonElement =>
    Array.from(fixture.nativeElement.querySelectorAll('button')).find((element) =>
      (element as HTMLButtonElement).getAttribute('aria-label')?.startsWith(name),
    ) as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorToolbar);
    component = fixture.componentInstance;
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    bus = TestBed.inject(CommandBus);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable undo and redo while there is no history', () => {
    expect(button('Undo').disabled).toBe(true);
    expect(button('Redo').disabled).toBe(true);
  });

  it('should name the change undo would reverse', async () => {
    const element = shapeElement({ name: 'Rectangle 1' });
    bus.dispatch(new AddElementCommand(canvas, element));
    await fixture.whenStable();

    expect(button('Undo').getAttribute('aria-label')).toBe('Undo — add rectangle 1');
    expect(button('Undo').disabled).toBe(false);
  });

  it('should undo and redo from the toolbar', async () => {
    const element = shapeElement();
    bus.dispatch(new AddElementCommand(canvas, element));
    await fixture.whenStable();

    button('Undo').click();
    await fixture.whenStable();
    expect(canvas.elements()).toEqual([]);

    button('Redo').click();
    await fixture.whenStable();
    expect(canvas.elements()).toEqual([element]);
  });

  it('should disable the object and arrange buttons until something is selected', () => {
    expect(button('Duplicate').disabled).toBe(true);
    expect(button('Delete').disabled).toBe(true);
    expect(button('Bring forward').disabled).toBe(true);
    expect(button('Send backward').disabled).toBe(true);
  });

  it('should duplicate the selection from the toolbar', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);
    fixture.detectChanges();
    await fixture.whenStable();

    button('Duplicate').click();
    await fixture.whenStable();

    expect(canvas.elementCount()).toBe(2);
  });

  it('should delete the selection from the toolbar', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);
    fixture.detectChanges();
    await fixture.whenStable();

    button('Delete').click();
    await fixture.whenStable();

    expect(canvas.elements()).toEqual([]);
  });

  it('should only enable bring forward / send backward when there is room to move', async () => {
    const bottom = shapeElement();
    const top = shapeElement();
    canvas.insertElement(bottom);
    canvas.insertElement(top);
    selection.select(bottom.id);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(button('Bring forward').disabled).toBe(false);
    expect(button('Send backward').disabled).toBe(true);

    button('Bring forward').click();
    await fixture.whenStable();

    expect(canvas.elements().map((element) => element.id)).toEqual([top.id, bottom.id]);
  });
});
