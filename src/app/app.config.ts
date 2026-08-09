import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AgentClient } from './canvas/agent/agent-client';
import { HttpAgentClient } from './canvas/agent/http-agent-client';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    // Real backend (Track E3, designerai-backend's POST /generate). MockAgentClient
    // (canvas/agent/mock-agent-client.ts) is kept as a fast, offline fixture for tests.
    { provide: AgentClient, useClass: HttpAgentClient },
  ],
};
