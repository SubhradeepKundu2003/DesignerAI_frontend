import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorShell } from './editor-shell';

describe('EditorShell', () => {
  let component: EditorShell;
  let fixture: ComponentFixture<EditorShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorShell],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorShell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
