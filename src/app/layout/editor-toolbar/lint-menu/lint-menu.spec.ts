import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasStore } from '../../../canvas/state/canvas.store';
import { textElement } from '../../../../testing/canvas-fixtures';
import { LintMenu } from './lint-menu';

describe('LintMenu', () => {
  let fixture: ComponentFixture<LintMenu>;
  let canvas: CanvasStore;

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[aria-label="Check design"]');
  const panel = (): HTMLElement | null => fixture.nativeElement.querySelector('.lint-menu__panel');
  const issues = (): NodeListOf<HTMLElement> =>
    fixture.nativeElement.querySelectorAll('.lint-menu__issue');

  const open = async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LintMenu] }).compileComponents();

    fixture = TestBed.createComponent(LintMenu);
    canvas = TestBed.inject(CanvasStore);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('is closed until the trigger is clicked', async () => {
    expect(panel()).toBeNull();

    await open();

    expect(panel()).not.toBeNull();
  });

  it('reports no issues for a clean page', async () => {
    canvas.insertElement(textElement({ x: 10, y: 10, width: 100, height: 40, fill: '#000000' }));

    await open();

    expect(fixture.nativeElement.querySelector('.lint-menu__empty')?.textContent).toContain(
      'No issues found',
    );
    expect(issues().length).toBe(0);
  });

  it('lists an issue found on the active page', async () => {
    canvas.patchPage(canvas.activePage().id, { background: '#ffffff' });
    canvas.insertElement(textElement({ fill: '#fefefe' }));

    await open();

    expect(issues().length).toBeGreaterThan(0);
  });

  it('recheck picks up edits made while the panel is open', async () => {
    canvas.patchPage(canvas.activePage().id, { background: '#ffffff' });
    const element = textElement({ fill: '#fefefe' });
    canvas.insertElement(element);

    await open();
    expect(issues().length).toBeGreaterThan(0);

    canvas.patchElement(element.id, { fill: '#111111' });
    fixture.nativeElement.querySelector('.lint-menu__recheck').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(issues().length).toBe(0);
  });

  it('closes on a click outside the panel', async () => {
    await open();
    expect(panel()).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });
});
