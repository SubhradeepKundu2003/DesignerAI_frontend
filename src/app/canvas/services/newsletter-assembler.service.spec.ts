import { TestBed } from '@angular/core/testing';

import { DocumentGenerateResult, LlmBlock } from '../agent/document-generate.model';
import { DEFAULT_THEME } from '../data/design-themes';
import { CanvasElement, isTextElement } from '../models/canvas-element.model';
import { PAGE_MARGIN, PAGE_SIZE } from '../models/editor-config';
import { AssembledPage, NewsletterAssembler } from './newsletter-assembler.service';
import { SHAPE_TEMPLATE_IDS } from './infographic-matcher.service';

/** Every generated page carries two ambient background half-circles (see
 * `buildPageDecoration`) alongside its real content — filtered out here so
 * these tests can keep asserting on content shape/order/length exactly as
 * before that page-decoration feature existed. */
function contentElements(assembled: AssembledPage): readonly CanvasElement[] {
  return assembled.elements.filter((element) => !element.decorative);
}

function heading(text: string): LlmBlock {
  return { kind: 'heading', text, tags: [] };
}

function body(text: string): LlmBlock {
  return { kind: 'body', text, tags: [] };
}

function infographic(overrides: Partial<LlmBlock> = {}): LlmBlock {
  return { kind: 'infographic', text: '', tags: [], ...overrides };
}

function picture(caption = ''): LlmBlock {
  return { kind: 'picture', text: caption, tags: [] };
}

function resultOf(...blocks: LlmBlock[]): DocumentGenerateResult {
  return { pages: [{ blocks, warnings: [] }] };
}

describe('NewsletterAssembler', () => {
  let assembler: NewsletterAssembler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    assembler = TestBed.inject(NewsletterAssembler);
  });

  it('should pack multiple small section plans onto the same page instead of leaving pages mostly empty', () => {
    const result: DocumentGenerateResult = {
      pages: [
        { blocks: [heading('Intro')], warnings: [] },
        { blocks: [heading('Details')], warnings: [] },
      ],
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);

    expect(pages).toHaveLength(1);
    expect(contentElements(pages[0])).toHaveLength(2);
  });

  it('should stack heading and body text top-down within the page margin', () => {
    const [assembled] = assembler.assemble(resultOf(heading('Quarterly Update'), body('Revenue grew.')), DEFAULT_THEME);

    const [headingEl, bodyEl] = contentElements(assembled);
    expect(headingEl.x).toBe(PAGE_MARGIN);
    expect(headingEl.y).toBe(PAGE_MARGIN);
    expect(bodyEl.y).toBeGreaterThan(headingEl.y + headingEl.height);
  });

  it('should skip a block with no usable text', () => {
    const [assembled] = assembler.assemble(resultOf(heading('Title'), body('   ')), DEFAULT_THEME);

    expect(contentElements(assembled)).toHaveLength(1);
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

  it('should never place a parameterized template when the block has no real content, even if tags would tie-break onto one', () => {
    // No shape (guardrail gave up), no dataPoints, no quote -- only 'purpose' and tags survive,
    // and those tags happen to tie-break towards a parameterized template (see the 'stats' case
    // in infographic-matcher.service.spec.ts). Placing it anyway would render that template's own
    // hardcoded placeholder copy as if it were real content.
    const block = infographic({ purpose: 'a vague purpose with no real data behind it', tags: ['stats'] });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(0);
    expect((contentElements(assembled)[0] as { text?: string }).text).toBe('a vague purpose with no real data behind it');
  });

  it('should never place a parameterized template when it has fewer dataPoints than that template needs, even via the tag fallback', () => {
    // Regression test for a real bug: with no `shape` set, 'stats' ties `stat-row` (3 slots)
    // with `kpi-dashboard` (4 slots) -- only 2 real dataPoints here fits neither exactly, so
    // whichever one the tag scoring picks must still be rejected rather than rendering with
    // `mergeFixedList` padding the missing slot(s) with that template's own hardcoded defaults
    // (observed in practice: a real generation rendered 2 real KPI tiles plus 2 fabricated
    // ones -- "150+ Active client accounts" / "4.6/5 Client satisfaction" -- from kpi-dashboard's
    // own default data, indistinguishable from the real tiles beside them).
    const block = infographic({
      tags: ['stats'],
      dataPoints: [
        { label: 'Response Time', value: '2 hours' },
        { label: 'Customer Satisfaction', value: '92%' },
      ],
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(0);
    const texts = assembled.elements.map((el) => (el as { text?: string }).text);
    expect(texts.join(' ')).not.toContain('Active client accounts');
    expect(texts.join(' ')).not.toContain('Client satisfaction');
  });

  it('should fall back to a plain text block when the matched template has no content override', () => {
    // No parameterized template's tags overlap this at all, so the matcher's tie-break
    // just returns whatever scores 0 first -- an unparameterized template either way.
    const block = infographic({ purpose: 'wheel of quadrants', tags: ['wheel', 'quadrant', 'cycle'] });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(0);
    const content = contentElements(assembled);
    expect(content).toHaveLength(1);
    expect((content[0] as { text?: string }).text).toBe('wheel of quadrants');
  });

  it('should avoid matching the same template twice across a document when a tied alternative exists', () => {
    // 'bars'+'comparison' ties exactly two *parameterized* templates (bar-chart,
    // percentage-bar-ranking) and nothing else, so both pages get a real placed group to
    // compare names on. Both need the same 4-numeric-dataPoints shape their content supplies --
    // content that doesn't fit the tied template it lands on is never matched to one (see the
    // "no real content"/exact-count tests above).
    const fourPoints = [
      { label: 'Q1', value: '12%' },
      { label: 'Q2', value: '18%' },
      { label: 'Q3', value: '24%' },
      { label: 'Q4', value: '30%' },
    ];
    const blockA = infographic({ tags: ['bars', 'comparison'], dataPoints: fourPoints });
    const blockB = infographic({ tags: ['bars', 'comparison'], dataPoints: fourPoints });
    const result: DocumentGenerateResult = {
      pages: [
        { blocks: [blockA], warnings: [] },
        { blocks: [blockB], warnings: [] },
      ],
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);
    const groupNames = pages.flatMap((page) => page.groups.map((group) => group.name));

    expect(groupNames).toHaveLength(2);
    expect(groupNames[0]).not.toBe(groupNames[1]);
  });

  it('should push a block that would overflow the page onto a freshly created next page', () => {
    // jsdom has no real font metrics, so width-based wrapping never kicks in in tests
    // (see design-lint.service.spec.ts) -- explicit newlines are what forces height here.
    const tallBody = Array.from({ length: 14 }, () => 'Line').join('\n');
    const blocks = Array.from({ length: 6 }, () => body(tallBody));

    const pages = assembler.assemble(resultOf(...blocks), DEFAULT_THEME);

    expect(pages.length).toBeGreaterThan(1);
    for (const assembled of pages) {
      const bottomMost = Math.max(...contentElements(assembled).map((el) => el.y + el.height));
      expect(bottomMost).toBeLessThanOrEqual(PAGE_SIZE.height - PAGE_MARGIN);
    }
  });

  it('should always place at least the first block on a page even if it alone would overflow', () => {
    const hugeBody = Array.from({ length: 200 }, () => 'Line').join('\n');

    const pages = assembler.assemble(resultOf(body(hugeBody)), DEFAULT_THEME);

    expect(pages).toHaveLength(1);
    expect(contentElements(pages[0])).toHaveLength(1);
  });

  it('should resolve an infographic block to its template via shape, without relying on tags', () => {
    const block = infographic({
      shape: 'bar_chart',
      tags: [],
      dataPoints: [
        { label: 'Q1', value: '12' },
        { label: 'Q2', value: '18' },
        { label: 'Q3', value: '24' },
        { label: 'Q4', value: '30' },
      ],
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    expect(assembled.groups[0].name).toBe('Quarterly bar chart');
  });

  it('should render real content on the new stat_row template', () => {
    const block = infographic({
      shape: 'stat_row',
      dataPoints: [
        { label: 'Q1 Growth', value: '12%' },
        { label: 'Q2 Growth', value: '18%' },
        { label: 'Q3 Growth', value: '24%' },
      ],
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    expect(assembled.groups[0].name).toBe('Three-stat highlight row');
    const valueElement = assembled.elements.find((el) => el.name === 'Stat 1 value');
    expect((valueElement as { text?: string }).text).toBe('12%');
  });

  it('should render real content on a bullet_list-pool process template, not its hardcoded default copy', () => {
    const block = infographic({
      shape: 'bullet_list',
      dataPoints: [
        { label: 'Discover', value: 'Understand the problem' },
        { label: 'Design', value: 'Sketch the solution' },
        { label: 'Build', value: 'Ship a prototype' },
        { label: 'Launch', value: 'Release to everyone' },
      ],
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    const titleElements = assembled.elements
      .filter((el) => isTextElement(el) && el.name.endsWith('title'))
      .map((el) => (el as { text?: string }).text);
    expect(titleElements).toContain('Discover');
    // The template's own hardcoded default copy must not leak through.
    expect(titleElements).not.toContain('Research');
  });

  it('should land several bullet_list blocks on different real templates across a document, for variety', () => {
    const makeBlock = () =>
      infographic({
        shape: 'bullet_list',
        dataPoints: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
          { label: 'D', value: 'd' },
        ],
      });
    const result: DocumentGenerateResult = {
      pages: [
        { blocks: [makeBlock()], warnings: [] },
        { blocks: [makeBlock()], warnings: [] },
        { blocks: [makeBlock()], warnings: [] },
      ],
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);

    const groupNames = pages.flatMap((page) => page.groups.map((group) => group.name));
    expect(new Set(groupNames).size).toBe(3);
  });

  it('should render real content on the newly-added grid-shape template, not fabricated defaults', () => {
    const block = infographic({
      shape: 'grid',
      dataPoints: [
        { label: 'Onboarding', value: 'Walk new hires through day one.' },
        { label: 'Mentorship', value: 'Pair every hire with a buddy.' },
        { label: 'Feedback', value: 'Check in at 30/60/90 days.' },
        { label: 'Growth', value: 'Set a development plan each quarter.' },
        { label: 'Recognition', value: 'Celebrate wins in the team channel.' },
        { label: 'Retention', value: 'Exit-interview every departure.' },
      ],
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    expect(assembled.groups[0].name).toBe('Six-node hub mind map');
    const branchTitle = assembled.elements.find((el) => el.name === 'Branch 1 title');
    expect((branchTitle as { text?: string }).text).toBe('Onboarding');
    const branchBody = assembled.elements.find((el) => el.name === 'Branch 1 body');
    expect((branchBody as { text?: string }).text).toBe('Walk new hires through day one.');
  });

  it('should split one grid block\'s dataPoints across the hub-pills-grid template\'s two parallel lists', () => {
    // Force the matcher past every earlier grid-pool entry to reach
    // template-hub-pills-grid (last in the pool), whose `build()` needs a
    // pill label *and* a grid cell body per dataPoint -- both pulled from
    // the same 6 points rather than losing half the real content.
    const makeBlock = (i: number) =>
      infographic({
        shape: 'grid',
        dataPoints: Array.from({ length: 6 }, (_, j) => ({ label: `P${i}-${j}`, value: `V${i}-${j}` })),
      });
    const result: DocumentGenerateResult = {
      pages: SHAPE_TEMPLATE_IDS.grid.map((_, i) => ({ blocks: [makeBlock(i)], warnings: [] })),
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);
    const lastIndex = SHAPE_TEMPLATE_IDS.grid.length - 1;
    const allTexts = pages
      .flatMap((page) => page.elements.map((el) => (el as { text?: string }).text ?? ''))
      .join(' ');

    expect(pages.flatMap((page) => page.groups.map((g) => g.name))).toContain('Hub with pill branches and grid');
    expect(allTexts).toContain(`P${lastIndex}-0`);
    expect(allTexts).toContain(`V${lastIndex}-0`);
  });

  it('should reach every template in the grid pool across a document, including the newly-added ones', () => {
    const makeBlock = (i: number) =>
      infographic({
        shape: 'grid',
        dataPoints: Array.from({ length: 6 }, (_, j) => ({ label: `Point ${i}.${j}`, value: `Detail ${i}.${j}` })),
      });
    const result: DocumentGenerateResult = {
      pages: SHAPE_TEMPLATE_IDS.grid.map((_, i) => ({ blocks: [makeBlock(i)], warnings: [] })),
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);
    const groupNames = pages.flatMap((page) => page.groups.map((group) => group.name));
    expect(new Set(groupNames).size).toBe(SHAPE_TEMPLATE_IDS.grid.length);
  });

  it('should reach every template in the timeline pool across a document, including the newly-added ones', () => {
    const makeBlock = (i: number) =>
      infographic({
        shape: 'timeline',
        dataPoints: Array.from({ length: 5 }, (_, j) => ({ label: `Step ${i}.${j}`, value: `Detail ${i}.${j}` })),
      });
    const result: DocumentGenerateResult = {
      pages: SHAPE_TEMPLATE_IDS.timeline.map((_, i) => ({ blocks: [makeBlock(i)], warnings: [] })),
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);
    const groupNames = pages.flatMap((page) => page.groups.map((group) => group.name));
    expect(new Set(groupNames).size).toBe(SHAPE_TEMPLATE_IDS.timeline.length);
    expect(groupNames).toContain('Five-step circular timeline');
    expect(groupNames).toContain('Five-band fanned comparison');
  });

  it('should reach every template in the bullet_list pool across a document, including the newly-added ones', () => {
    const makeBlock = (i: number) =>
      infographic({
        shape: 'bullet_list',
        dataPoints: Array.from({ length: 4 }, (_, j) => ({ label: `Point ${i}.${j}`, value: `Detail ${i}.${j}` })),
      });
    const result: DocumentGenerateResult = {
      pages: SHAPE_TEMPLATE_IDS.bullet_list.map((_, i) => ({ blocks: [makeBlock(i)], warnings: [] })),
    };

    const pages = assembler.assemble(result, DEFAULT_THEME);
    const groupNames = pages.flatMap((page) => page.groups.map((group) => group.name));
    expect(new Set(groupNames).size).toBe(SHAPE_TEMPLATE_IDS.bullet_list.length);
    expect(groupNames).toContain('Four-card photo feature row');
    expect(groupNames).toContain('Quadrant pinwheel with center label');
  });

  it('should surface a SectionPlan\'s backend warnings on the page it produced', () => {
    const result: DocumentGenerateResult = {
      pages: [{ blocks: [heading('Intro')], warnings: ['source had data but no chart was proposed'] }],
    };

    const [assembled] = assembler.assemble(result, DEFAULT_THEME);

    expect(assembled.warnings).toContain('source had data but no chart was proposed');
  });

  it('should attach backend warnings only to the first page an overflowing plan produces', () => {
    const tallBody = Array.from({ length: 14 }, () => 'Line').join('\n');
    const blocks = Array.from({ length: 6 }, () => body(tallBody));
    const result: DocumentGenerateResult = { pages: [{ blocks, warnings: ['flagged once'] }] };

    const pages = assembler.assemble(result, DEFAULT_THEME);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].warnings).toContain('flagged once');
    for (const page of pages.slice(1)) {
      expect(page.warnings).not.toContain('flagged once');
    }
  });

  it('should place a picture block as an empty, editable placeholder rather than a real image', () => {
    const [assembled] = assembler.assemble(resultOf(picture('The new office, pictured last spring')), DEFAULT_THEME);

    expect(assembled.groups).toHaveLength(1);
    expect(assembled.groups[0].name).toBe('Picture placeholder');
    const captionElement = assembled.elements.find((el) => el.name === 'Picture caption');
    expect((captionElement as { text?: string }).text).toBe('The new office, pictured last spring');
    // The placeholder is ordinary, unlocked elements grouped like any other
    // infographic -- selectable, movable, resizable, deletable.
    for (const element of contentElements(assembled)) {
      expect(element.locked).toBe(false);
    }
  });

  it('should fall back to default placeholder copy when a picture block has no caption', () => {
    const [assembled] = assembler.assemble(resultOf(picture()), DEFAULT_THEME);

    const captionElement = assembled.elements.find((el) => el.name === 'Picture caption');
    expect((captionElement as { text?: string }).text).toBe('Add a picture here');
  });

  it('should shrink a mildly overflowing content-overridden template text box to fit', () => {
    const block = infographic({
      tags: ['quote', 'testimonial'],
      quote: Array.from({ length: 4 }, () => 'Word').join('\n'),
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    const quoteTextElement = assembled.elements.find((el) => el.name === 'Quote text') as { fontSize: number } | undefined;
    expect(quoteTextElement?.fontSize).toBeLessThan(19);
  });

  it('should grow a badly overflowing content-overridden template box to fit instead of clipping it', () => {
    // Far more text than shrinking to the font-size floor can fit inside the
    // template's default 88px-tall box.
    const block = infographic({
      tags: ['quote', 'testimonial'],
      quote: Array.from({ length: 10 }, () => 'Word').join('\n'),
    });

    const [assembled] = assembler.assemble(resultOf(block), DEFAULT_THEME);

    const quoteTextElement = assembled.elements.find((el) => el.name === 'Quote text') as
      | { height: number }
      | undefined;
    expect(quoteTextElement?.height).toBeGreaterThan(88);
    expect(assembled.warnings.some((warning) => warning.includes('Quote text'))).toBe(false);
  });
});
