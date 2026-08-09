import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AgentClient } from './canvas/agent/agent-client';
import { MockAgentClient } from './canvas/agent/mock-agent-client';
import { routes } from './app.routes';
import { App } from './app';
import { EditorShell } from './layout/editor-shell/editor-shell';
import { ProjectsList } from './layout/projects-list/projects-list';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: AgentClient, useClass: MockAgentClient },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the projects list at the root route', async () => {
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/', ProjectsList);
    expect(instance).toBeTruthy();
  });

  it('should render the editor shell at /projects/:id', async () => {
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/projects/test-id', EditorShell);
    expect(instance).toBeTruthy();
  });
});
