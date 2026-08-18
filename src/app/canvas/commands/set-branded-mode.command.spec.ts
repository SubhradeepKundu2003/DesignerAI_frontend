import { TestBed } from '@angular/core/testing';

import { shapeElement } from '../../../testing/canvas-fixtures';
import { TCS_CORPORATE } from '../data/design-themes';
import { BrandAssets } from '../state/brand-assets.store';
import { CanvasStore } from '../state/canvas.store';
import { SetBrandedModeCommand } from './set-branded-mode.command';

const ASSETS: BrandAssets = {
  tcsBlack: { src: 'tcs-black.svg', aspectRatio: 200 / 64 },
  tcsWhite: { src: 'tcs-white.svg', aspectRatio: 200 / 64 },
  tataBlack: { src: 'tata-black.svg', aspectRatio: 220 / 64 },
  tataWhite: { src: 'tata-white.svg', aspectRatio: 220 / 64 },
};

describe('SetBrandedModeCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('turns branded mode on, forces the TCS theme, and brands every page', () => {
    const existing = shapeElement();
    canvas.insertElement(existing);

    new SetBrandedModeCommand(canvas, true, ASSETS).execute();

    expect(canvas.branded()).toBe(true);
    expect(canvas.document().theme).toBe(TCS_CORPORATE);

    const page = canvas.pages()[0];
    expect(['#000000', '#ffffff']).toContain(page.background);
    const brandElements = page.elements.filter((element) => element.brandRole !== undefined);
    expect(brandElements).toHaveLength(3); // 1 pattern image + 2 logos
    expect(brandElements[0].brandRole).toBe('background-pattern');
    expect(page.elements[page.elements.length - 1].brandRole).toBe('logo');
    // The pre-existing element is untouched and still on the page.
    expect(canvas.elementById(existing.id)).toBeDefined();
  });

  it('undoes "on" back to the exact previous background, theme and element list', () => {
    const existing = shapeElement();
    canvas.insertElement(existing);
    const originalBackground = canvas.pages()[0].background;

    const command = new SetBrandedModeCommand(canvas, true, ASSETS);
    command.execute();
    command.undo();

    expect(canvas.branded()).toBe(false);
    expect(canvas.document().theme).toBeUndefined();
    expect(canvas.pages()[0].background).toBe(originalBackground);
    expect(canvas.pages()[0].elements).toEqual([existing]);
  });

  it('is idempotent: re-running "on" does not double up an already-branded page', () => {
    new SetBrandedModeCommand(canvas, true, ASSETS).execute();
    const afterFirst = canvas.pages()[0].elements.length;

    new SetBrandedModeCommand(canvas, true, ASSETS).execute();

    expect(canvas.pages()[0].elements).toHaveLength(afterFirst);
  });

  it('turns branded mode off by removing only the tagged elements', () => {
    const existing = shapeElement();
    canvas.insertElement(existing);
    new SetBrandedModeCommand(canvas, true, ASSETS).execute();
    const brandedBackground = canvas.pages()[0].background;

    new SetBrandedModeCommand(canvas, false, ASSETS).execute();

    expect(canvas.branded()).toBe(false);
    expect(canvas.pages()[0].elements).toEqual([existing]);
    // Background is left as whatever branded mode set it to.
    expect(canvas.pages()[0].background).toBe(brandedBackground);
  });

  it('undoes "off" by restoring the removed elements at their original positions', () => {
    const existing = shapeElement();
    canvas.insertElement(existing);
    new SetBrandedModeCommand(canvas, true, ASSETS).execute();
    const brandedElements = canvas.pages()[0].elements;

    const off = new SetBrandedModeCommand(canvas, false, ASSETS);
    off.execute();
    off.undo();

    expect(canvas.branded()).toBe(true);
    expect(canvas.pages()[0].elements).toEqual(brandedElements);
  });
});
