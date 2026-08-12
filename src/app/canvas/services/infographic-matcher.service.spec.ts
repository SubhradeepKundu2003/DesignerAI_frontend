import { InfographicMatcherService } from './infographic-matcher.service';

describe('InfographicMatcherService', () => {
  let service: InfographicMatcherService;

  beforeEach(() => {
    service = new InfographicMatcherService();
  });

  it('should pick the template with the highest tag overlap', () => {
    const match = service.match(['quote', 'testimonial']);
    expect(match.id).toBe('template-quote-callout');
  });

  it('should be case- and whitespace-insensitive when matching tags', () => {
    const match = service.match([' QUOTE ', 'Testimonial']);
    expect(match.id).toBe('template-quote-callout');
  });

  it('should prefer a template not already used when scores tie', () => {
    const first = service.match(['timeline', 'steps']);
    const usedTemplateIds = new Set([first.id]);

    const second = service.match(['timeline', 'steps'], usedTemplateIds);

    expect(second.id).not.toBe(first.id);
  });

  it('should fall back to the tied-used template if every top scorer is already used', () => {
    const first = service.match(['quote', 'testimonial', 'callout', 'attribution']);
    const usedTemplateIds = new Set([first.id]);

    const second = service.match(['quote', 'testimonial', 'callout', 'attribution'], usedTemplateIds);

    expect(second.id).toBe(first.id);
  });

  it('should always return some template even with completely unrelated tags', () => {
    const match = service.match(['completely-unrelated-nonsense-tag']);
    expect(match).toBeDefined();
  });

  it('should prefer a template in preferredTemplateIds when scores tie', () => {
    // 'stats' alone ties stat-row (first in catalog order) with kpi-dashboard.
    const withoutPreference = service.match(['stats']);
    expect(withoutPreference.id).toBe('template-stat-row');

    const withPreference = service.match(['stats'], new Set(), new Set(['template-kpi-dashboard']));
    expect(withPreference.id).toBe('template-kpi-dashboard');
  });

  it('should apply the used-template exclusion before the preferred-template bias', () => {
    const preferredTemplateIds = new Set(['template-quote-callout']);
    const first = service.match(['callout'], new Set(), preferredTemplateIds);
    expect(first.id).toBe('template-quote-callout');

    const second = service.match(['callout'], new Set([first.id]), preferredTemplateIds);
    expect(second.id).toBe('template-stat-callout');
  });

  it('should resolve a shape directly to its template, bypassing tag scoring entirely', () => {
    // Tags alone would tie/lose against unparameterized templates (see the
    // 'stats' case above) -- a `shape` should win outright regardless of `tags`.
    const match = service.match(['completely-unrelated-nonsense-tag'], new Set(), new Set(), 'bar_chart');
    expect(match.id).toBe('template-bar-chart');
  });

  it('should rotate to the next pool member when the first is already used, for variety', () => {
    // 'bar_chart' pools template-bar-chart and template-percentage-bar-ranking --
    // two different real designs for the same exact-4-numeric-values content.
    const first = service.match([], new Set(), new Set(), 'bar_chart');
    expect(first.id).toBe('template-bar-chart');

    const second = service.match([], new Set([first.id]), new Set(), 'bar_chart');
    expect(second.id).toBe('template-percentage-bar-ranking');
  });

  it('should rotate within the quote pool rather than drift to an unrelated template once the first entry is used', () => {
    // A quote's content only maps onto a quote template (`mapBlockToContent`) --
    // falling through to tag scoring here could land on a content-incompatible
    // template (e.g. a stat callout) that would silently drop the quote text.
    const usedTemplateIds = new Set(['template-quote-callout']);
    const match = service.match(['callout'], usedTemplateIds, new Set(), 'quote');
    expect(match.id).toBe('template-quote-spotlight');
  });

  it('should reuse the quote pool once every entry in it is already used', () => {
    const usedTemplateIds = new Set(['template-quote-callout', 'template-quote-spotlight']);
    const match = service.match(['callout'], usedTemplateIds, new Set(), 'quote');
    expect(match.id).toBe('template-quote-callout');
  });

  it('should fall through to tag-overlap scoring when no shape is given', () => {
    const match = service.match(['quote', 'testimonial']);
    expect(match.id).toBe('template-quote-callout');
  });

  it('should resolve the stat_row shape to its template', () => {
    const match = service.match([], new Set(), new Set(), 'stat_row');
    expect(match.id).toBe('template-stat-row');
  });

  it('should rotate through several designs for the bullet_list pool across a document', () => {
    const usedTemplateIds = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const match = service.match([], usedTemplateIds, new Set(), 'bullet_list');
      seen.add(match.id);
      usedTemplateIds.add(match.id);
    }
    expect(seen.size).toBe(4);
  });
});
