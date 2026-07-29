import { ComponentFixture, TestBed } from '@angular/core/testing';

import { shapeElement, textElement } from '../../../../testing/canvas-fixtures';
import { ResizeObserverStub, stubResizeObserver } from '../../../../testing/resize-observer.stub';
import { PAGE_SIZE } from '../../models/editor-config';
import { KonvaStageService } from '../../renderers/konva-stage.service';
import { SelectionRenderer } from '../../renderers/selection-renderer';
import { KeyboardShortcuts } from '../../services/keyboard-shortcuts.service';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { TextEditingStore } from '../../state/text-editing.store';
import { ViewportStore } from '../../state/viewport.store';
import { CanvasWorkspace } from './canvas-workspace';

describe('CanvasWorkspace', () => {
  let resizeObserver: ResizeObserverStub;
  let component: CanvasWorkspace;
  let fixture: ComponentFixture<CanvasWorkspace>;
  let viewport: ViewportStore;
  let canvas: CanvasStore;
  let selection: SelectionStore;
  let shortcuts: KeyboardShortcuts;

  /** Services the component provides for itself, reached through its injector. */
  const owned = <T>(token: abstract new (...args: never[]) => T): T =>
    fixture.debugElement.injector.get(token);

  /** The stage the component mounted, reached through its own injector. */
  function stage() {
    const layers = owned(KonvaStageService).layers;
    expect(layers).not.toBeNull();
    return layers!.page.getStage();
  }

  function contentLayer() {
    return owned(KonvaStageService).layers!.content;
  }

  beforeEach(async () => {
    resizeObserver = stubResizeObserver();

    await TestBed.configureTestingModule({
      imports: [CanvasWorkspace],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasWorkspace);
    component = fixture.componentInstance;
    viewport = TestBed.inject(ViewportStore);
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    shortcuts = TestBed.inject(KeyboardShortcuts);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    resizeObserver.restore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mount a stage into its host element', () => {
    expect(fixture.nativeElement.querySelector('.stage canvas')).not.toBeNull();
  });

  it('should size the stage to the workspace and frame the page on first layout', async () => {
    resizeObserver.emit({ width: 1200, height: 900 });
    await fixture.whenStable();

    expect(stage().size()).toEqual({ width: 1200, height: 900 });
    // Fitted, so the whole page is on screen and centred.
    expect(PAGE_SIZE.height * viewport.zoom()).toBeLessThan(900);
    expect(viewport.panX()).toBeCloseTo((1200 - PAGE_SIZE.width * viewport.zoom()) / 2, 5);
  });

  it('should push viewport changes onto the stage transform', async () => {
    resizeObserver.emit({ width: 1200, height: 900 });
    viewport.setZoom(2);
    await fixture.whenStable();

    const { zoom, panX, panY } = viewport.transform();
    expect(stage().scaleX()).toBe(zoom);
    expect(stage().position()).toEqual({ x: panX, y: panY });
  });

  it('should zoom on wheel instead of scrolling the page', async () => {
    resizeObserver.emit({ width: 1200, height: 900 });
    await fixture.whenStable();
    const before = viewport.zoom();

    const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
    fixture.nativeElement.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(viewport.zoom()).toBeGreaterThan(before);
  });

  it('should draw the elements the document holds', async () => {
    const first = shapeElement();
    const second = shapeElement();
    canvas.insertElement(first);
    canvas.insertElement(second);
    await fixture.whenStable();

    expect(
      contentLayer()
        .getChildren()
        .map((node) => node.id()),
    ).toEqual([first.id, second.id]);
  });

  it('should remove the node of an element that leaves the document', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    await fixture.whenStable();

    canvas.removeElement(element.id);
    await fixture.whenStable();

    expect(contentLayer().getChildren().length).toBe(0);
  });

  it('should put the handles on an element selected in the same tick it was added', async () => {
    // Adding from the sidebar selects immediately, so the node the selection
    // points at is created and looked for within one change detection pass.
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);
    await fixture.whenStable();

    const transformer = owned(SelectionRenderer).node!;
    expect(transformer.visible()).toBe(true);
    expect(transformer.nodes().map((node) => node.id())).toEqual([element.id]);
  });

  it('should drop the handles when the selection is cleared', async () => {
    const element = shapeElement();
    canvas.insertElement(element);
    selection.select(element.id);
    await fixture.whenStable();

    selection.clear();
    await fixture.whenStable();

    expect(owned(SelectionRenderer).node!.visible()).toBe(false);
  });

  it('should hide the node of a text box while it is being edited', async () => {
    const element = textElement();
    canvas.insertElement(element);
    selection.select(element.id);
    await fixture.whenStable();

    const textEditing = TestBed.inject(TextEditingStore);
    textEditing.begin(element.id);
    await fixture.whenStable();

    expect(contentLayer().findOne(`#${element.id}`)?.visible()).toBe(false);
    expect(owned(SelectionRenderer).node!.nodes()).toEqual([]);

    textEditing.end();
    await fixture.whenStable();

    expect(contentLayer().findOne(`#${element.id}`)?.visible()).toBe(true);
  });

  it('should pan on a left-button drag while space is held', async () => {
    resizeObserver.emit({ width: 1200, height: 900 });
    await fixture.whenStable();

    shortcuts.handleKeydown({
      code: 'Space',
      target: document.body,
      preventDefault: () => {},
    } as unknown as KeyboardEvent);
    const before = viewport.transform();

    const host: HTMLElement = fixture.nativeElement;
    host.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0 }),
    );
    host.dispatchEvent(
      new PointerEvent('pointermove', { button: 0, pointerId: 1, clientX: 30, clientY: 20 }),
    );
    host.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerId: 1 }));

    expect(viewport.transform().panX).toBeCloseTo(before.panX + 30, 5);
    expect(viewport.transform().panY).toBeCloseTo(before.panY + 20, 5);
  });

  it('should frame the viewport on the page the document describes', async () => {
    resizeObserver.emit({ width: 1200, height: 900 });
    await fixture.whenStable();

    expect(viewport.contentSize()).toEqual({
      width: canvas.activePage().width,
      height: canvas.activePage().height,
    });
  });
});
