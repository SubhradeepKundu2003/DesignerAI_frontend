import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppIcon } from './app-icon';

describe('AppIcon', () => {
  let component: AppIcon;
  let fixture: ComponentFixture<AppIcon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppIcon],
    }).compileComponents();

    fixture = TestBed.createComponent(AppIcon);
    fixture.componentRef.setInput('name', 'square');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the shapes of the named icon', () => {
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.querySelector('rect')).toBeTruthy();
  });

  it('should size the icon from the size input', async () => {
    fixture.componentRef.setInput('size', 24);
    await fixture.whenStable();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
  });
});
