import { TestBed } from '@angular/core/testing';

import { KonvaStageService } from './konva-stage.service';

describe('KonvaStageService', () => {
  let service: KonvaStageService;
  let container: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [KonvaStageService] });
    service = TestBed.inject(KonvaStageService);

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    service.destroy();
    container.remove();
  });

  it('should mount a stage with the three editor layers', () => {
    const layers = service.mount(container, { width: 800, height: 600 });

    expect(service.layers).toBe(layers);
    expect(layers.page.getStage()).toBe(layers.content.getStage());
    // The page is chrome and must never swallow a click meant for an element.
    expect(layers.page.listening()).toBe(false);
    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);
  });

  it('should map the viewport onto the stage transform', () => {
    const layers = service.mount(container, { width: 800, height: 600 });
    service.setTransform({ zoom: 2, panX: -120, panY: 40 });

    const stage = layers.page.getStage();
    expect(stage.scaleX()).toBe(2);
    expect(stage.scaleY()).toBe(2);
    expect(stage.position()).toEqual({ x: -120, y: 40 });
  });

  it('should resize the stage to the workspace', () => {
    const layers = service.mount(container, { width: 800, height: 600 });
    service.resize({ width: 1024, height: 768 });

    expect(layers.page.getStage().size()).toEqual({ width: 1024, height: 768 });
  });

  it('should ignore transform and resize calls before it is mounted', () => {
    expect(service.layers).toBeNull();
    expect(() => service.setTransform({ zoom: 1, panX: 0, panY: 0 })).not.toThrow();
    expect(() => service.resize({ width: 10, height: 10 })).not.toThrow();
  });

  it('should tear the stage down on destroy', () => {
    service.mount(container, { width: 800, height: 600 });
    service.destroy();

    expect(service.layers).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
