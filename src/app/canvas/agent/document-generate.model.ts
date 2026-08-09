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

export interface DataPoint {
  readonly label: string;
  readonly value: string;
}

export interface LlmBlock {
  readonly kind: LlmBlockKind;
  readonly text: string;
  readonly icon?: IconName;
  /** Only for kind === 'infographic': what it should communicate. */
  readonly purpose?: string;
  /** Only for kind === 'infographic': semantic shape tags, matched against real template tags. */
  readonly tags: readonly string[];
  /** Only for kind === 'infographic': extracted stat/step label-value pairs, if any. */
  readonly dataPoints?: readonly DataPoint[];
  /** Only for kind === 'infographic': an extracted quotable line, if any. */
  readonly quote?: string;
}

export interface SectionPlan {
  readonly blocks: readonly LlmBlock[];
}

export interface DocumentGenerateResult {
  readonly pages: readonly SectionPlan[];
}
