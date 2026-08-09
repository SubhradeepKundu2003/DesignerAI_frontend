import { TestBed } from '@angular/core/testing';

import { DocumentGenerateResult, LlmBlock } from '../agent/document-generate.model';
import { DEFAULT_THEME } from '../data/design-themes';
import { PAGE_MARGIN, PAGE_SIZE } from '../models/editor-config';
import { NewsletterAssembler } from './newsletter-assembler.service';

function heading(text: string): LlmBlock {
  return { kind: 'heading', text, tags: [] };
}

function body(text: string): LlmBlock {
  return { kind: 'body', text, tags: [] };
}

function infographic(overrides: Partial<LlmBlock> = {}): LlmBlock {
  return { kind: 'infographic', text: '', tags: [], ...overrides };
}

function resultOf(...blocks: LlmBlock[]): DocumentGenerateResult {
  return { pages: [{ blocks }] };
}

describe('NewsletterAssembler', () => {
  let assembler: NewsletterAssembler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    assembler = TestBed.inject(NewsletterAssembler);
  });

  it('should produce one page per section plan when everything fits', () => {
    const result: DocumentGenerateResult = {
      pages: [{ blocks: [heading('Intro')] }, { blocks: [heading('Details')] }],
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);

    expect(pages).toHaveLength(2);
  });

  it('should stack heading and body text top-down within the page margin', () => {
    const [assembled] = assembler.assemble(resultOf(heading('Quarterly Update'), body('Revenue grew.')), DEFAULT_THEME);

    const [headingEl, bodyEl] = assembled.elements;
    expect(headingEl.x).toBe(PAGE_MARGIN);
    expect(headingEl.y).toBe(PAGE_MARGIN);
    expect(bodyEl.y).toBeGreaterThan(headingEl.y + headingEl.height);
  });

  it('should skip a block with no usable text', () => {
    const [assembled] = assembler.assemble(resultOf(heading('Title'), body('   ')), DEFAULT_THEME);

    expect(assembled.elements).toHaveLength(1);
  });

  it('should match an infographic block to a real template and group its elements', () => {
    const block = infographic({
      purpose: 'testimonial highlight',
      tags: ['quote', 'testimonial'],
      quote: 'A great result.',
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    expect(assembled.groups[0].name).toBe('Testimonial quote callout');
    const quoteTextElement = assembled.elements.find((el) => el.name === 'Quote text');
    expect(quoteTextElement).toBeDefined();
    expect((quoteTextElement as { text?: string }).text).toBe('A great result.');
  });

  it('should fall back to a plain text block when the matched template has no content override', () => {
    // No parameterized template's tags overlap this at all, so the matcher's tie-break
    // just returns whatever scores 0 first -- an unparameterized template either way.
    const block = infographic({ purpose: 'wheel of quadrants', tags: ['wheel', 'quadrant', 'cycle'] });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(0);
    expect(assembled.elements).toHaveLength(1);
    expect((assembled.elements[0] as { text?: string }).text).toBe('wheel of quadrants');
  });

  it('should avoid matching the same template twice across a document when a tied alternative exists', () => {
    // 'callout' ties exactly two *parameterized* templates (stat-callout, quote-callout)
    // and nothing else, so both pages get a real placed group to compare names on.
    const blockA = infographic({ tags: ['callout'] });
    const blockB = infographic({ tags: ['callout'] });
    const result: DocumentGenerateResult = { pages: [{ blocks: [blockA] }, { blocks: [blockB] }] };

    const [pageA, pageB] = assembler.assemble(result, DEFAULT_THEME);

    expect(pageA.groups[0].name).not.toBe(pageB.groups[0].name);
  });

  it('should push a block that would overflow the page onto a freshly created next page', () => {
    // jsdom has no real font metrics, so width-based wrapping never kicks in in tests
    // (see design-lint.service.spec.ts) -- explicit newlines are what forces height here.
    const tallBody = Array.from({ length: 14 }, () => 'Line').join('\n');
    const blocks = Array.from({ length: 6 }, () => body(tallBody));

    const pages = assembler.assemble(resultOf(...blocks), DEFAULT_THEME);

    expect(pages.length).toBeGreaterThan(1);
    for (const assembled of pages) {
      const bottomMost = Math.max(...assembled.elements.map((el) => el.y + el.height));
      expect(bottomMost).toBeLessThanOrEqual(PAGE_SIZE.height - PAGE_MARGIN);
    }
  });

  it('should always place at least the first block on a page even if it alone would overflow', () => {
    const hugeBody = Array.from({ length: 200 }, () => 'Line').join('\n');

    const pages = assembler.assemble(resultOf(body(hugeBody)), DEFAULT_THEME);

    expect(pages).toHaveLength(1);
    expect(pages[0].elements).toHaveLength(1);
  });

  it('should shrink an overflowing content-overridden template text box to fit, or report it as a warning', () => {
    const block = infographic({
      tags: ['quote', 'testimonial'],
      quote: Array.from({ length: 10 }, () => 'Word').join('\n'),
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    const quoteTextElement = assembled.elements.find((el) => el.name === 'Quote text') as { fontSize: number } | undefined;
    const stillOverflowing = assembled.warnings.some((warning) => warning.includes('Quote text'));
    expect(stillOverflowing || (quoteTextElement && quoteTextElement.fontSize < 19)).toBeTruthy();
  });
});
