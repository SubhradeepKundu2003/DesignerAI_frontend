import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandBus } from '../../canvas/commands/command-bus.service';
import { ImageUploadService } from '../../canvas/services/image-upload.service';
import { CanvasStore } from '../../canvas/state/canvas.store';
import { SelectionStore } from '../../canvas/state/selection.store';
import { EditorSidebar } from './editor-sidebar';

/** Stands in for the real upload pipeline, which needs a decoded image. */
class StubImageUploadService {
  load(): Promise<{ src: string; natural: { width: number; height: number } }> {
    return Promise.resolve({
      src: 'data:image/png;base64,xyz',
      natural: { width: 400, height: 300 },
    });
  }
}

describe('EditorSidebar', () => {
  let component: EditorSidebar;
  let fixture: ComponentFixture<EditorSidebar>;
  let canvas: CanvasStore;
  let selection: SelectionStore;

  /** The insert buttons, in the order they are offered. */
  const tools = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.tool'));

  const clickTool = async (label: string) => {
    tools()
      .find((button) => button.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorSidebar],
      providers: [{ provide: ImageUploadService, useClass: StubImageUploadService }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorSidebar);
    component = fixture.componentInstance;
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer the insertable element kinds', () => {
    expect(tools().map((button) => button.textContent?.trim())).toEqual([
      'Text',
      'Rectangle',
      'Circle',
      'Divider',
      'Icon',
      'Image',
    ]);
  });

  it('should open the file picker when the Image tool is clicked', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=file]');
    const click = vi.spyOn(input, 'click');

    tools()
      .find((button) => button.textContent?.trim() === 'Image')!
      .click();

    expect(click).toHaveBeenCalled();
  });

  it('should add the uploaded image and select it once a file is chosen', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=file]');
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
    // jsdom has no DataTransfer to build a real FileList from; the component
    // only ever reads `files[0]`, so a plain array-like stands in for one.
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(canvas.elements()).toHaveLength(1);
    expect(canvas.elements()[0]).toMatchObject({ type: 'image', src: 'data:image/png;base64,xyz' });
    expect(selection.selectedIds()).toEqual([canvas.elements()[0].id]);
  });

  it('should add an element of the chosen kind to the page', async () => {
    await clickTool('Circle');

    expect(canvas.elements().length).toBe(1);
    expect(canvas.elements()[0]).toMatchObject({ type: 'shape', shape: 'circle' });
  });

  it('should select what it just added', async () => {
    await clickTool('Text');

    expect(selection.selectedIds()).toEqual([canvas.elements()[0].id]);
  });

  it('should make an insertion undoable', async () => {
    await clickTool('Rectangle');

    const bus = TestBed.inject(CommandBus);
    expect(bus.canUndo()).toBe(true);

    bus.undo();
    expect(canvas.elements()).toEqual([]);
  });

  it('should stack repeated insertions in the order they were made', async () => {
    await clickTool('Rectangle');
    await clickTool('Divider');

    expect(canvas.elements().map((element) => element.type)).toEqual(['shape', 'divider']);
  });
});
