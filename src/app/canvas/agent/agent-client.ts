import { Observable } from 'rxjs';

import { DesignTheme } from '../models/design-theme.model';
import { DocumentGenerateResult, LlmBlock } from './document-generate.model';

/**
 * What the Generate panel sends: everything a client needs to place a design
 * on one page, given explicitly rather than read from `CanvasStore` — a real
 * HTTP client can only see what travels in the request body, so the mock
 * implementation is held to the same discipline from day one.
 */
export interface AgentGenerateRequest {
  readonly prompt: string;
  readonly page: {
    readonly id: string;
    readonly width: number;
    readonly height: number;
  };
  readonly theme: DesignTheme;
}

export interface AgentGenerateResult {
  /** Short human-readable description of what was generated, shown in the panel. */
  readonly summary: string;
  /**
   * Content and intent only, no coordinates, no template ids — same contract
   * `DocumentGenerateResult.pages[n].blocks` uses. `NewsletterAssembler.
   * assembleOntoPage()` is the only place this becomes positioned, templated
   * `CanvasElement`s, ready for `AddElementsCommand`.
   */
  readonly blocks: readonly LlmBlock[];
  /** Content/design guardrail findings, computed server-side -- see `app/agent/guardrails.py`. */
  readonly warnings: readonly string[];
}

/** What the document-generation panel sends: a whole file plus the project's theme. */
export interface AgentGenerateFromDocumentRequest {
  readonly file: File;
  readonly theme: DesignTheme;
  /** So the backend can store any pictures it extracts from the document as
   * this project's assets (`ExtractedImage`) -- omitted when there's no
   * project yet to attach them to, in which case the backend just skips
   * picture extraction rather than erroring. */
  readonly projectId?: string;
}

/**
 * The one seam between the editor and whatever generates a design — today
 * {@link MockAgentClient}, later an HTTP+SSE client talking to the FastAPI/
 * Ollama backend. Everything downstream (the Generate panel, the command it
 * dispatches) is written against this contract, so swapping the
 * implementation is a one-line change to the `app.config.ts` provider.
 *
 * An abstract class rather than a plain `interface` so it doubles as its own
 * Angular DI token — no `InjectionToken` needed, matching every other service
 * in this app.
 */
export abstract class AgentClient {
  abstract generate(request: AgentGenerateRequest): Observable<AgentGenerateResult>;
  /**
   * Generates a whole multi-page newsletter's content plan from an uploaded
   * document. Same "content and intent only" contract {@link generate} uses
   * for a single page — `NewsletterAssembler` is the only place either
   * result becomes positioned, templated `CanvasElement`s.
   */
  abstract generateFromDocument(
    request: AgentGenerateFromDocumentRequest,
  ): Observable<DocumentGenerateResult>;
}
