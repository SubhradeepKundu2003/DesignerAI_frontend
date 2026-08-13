import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { DEFAULT_THEME } from '../data/design-themes';
import { AgentGenerateRequest, AgentGenerateResult } from './agent-client';
import { HttpAgentClient } from './http-agent-client';

const BASE = environment.apiBaseUrl;

describe('HttpAgentClient', () => {
  let client: HttpAgentClient;
  let http: HttpTestingController;
  let request: AgentGenerateRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpAgentClient],
    });
    client = TestBed.inject(HttpAgentClient);
    http = TestBed.inject(HttpTestingController);
    request = {
      prompt: 'a bold summer sale flyer',
      page: { id: 'page-1', width: 794, height: 1123 },
      theme: DEFAULT_THEME,
    };
  });

  afterEach(() => http.verify());

  it('posts the request to /generate and passes the response through unchanged', () => {
    let result: AgentGenerateResult | undefined;
    client.generate(request).subscribe((response) => (result = response));

    const req = http.expectOne(`${BASE}/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);

    const response: AgentGenerateResult = {
      summary: 'A bold summer sale flyer',
      blocks: [],
      warnings: [],
    };
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('surfaces a non-2xx response as an observable error', () => {
    let error: unknown;
    client.generate(request).subscribe({ error: (err) => (error = err) });

    http.expectOne(`${BASE}/generate`).flush('backend unavailable', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    expect(error).toBeTruthy();
  });
});
