import { ComponentFixture, TestBed } from '@angular/core/testing';

import { imageElement } from '../../../../../testing/canvas-fixtures';
import { CommandBus } from '../../../commands/command-bus.service';
import { ImageUploadService } from '../../../services/image-upload.service';
import { CanvasStore } from '../../../state/canvas.store';
import { ImageProperties } from './image-properties';

class StubImageUploadService {
  load(): Promise<{ src: string; natural: { width: number; height: number } }> {
    return Promise.resolve({
      src: 'data:image/png;base64,new',
      natural: { width: 200, height: 100 },
    });
  }
}

describe('ImageProperties', () => {
  let fixture: ComponentFixture<ImageProperties>;
  let canvas: CanvasStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageProperties],
      providers: [{ provide: ImageUploadService, useClass: StubImageUploadService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageProperties);
    canvas = TestBed.inject(CanvasStore);
  });

  function fileInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type=file]');
  }

  it('should open the file picker when Replace image is clicked', () => {
    const element = imageElement();
    canvas.insertElement(element);
    fixture.componentRef.setInput('element', element);
    fixture.detectChanges();

    const click = vi.spyOn(fileInput(), 'click');
    fixture.nativeElement.querySelector('.image-properties__replace').click();

    expect(click).toHaveBeenCalled();
  });

  it('should patch only the src when a replacement is chosen, keeping the box as-is', async () => {
    const element = imageElement({ src: 'data:image/png;base64,old', width: 300, height: 150 });
    canvas.insertElement(element);
    fixture.componentRef.setInput('element', element);
    fixture.detectChanges();

    const input = fileInput();
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
    // jsdom has no DataTransfer to build a real FileList from; the component
    // only ever reads `files[0]`, so a plain array-like stands in for one.
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(canvas.elementById(element.id)).toMatchObject({
      src: 'data:image/png;base64,new',
      width: 300,
      height: 150,
    });
    expect(TestBed.inject(CommandBus).canUndo()).toBe(true);
  });
});
