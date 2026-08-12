import { IconName } from '../../shared/icons/icon-registry';

/**
 * Wire shape for `POST /generate/document` (mirrors `app/agent/schemas.py`'s
 * `LlmBlock`/`SectionPlan`/`DocumentGenerateResult`, camelCase-first with no
 * server-side transformation, same convention `AgentGenerateResult` uses).
 *
 * Deliberately has no coordinates and no template id anywhere in this file:
 * the model only ever proposes content and intent. `NewsletterAssembler` is
 * the only place this becomes positioned, templated `CanvasElement`s.
 */
export type LlmBlockKind = 'heading' | 'body' | 'highlight' | 'infographic';

/**
 * The six infographic templates whose `build()` accepts real content (mirrors
 * `PARAMETERIZED_TEMPLATE_IDS` in `newsletter-assembler.service.ts` and the
 * backend's `INFOGRAPHIC_SHAPES`). The backend's guardrail pass
 * (`app/agent/guardrails.py`) only ever sets `LlmBlock.shape` to one of these
 * -- same "asset grounding" contract `icon` already has via `IconName`.
 */
export type InfographicShape = 'stat' | 'stat_row' | 'kpi' | 'bar_chart' | 'timeline' | 'bullet_list' | 'quote';

export interface DataPoint {
  readonly label: string;
  readonly value: string;
}

export interface LlmBlock {
  readonly kind: LlmBlockKind;
  readonly text: string;
  readonly icon?: IconName;
  /** Only for kind === 'infographic': which real template this block wants -- matched directly, no scoring. */
  readonly shape?: InfographicShape;
  /** Only for kind === 'infographic': what it should communicate. */
  readonly purpose?: string;
  /** Only for kind === 'infographic': semantic shape tags -- fallback matching signal when `shape` is absent. */
  readonly tags: readonly string[];
  /** Only for kind === 'infographic': extracted stat/step label-value pairs, if any. */
  readonly dataPoints?: readonly DataPoint[];
  /** Only for kind === 'infographic': an extracted quotable line, if any. */
  readonly quote?: string;
}

export interface SectionPlan {
  readonly blocks: readonly LlmBlock[];
  /** Content/design guardrail findings for this page, computed server-side -- see `app/agent/guardrails.py`. */
  readonly warnings: readonly string[];
}

/**
 * A picture pulled from the uploaded document and stored as a project asset
 * -- mirrors `app/agent/schemas.py`'s `ExtractedImage`. Not placed anywhere:
 * deciding where a picture belongs in a generated layout is left to the
 * user, the same "don't guess placement" reasoning behind `NewsletterAssembler`
 * never inventing a template for a block that lacks real content.
 */
export interface ExtractedImage {
  readonly id: string;
  readonly url: string;
  readonly mimeType: string;
}

export interface DocumentGenerateResult {
  readonly pages: readonly SectionPlan[];
  /** Optional so existing fixtures/mocks that predate picture extraction
   * don't all need updating -- absent is treated the same as empty. */
  readonly images?: readonly ExtractedImage[];
}
