import { Observable } from 'rxjs';

import { CanvasElement } from '../models/canvas-element.model';
import { DesignTheme } from '../models/design-theme.model';

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
  /** Fully-formed, already positioned and themed elements, ready for `AddElementsCommand`. */
  readonly elements: readonly CanvasElement[];
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
}
