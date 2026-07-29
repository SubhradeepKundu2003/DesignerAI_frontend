import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomControls } from './zoom-controls';

describe('ZoomControls', () => {
  let component: ZoomControls;
  let fixture: ComponentFixture<ZoomControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoomControls],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoomControls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
