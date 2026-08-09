import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AgentClient } from '../../canvas/agent/agent-client';
import { MockAgentClient } from '../../canvas/agent/mock-agent-client';
import { environment } from '../../../environments/environment';
import { EditorShell } from './editor-shell';

describe('EditorShell', () => {
  let component: EditorShell;
  let fixture: ComponentFixture<EditorShell>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorShell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'project-1' })) },
        },
        { provide: AgentClient, useClass: MockAgentClient },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorShell);
    component = fixture.componentInstance;
    await fixture.whenStable();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    http.expectOne(`${environment.apiBaseUrl}/projects/project-1/document`).flush({ version: 1, pages: [] });
    expect(component).toBeTruthy();
  });

  it('should open the project named by the route', () => {
    const req = http.expectOne(`${environment.apiBaseUrl}/projects/project-1/document`);
    expect(req.request.method).toBe('GET');
    req.flush({ version: 1, pages: [] });
  });
});
