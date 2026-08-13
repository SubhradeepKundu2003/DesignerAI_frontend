import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AgentClient,
  AgentGenerateFromDocumentRequest,
  AgentGenerateRequest,
  AgentGenerateResult,
} from './agent-client';
import { DocumentGenerateResult } from './document-generate.model';

/**
 * Talks to `designerai-backend`'s `POST /generate` (Track E3) — real Ollama-backed
 * generation behind the same {@link AgentClient} contract {@link MockAgentClient} implements.
 *
 * No camelCase/snake_case mapping layer, unlike `ProjectApiService`: the backend's
 * response is defined camelCase-first to match `AgentGenerateResult` exactly, the
 * same "wire shape is the app's shape" convention already used for the
 * `CanvasDocument` the persistence endpoints store verbatim.
 */
@Injectable()
export class HttpAgentClient extends AgentClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  generate(request: AgentGenerateRequest): Observable<AgentGenerateResult> {
    return this.http.post<AgentGenerateResult>(`${this.baseUrl}/generate`, request);
  }

  generateFromDocument(request: AgentGenerateFromDocumentRequest): Observable<DocumentGenerateResult> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('theme', JSON.stringify(request.theme));
    if (request.projectId) {
      formData.append('project_id', request.projectId);
    }
    return this.http.post<DocumentGenerateResult>(`${this.baseUrl}/generate/document`, formData);
  }
}
