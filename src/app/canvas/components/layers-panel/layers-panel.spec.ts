import { ComponentFixture, TestBed } from '@angular/core/testing';

import { groupElement, shapeElement } from '../../../../testing/canvas-fixtures';
import { CommandBus } from '../../commands/command-bus.service';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { LayersPanel } from './layers-panel';

describe('LayersPanel', () => {
  let fixture: ComponentFixture<LayersPanel>;
  let canvas: CanvasStore;
  let selection: SelectionStore;

  const rows = (): HTMLLIElement[] => Array.from(fixture.nativeElement.querySelectorAll('.row'));
  const nameOf = (row: HTMLLIElement) => row.querySelector('.row__name')?.textContent?.trim();
  const actionButtons = (row: HTMLLIElement): HTMLButtonElement[] =>
    Array.from(row.querySelectorAll('.row__action'));

  /**
   * jsdom has no `DragEvent`; the component tracks the drag by its own signal
   * rather than reading `dataTransfer` back, so a plain cancelable event
   * (accessed through optional chaining) is all a synthetic drag needs here.
   */
  function dragEvent(type: string): DragEvent {
    return new Event(type, { cancelable: true, bubbles: true }) as DragEvent;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LayersPanel] }).compileComponents();

    fixture = TestBed.createComponent(LayersPanel);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    await fixture.whenStable();
  });

  it('should show the empty state with no elements', () => {
    expect(fixture.nativeElement.querySelector('.empty')).not.toBeNull();
    expect(rows().length).toBe(0);
  });

  it('should list elements topmost first', async () => {
    const bottom = shapeElement({ name: 'Bottom' });
    const top = shapeElement({ name: 'Top' });
    canvas.insertElement(bottom);
    canvas.insertElement(top);
    await fixture.whenStable();

    expect(rows().map(nameOf)).toEqual(['Top', 'Bottom']);
  });

  it('should select an element on click', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    await fixture.whenStable();

    rows()[0].click();

    expect(selection.selectedIds()).toEqual([element.id]);
  });

  it('should mark the selected row', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);
    await fixture.whenStable();

    expect(rows()[0].classList.contains('row--selected')).toBe(true);
  });

  it('should toggle visibility without changing the selection', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    await fixture.whenStable();

    actionButtons(rows()[0])[0].click();
    await fixture.whenStable();

    expect(canvas.elementById(element.id)?.visible).toBe(false);
    expect(selection.selectedIds()).toEqual([]);

    const bus = TestBed.inject(CommandBus);
    bus.undo();
    expect(canvas.elementById(element.id)?.visible).toBe(true);
  });

  it('should toggle locked state', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    await fixture.whenStable();

    actionButtons(rows()[0])[1].click();
    await fixture.whenStable();

    expect(canvas.elementById(element.id)?.locked).toBe(true);
  });

  it('should rename an element on commit', async () => {
    const element = shapeElement({ name: 'Rectangle 1' });
    canvas.insertElement(element);
    await fixture.whenStable();

    rows()[0].querySelector<HTMLElement>('.row__name')!.dispatchEvent(new Event('dblclick', { bubbles: true }));
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('.row__name-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'Header';
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(canvas.elementById(element.id)?.name).toBe('Header');
  });

  it('should not rename to an empty string', async () => {
    const element = shapeElement({ name: 'Rectangle 1' });
    canvas.insertElement(element);
    await fixture.whenStable();

    rows()[0].querySelector<HTMLElement>('.row__name')!.dispatchEvent(new Event('dblclick', { bubbles: true }));
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('.row__name-input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(canvas.elementById(element.id)?.name).toBe('Rectangle 1');
  });

  it('should move a dragged element to the dropped row and make it undoable', async () => {
    const a = shapeElement({ name: 'A' });
    const b = shapeElement({ name: 'B' });
    const c = shapeElement({ name: 'C' });
    canvas.insertElement(a);
    canvas.insertElement(b);
    canvas.insertElement(c);
    await fixture.whenStable();

    // Displayed topmost-first: [C, B, A]. Drag A's handle onto C's row.
    const handles = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.row__handle'));
    const targetRow = rows()[0];

    handles()[2].dispatchEvent(dragEvent('dragstart'));
    targetRow.dispatchEvent(dragEvent('dragover'));
    targetRow.dispatchEvent(dragEvent('drop'));
    await fixture.whenStable();

    // A takes the array slot C held, so it ends up drawn on top of both.
    expect(canvas.elements().map((element) => element.id)).toEqual([b.id, c.id, a.id]);

    TestBed.inject(CommandBus).undo();
    expect(canvas.elements().map((element) => element.id)).toEqual([a.id, b.id, c.id]);
  });

  describe('groups', () => {
    function place() {
      const a = shapeElement({ name: 'A' });
      const b = shapeElement({ name: 'B' });
      canvas.insertElement(a);
      canvas.insertElement(b);
      canvas.groupElements(groupElement({ id: 'g1', name: 'My group', childIds: [a.id, b.id] }), [
        a.id,
        b.id,
      ]);
      return { a, b };
    }

    it('should show a header row above its indented members', async () => {
      place();
      await fixture.whenStable();

      const displayed = rows();
      expect(displayed.length).toBe(3);
      expect(displayed[0].classList.contains('row--group')).toBe(true);
      expect(nameOf(displayed[0])).toBe('My group');
      expect(displayed[1].classList.contains('row--indent')).toBe(true);
      expect(displayed[2].classList.contains('row--indent')).toBe(true);
    });

    it('should select the whole group on header click', async () => {
      place();
      await fixture.whenStable();

      rows()[0].click();

      expect(selection.selectedIds()).toEqual(['g1']);
    });

    it('should collapse and expand a group', async () => {
      place();
      await fixture.whenStable();

      (fixture.nativeElement.querySelector('.row__collapse') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(rows().length).toBe(1);

      (fixture.nativeElement.querySelector('.row__collapse') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(rows().length).toBe(3);
    });

    it('should not make a grouped row draggable', async () => {
      place();
      canvas.insertElement(shapeElement({ name: 'Loose' }));
      await fixture.whenStable();

      // Displayed topmost-first: [Loose, group header, B, A].
      const handles: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.row__handle'),
      );
      expect(handles[0].getAttribute('draggable')).toBe('true');
      expect(handles[1].getAttribute('draggable')).toBe('false');
      expect(handles[2].getAttribute('draggable')).toBe('false');
    });

    it('should toggle a group\'s visibility and lock as one undoable step each', async () => {
      place();
      await fixture.whenStable();

      const groupActions = actionButtons(rows()[0]);
      groupActions[0].click();
      await fixture.whenStable();
      expect(canvas.groupById('g1')?.visible).toBe(false);

      groupActions[1].click();
      await fixture.whenStable();
      expect(canvas.groupById('g1')?.locked).toBe(true);

      expect(selection.selectedIds()).toEqual([]);
    });
  });
});
