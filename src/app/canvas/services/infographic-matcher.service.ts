import { Injectable } from '@angular/core';

import { InfographicShape } from '../agent/document-generate.model';
import { INFOGRAPHIC_TEMPLATES } from '../data/templates';
import { InfographicTemplate } from '../models/infographic-template.model';

/**
 * Every template whose `build()` accepts real content, grouped into a pool
 * per the backend's `InfographicShape` (`app/agent/constants.py`'s
 * `INFOGRAPHIC_SHAPES`) -- single source of truth for "which templates can
 * render this shape", reused by `NewsletterAssembler` for
 * `PARAMETERIZED_TEMPLATE_IDS` so the two lists can't drift apart. Pools
 * exist so the *same* shape doesn't always render as the *same* design —
 * `match()` below rotates through a pool's entries across a document, same
 * "different infographics, not just different templates" goal as the
 * shape-count grounding in `guardrails.py`.
 *
 * A pool only ever groups templates that share both an exact slot count and
 * a content field shape (see each template file's own `XxxContent`
 * interface) — e.g. every `bullet_list` entry takes `{title, body}[4]`, so
 * any one of them can render the same `dataPoints`-derived content.
 */
export const SHAPE_TEMPLATE_IDS: Record<InfographicShape, readonly string[]> = {
  stat: ['template-stat-callout', 'template-stat-spotlight', 'template-stat-badge'],
  venn: ['template-venn-diagram'],
  stat_row: ['template-stat-row', 'template-stat-row-arc'],
  kpi: ['template-kpi-dashboard', 'template-kpi-halfmoon', 'template-kpi-ring-grid'],
  bar_chart: ['template-bar-chart', 'template-percentage-bar-ranking', 'template-bar-chart-caps'],
  bullet_list: [
    'template-icon-bullet-list',
    'template-radial-process',
    'template-zigzag-timeline',
    'template-arc-process',
    'template-step-tracker',
    'template-quadrant-wheel',
    'template-matrix-2x2',
    'template-pyramid',
    'template-card-grid',
    'template-hub-spoke',
    'template-comparison-columns',
    'template-photo-feature-row',
    'template-quadrant-info',
  ],
  timeline: [
    'template-vertical-timeline',
    'template-funnel',
    'template-timeline-waypoints',
    'template-circular-step-timeline',
    'template-hub-branch-list',
    'template-icon-card-cluster',
    'template-nested-arc-comparison',
    'template-segmented-wheel',
  ],
  quote: ['template-quote-callout', 'template-quote-spotlight'],
  grid: [
    'template-hub-mindmap-6',
    'template-winding-milestone-path',
    'template-icon-arch-grid',
    'template-photo-arch-grid',
    'template-hub-pills-grid',
  ],
};

/**
 * Picks the best-fit {@link InfographicTemplate} for a document-generated
 * `infographic` block — the backend's guardrail pass grounds `shape` to one
 * of the real, content-renderable shape pools above (`app/agent/
 * guardrails.py`), so a valid `shape` resolves directly with no scoring,
 * preferring a pool entry not yet used on this document (falling back to
 * reuse if every entry already is). `tags`-based overlap scoring remains as
 * a fallback for responses that predate `shape` or left it unset (see
 * `app/agent/schemas.py`'s `LlmBlock` docstring), since a small local model
 * reasoning over an evolving, growing template catalog is unreliable; the
 * catalog and its tags live here, so matching does too.
 *
 * Pure and stateless — the caller (`NewsletterAssembler`) is responsible for
 * tracking which template ids have already been used across a generated
 * document and passing that set in, so the same template doesn't land on
 * every page (same "cycle rather than repeat" idea as `layout.py`'s
 * `_accent_for` on the backend).
 *
 * A short, generic tag (a real 4B model's `tags` output skews short, see
 * `ollama_client.py`'s system prompt) often ties several templates at the
 * same score. `preferredTemplateIds` breaks that tie towards templates the
 * caller can actually render with real content — found necessary in
 * practice: a bare `'stats'` tag used to tie `stat-row` (placeholder-only,
 * sorts first) with `kpi-dashboard` (content-parameterized), silently
 * discarding real extracted numbers into a plain sentence instead of a
 * populated dashboard.
 */
@Injectable({ providedIn: 'root' })
export class InfographicMatcherService {
  match(
    tags: readonly string[],
    usedTemplateIds: ReadonlySet<string> = new Set(),
    preferredTemplateIds: ReadonlySet<string> = new Set(),
    shape?: InfographicShape,
  ): InfographicTemplate {
    if (shape) {
      const pool = SHAPE_TEMPLATE_IDS[shape];
      const shapeTemplateId = pool.find((id) => !usedTemplateIds.has(id)) ?? pool[0];
      const shapeTemplate = INFOGRAPHIC_TEMPLATES.find((template) => template.id === shapeTemplateId);
      if (shapeTemplate) {
        return shapeTemplate;
      }
    }

    const normalizedTags = new Set(tags.map(normalize));
    const scored = INFOGRAPHIC_TEMPLATES.map((template) => ({
      template,
      score: overlapScore(normalizedTags, template.tags),
    }));

    const bestScore = Math.max(...scored.map(({ score }) => score));
    const best = scored.filter(({ score }) => score === bestScore);
    const unused = best.filter(({ template }) => !usedTemplateIds.has(template.id));
    const pool = unused.length > 0 ? unused : best;
    const preferred = pool.filter(({ template }) => preferredTemplateIds.has(template.id));

    return (preferred[0] ?? pool[0]).template;
  }
}

function overlapScore(normalizedTags: ReadonlySet<string>, templateTags: readonly string[]): number {
  return templateTags.reduce((score, tag) => score + (normalizedTags.has(normalize(tag)) ? 1 : 0), 0);
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase();
}
