import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconButton } from './icon-button';

describe('IconButton', () => {
  let component: IconButton;
  let fixture: ComponentFixture<IconButton>;

  const button = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconButton],
    }).compileComponents();

    fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', 'trash');
    fixture.componentRef.setInput('label', 'Delete');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the label as the accessible name', () => {
    expect(button().getAttribute('aria-label')).toBe('Delete');
  });

  it('should emit when activated', () => {
    let activations = 0;
    component.activated.subscribe(() => activations++);

    button().click();

    expect(activations).toBe(1);
  });

  it('should not emit while disabled', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    let activations = 0;
    component.activated.subscribe(() => activations++);
    button().click();

    expect(activations).toBe(0);
  });

  it('should report pressed state for toggle buttons', async () => {
    fixture.componentRef.setInput('variant', 'toggle');
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();

    expect(button().getAttribute('aria-pressed')).toBe('true');
  });
});
