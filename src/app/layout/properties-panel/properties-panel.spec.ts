import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  dividerElement,
  imageElement,
  shapeElement,
  textElement,
} from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../../canvas/state/canvas.store';
import { SelectionStore } from '../../canvas/state/selection.store';
import { PropertiesPanel } from './properties-panel';

describe('PropertiesPanel', () => {
  let component: PropertiesPanel;
  let fixture: ComponentFixture<PropertiesPanel>;
  let canvas: CanvasStore;
  let selection: SelectionStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertiesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesPanel);
    component = fixture.componentInstance;
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty state when nothing is selected', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.properties__empty')).toBeTruthy();
    expect(host.querySelector('app-common-properties')).toBeFalsy();
  });

  it('should show the common block plus the matching per-type form for the selection', async () => {
    const element = textElement();
    canvas.insertElement(element);
    selection.select(element.id);
    fixture.detectChanges();
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.properties__empty')).toBeFalsy();
    expect(host.querySelector('app-common-properties')).toBeTruthy();
    expect(host.querySelector('app-text-properties')).toBeTruthy();
    expect(host.querySelector('app-shape-properties')).toBeFalsy();
    expect(host.querySelector('app-divider-properties')).toBeFalsy();
  });

  it('should switch forms as the selection changes type', async () => {
    const shape = shapeElement();
    const divider = dividerElement();
    canvas.insertElement(shape);
    canvas.insertElement(divider);
    const host: HTMLElement = fixture.nativeElement;

    selection.select(shape.id);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('app-shape-properties')).toBeTruthy();

    selection.select(divider.id);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('app-shape-properties')).toBeFalsy();
    expect(host.querySelector('app-divider-properties')).toBeTruthy();
  });

  it('should show the image form for a selected image element', async () => {
    const element = imageElement();
    canvas.insertElement(element);
    selection.select(element.id);
    fixture.detectChanges();
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('app-image-properties')).toBeTruthy();
    expect(host.querySelector('app-shape-properties')).toBeFalsy();
  });

  it('should show a locked hint for a locked element', async () => {
    const element = shapeElement({ locked: true });
    canvas.insertElement(element);
    selection.select(element.id);
    fixture.detectChanges();
    await fixture.whenStable();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.properties__locked-hint')).toBeTruthy();
  });
});
