import { ComponentFixture, TestBed } from '@angular/core/testing';

import { INFOGRAPHICS } from '../../data/infographics.manifest';
import { AssetsPanel } from './assets-panel';

describe('AssetsPanel', () => {
  let component: AssetsPanel;
  let fixture: ComponentFixture<AssetsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
