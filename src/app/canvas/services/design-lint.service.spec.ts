import { TestBed } from '@angular/core/testing';

import { TCS_CORPORATE, INDIGO_CLASSIC } from '../data/design-themes';
import { frameElement, groupElement, pageFixture, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { DesignLintService, LintRule } from './design-lint.service';

describe('DesignLintService', () => {
  let service: DesignLintService;

  const rules = (issues: { rule: LintRule }[]) => issues.map((issue) => issue.rule);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesignLintService);
  });

  it('reports nothing for a clean page', () => {
    const page = pageFixture({
      elements: [textElement({ x: 10, y: 10, width: 200, height: 40, fill: '#000000' })],
    });

    expect(service.lint(page)).toEqual([]);
  });

  it('flags an element that extends past the page bounds', () => {
    const page = pageFixture({
      width: 400,
      height: 300,
      elements: [textElement({ x: 350, y: 10, width: 100, height: 40 })],
    });

    expect(rules(service.lint(page))).toContain('out-of-bounds');
  });

  it('ignores a negative-position element that is still hidden', () => {
    const page = pageFixture({
      elements: [textElement({ x: -50, y: 0, visible: false })],
    });

    expect(service.lint(page)).toEqual([]);
  });

  it('flags low-contrast text against the page background', () => {
    const page = pageFixture({
      background: '#ffffff',
      elements: [textElement({ fill: '#fefefe', fontSize: 16 })],
    });

    expect(rules(service.lint(page))).toContain('low-contrast');
  });

  it('does not flag text with sufficient contrast', () => {
    const page = pageFixture({
      background: '#ffffff',
      elements: [textElement({ fill: '#111111', fontSize: 16 })],
    });

    expect(rules(service.lint(page))).not.toContain('low-contrast');
  });

  it('applies the lower large-text contrast threshold', () => {
    // ~3.5:1 against white — fails the 4.5:1 body-text bar but clears the 3:1 large-text one.
    const page = pageFixture({
      background: '#ffffff',
      elements: [textElement({ fill: '#767676', fontSize: 32 })],
    });

    expect(rules(service.lint(page))).not.toContain('low-contrast');
  });

  it('skips the contrast check when a colour cannot be parsed', () => {
    const page = pageFixture({
      background: '#ffffff',
      elements: [textElement({ fill: 'rebeccapurple' })],
    });

    expect(rules(service.lint(page))).not.toContain('low-contrast');
  });

  it('uses the parent frame background, not the page background, behind framed text', () => {
    const frame = frameElement({ id: 'frame-1', background: '#fefefe', childIds: ['text-1'] });
    const text = textElement({ id: 'text-1', parentId: 'frame-1', fill: '#ffffff' });
    const page = pageFixture({ background: '#000000', elements: [frame, text] });

    expect(rules(service.lint(page))).toContain('low-contrast');
  });

  it('flags overlapping text boxes', () => {
    const a = textElement({ x: 0, y: 0, width: 100, height: 40 });
    const b = textElement({ x: 50, y: 10, width: 100, height: 40 });
    const page = pageFixture({ elements: [a, b] });

    const issue = service.lint(page).find((candidate) => candidate.rule === 'overlapping-elements');
    expect(issue?.elementIds).toEqual([a.id, b.id]);
  });

  it('does not flag text boxes that do not touch', () => {
    const a = textElement({ x: 0, y: 0, width: 100, height: 40 });
    const b = textElement({ x: 200, y: 200, width: 100, height: 40 });
    const page = pageFixture({ elements: [a, b] });

    expect(rules(service.lint(page))).not.toContain('overlapping-elements');
  });

  it('does not flag two elements of the same group that overlap by design', () => {
    const a = textElement({ id: 'a', parentId: 'group-1', x: 0, y: 0, width: 100, height: 40 });
    const b = textElement({ id: 'b', parentId: 'group-1', x: 10, y: 10, width: 100, height: 40 });
    const page = pageFixture({
      elements: [a, b],
      groups: [groupElement({ id: 'group-1', name: 'Infographic', childIds: ['a', 'b'] })],
    });

    expect(rules(service.lint(page))).not.toContain('overlapping-elements');
  });

  it('flags two different groups whose bounding boxes overlap, naming each group', () => {
    const a = textElement({ id: 'a', parentId: 'group-1', x: 0, y: 0, width: 100, height: 40 });
    const b = textElement({ id: 'b', parentId: 'group-2', x: 50, y: 10, width: 100, height: 40 });
    const page = pageFixture({
      elements: [a, b],
      groups: [
        groupElement({ id: 'group-1', name: 'Bar chart', childIds: ['a'] }),
        groupElement({ id: 'group-2', name: 'KPI dashboard', childIds: ['b'] }),
      ],
    });

    const issue = service.lint(page).find((candidate) => candidate.rule === 'overlapping-elements');
    expect(issue?.message).toBe('"Bar chart" overlaps "KPI dashboard".');
  });

  it('flags a non-text element overlapping another, not just text-vs-text', () => {
    const a = shapeElement({ id: 'a', x: 0, y: 0, width: 100, height: 40 });
    const b = shapeElement({ id: 'b', x: 50, y: 10, width: 100, height: 40 });
    const page = pageFixture({ elements: [a, b] });

    expect(rules(service.lint(page))).toContain('overlapping-elements');
  });

  it('flags an empty frame', () => {
    const page = pageFixture({ elements: [frameElement({ childIds: [] })] });

    expect(rules(service.lint(page))).toContain('empty-frame');
  });

  it('does not flag a frame with children', () => {
    const page = pageFixture({ elements: [frameElement({ childIds: ['child-1'] })] });

    expect(rules(service.lint(page))).not.toContain('empty-frame');
  });

  it('flags text taller than its box once it wraps onto many lines', () => {
    // jsdom measures every character as 0px wide, so explicit newlines (not width) drive wrapping here.
    const page = pageFixture({
      elements: [textElement({ text: 'Line\n'.repeat(20), width: 200, height: 20, fontSize: 16 })],
    });

    expect(rules(service.lint(page))).toContain('text-overflow');
  });

  it('does not flag single-line text that fits its box', () => {
    const page = pageFixture({
      elements: [textElement({ text: 'Hi', width: 200, height: 40, fontSize: 16 })],
    });

    expect(rules(service.lint(page))).not.toContain('text-overflow');
  });

  it('flags TCS blue exceeding 25% of the page under the TCS Corporate theme', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [shapeElement({ width: 600, height: 600, fillRef: 'accent-0-solid' })],
    });

    expect(rules(service.lint(page, TCS_CORPORATE))).toContain('accent-overuse');
  });

  it('flags TCS orange/red exceeding 10% of the page under the TCS Corporate theme', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [shapeElement({ width: 400, height: 400, fillRef: 'accent-2-solid' })],
    });

    expect(rules(service.lint(page, TCS_CORPORATE))).toContain('accent-overuse');
  });

  it('does not flag accent usage within the caps', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [
        shapeElement({ width: 300, height: 300, fillRef: 'accent-0-solid' }),
        shapeElement({ width: 200, height: 200, fillRef: 'accent-2-solid' }),
      ],
    });

    expect(rules(service.lint(page, TCS_CORPORATE))).not.toContain('accent-overuse');
  });

  it('never checks accent balance for a non-TCS theme', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [shapeElement({ width: 900, height: 900, fillRef: 'accent-0-solid' })],
    });

    expect(rules(service.lint(page, INDIGO_CLASSIC))).not.toContain('accent-overuse');
  });

  it('never checks accent balance when no theme is passed', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [shapeElement({ width: 900, height: 900, fillRef: 'accent-0-solid' })],
    });

    expect(rules(service.lint(page))).not.toContain('accent-overuse');
  });

  it('ignores literal accent-coloured elements with no fillRef', () => {
    const page = pageFixture({
      width: 1000,
      height: 1000,
      elements: [shapeElement({ width: 900, height: 900, fill: '#4e84c4' })],
    });

    expect(rules(service.lint(page, TCS_CORPORATE))).not.toContain('accent-overuse');
  });
});
