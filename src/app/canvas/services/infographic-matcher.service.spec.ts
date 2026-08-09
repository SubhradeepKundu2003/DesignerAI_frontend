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
});
