import { ComponentFixture, TestBed } from '@angular/core/testing';

import { textElement } from '../../../../testing/canvas-fixtures';
import { CanvasStore } from '../../state/canvas.store';
import { HistoryStore } from '../../state/history.store';
import { TextEditingStore } from '../../state/text-editing.store';
import { ViewportStore } from '../../state/viewport.store';
import { TextEditOverlay } from './text-edit-overlay';

describe('TextEditOverlay', () => {
  let fixture: ComponentFixture<TextEditOverlay>;
  let canvas: CanvasStore;
  let textEditing: TextEditingStore;
  let viewport: ViewportStore;

  function textarea(): HTMLTextAreaElement | null {
    return fixture.nativeElement.querySelector('textarea');
  }

  /** Opens `element` for editing and lets the seeding effect settle. */
  async function open(element = textElement()) {
    canvas.insertElement(element);
    textEditing.begin(element.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return element;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TextEditOverlay] }).compileComponents();
    fixture = TestBed.createComponent(TextEditOverlay);
    canvas = TestBed.inject(CanvasStore);
    textEditing = TestBed.inject(TextEditingStore);
    viewport = TestBed.inject(ViewportStore);
    fixture.detectChanges();
  });

  it('should render nothing while no element is being edited', () => {
    expect(textarea()).toBeNull();
  });

  it('should seed the textarea with the element text and focus it', async () => {
    const element = await open(textElement({ text: 'Hello world' }));

    const el = textarea()!;
    expect(el.value).toBe('Hello world');
    expect(document.activeElement).toBe(el);
    expect(element.text).toBe('Hello world');
  });

  it('should position the textarea from the element and the viewport transform', async () => {
    viewport.setViewportSize({ width: 1000, height: 1000 });
    viewport.setZoom(2);
    const element = await open(textElement({ x: 10, y: 20 }));

    const { panX, panY, zoom } = viewport.transform();
    const el = textarea()!;
    expect(el.style.left).toBe(`${element.x * zoom + panX}px`);
    expect(el.style.top).toBe(`${element.y * zoom + panY}px`);
  });

  it('should commit a changed value on blur and close the overlay', async () => {
    const element = await open(textElement({ text: 'Hello' }));

    const el = textarea()!;
    el.value = 'Hello world';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(canvas.elementById(element.id)).toMatchObject({ text: 'Hello world' });
    expect(textEditing.editingId()).toBeNull();
  });

  it('should record nothing when the text comes back unchanged', async () => {
    const element = await open(textElement({ text: 'Hello' }));
    const before = TestBed.inject(HistoryStore).depth();

    textarea()!.dispatchEvent(new Event('blur'));

    expect(TestBed.inject(HistoryStore).depth()).toBe(before);
    expect(canvas.elementById(element.id)).toMatchObject({ text: 'Hello' });
  });

  it('should discard changes on Escape', async () => {
    const element = await open(textElement({ text: 'Hello' }));

    const el = textarea()!;
    el.value = 'Changed';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    fixture.detectChanges();

    expect(textEditing.editingId()).toBeNull();
    expect(canvas.elementById(element.id)).toMatchObject({ text: 'Hello' });
  });

  it('should finish editing on plain Enter', async () => {
    await open(textElement({ text: 'Hello' }));

    const el = textarea()!;
    el.value = 'Hello world';
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    fixture.detectChanges();

    expect(textEditing.editingId()).toBeNull();
  });

  it('should leave Shift+Enter to insert a newline instead of committing', async () => {
    await open();

    const el = textarea()!;
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(textEditing.editingId()).not.toBeNull();
  });
});
