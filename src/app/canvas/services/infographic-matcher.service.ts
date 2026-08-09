import { Injectable } from '@angular/core';

import { INFOGRAPHIC_TEMPLATES } from '../data/templates';
import { InfographicTemplate } from '../models/infographic-template.model';

/**
 * Picks the best-fit {@link InfographicTemplate} for a document-generated
 * `infographic` block by scoring tag overlap — the backend never names a
 * template id (it only proposes free-text `tags` like `'comparison'` or
 * `'timeline'`, see `app/agent/schemas.py`'s `LlmBlock` docstring), since a
 * small local model reasoning over an evolving, growing template catalog is
 * unreliable; the catalog and its tags live here, so matching does too.
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
 * caller can actually render with real content (`NewsletterAssembler`'s
 * `PARAMETERIZED_TEMPLATE_IDS`) — found necessary in practice: a bare
 * `'stats'` tag used to tie `stat-row` (placeholder-only, sorts first) with
 * `kpi-dashboard` (content-parameterized), silently discarding real
 * extracted numbers into a plain sentence instead of a populated dashboard.
 */
@Injectable({ providedIn: 'root' })
export class InfographicMatcherService {
  match(
    tags: readonly string[],
    usedTemplateIds: ReadonlySet<string> = new Set(),
    preferredTemplateIds: ReadonlySet<string> = new Set(),
  ): InfographicTemplate {
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
