import { ComponentFixture, TestBed } from '@angular/core/testing';

import { INFOGRAPHIC_TEMPLATES } from '../../data/templates';
import { INFOGRAPHICS } from '../../data/infographics.manifest';
import { CanvasStore } from '../../state/canvas.store';
import { SelectionStore } from '../../state/selection.store';
import { AssetsPanel } from './assets-panel';

describe('AssetsPanel', () => {
  let component: AssetsPanel;
  let fixture: ComponentFixture<AssetsPanel>;
  let canvas: CanvasStore;
  let selection: SelectionStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsPanel);
    component = fixture.componentInstance;
    canvas = TestBed.inject(CanvasStore);
    selection = TestBed.inject(SelectionStore);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should place a multi-element template as one group, selected as a unit', () => {
    const template = INFOGRAPHIC_TEMPLATES[0];

    component['placeTemplate'](template);

    const groups = canvas.groups();
    expect(groups.length).toBe(1);
    const group = groups[0];
    expect(group.name).toBe(template.label);

    const placed = canvas.elements();
    expect(placed.length).toBe(group.childIds.length);
    expect(placed.every((element) => element.parentId === group.id)).toBe(true);
    expect(new Set(group.childIds)).toEqual(new Set(placed.map((element) => element.id)));

    expect(selection.selectedIds()).toEqual([group.id]);
  });

  it('should list the full library with no search term', () => {
    expect(component['assets']()).toEqual(INFOGRAPHICS);
  });

  it('should filter by label or tag', () => {
    component['query'].set('timeline');
    const results = component['assets']();

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((asset) => asset.label.toLowerCase().includes('timeline') || asset.tags.includes('timeline'))).toBe(true);
  });
});
