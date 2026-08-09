import { TestBed } from '@angular/core/testing';

import { frameElement, pageFixture, textElement } from '../../../testing/canvas-fixtures';
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

    const issue = service.lint(page).find((candidate) => candidate.rule === 'overlapping-text');
    expect(issue?.elementIds).toEqual([a.id, b.id]);
  });

  it('does not flag text boxes that do not touch', () => {
    const a = textElement({ x: 0, y: 0, width: 100, height: 40 });
    const b = textElement({ x: 200, y: 200, width: 100, height: 40 });
    const page = pageFixture({ elements: [a, b] });

    expect(rules(service.lint(page))).not.toContain('overlapping-text');
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
});
