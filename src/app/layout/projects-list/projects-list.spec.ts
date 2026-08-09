import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiProject } from '../../core/services/project-api.service';
import { ProjectsList } from './projects-list';

const BASE = environment.apiBaseUrl;

const project = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  id: 'p1',
  ownerId: null,
  title: 'My Design',
  formatVersion: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ProjectsList', () => {
  let fixture: ComponentFixture<ProjectsList>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsList);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('should list projects returned by the API', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('My Design');
  });

  it('should show an empty state with no projects', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No projects yet');
  });

  it('should show an error state when the list request fails', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Couldn't reach the server");
  });

  it('should create a project and navigate to it', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const createButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.page__create',
    ) as HTMLButtonElement;
    createButton.click();

    const createReq = http.expectOne({ url: `${BASE}/projects`, method: 'POST' });
    expect(createReq.request.body).toEqual({ title: 'Untitled design' });
    createReq.flush(project({ id: 'new-id' }));
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'new-id']);
  });

  it('should rename a project through window.prompt', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();
    fixture.detectChanges();

    vi.spyOn(window, 'prompt').mockReturnValue('Renamed');
    fixture.componentInstance['rename'](project());

    const patchReq = http.expectOne({ url: `${BASE}/projects/p1`, method: 'PATCH' });
    expect(patchReq.request.body).toEqual({ title: 'Renamed' });
    patchReq.flush(project({ title: 'Renamed' }));

    http.expectOne(`${BASE}/projects`).flush([project({ title: 'Renamed' })]);
  });

  it('should not rename when the prompt is cancelled', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();

    vi.spyOn(window, 'prompt').mockReturnValue(null);
    fixture.componentInstance['rename'](project());

    http.expectNone({ url: `${BASE}/projects/p1`, method: 'PATCH' });
  });

  it('should delete a project after confirmation', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();
    fixture.detectChanges();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance['remove'](project());

    const deleteReq = http.expectOne({ url: `${BASE}/projects/p1`, method: 'DELETE' });
    deleteReq.flush(null);

    http.expectOne(`${BASE}/projects`).flush([]);
  });

  it('should not delete when the confirmation is declined', async () => {
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.componentInstance['remove'](project());

    http.expectNone({ url: `${BASE}/projects/p1`, method: 'DELETE' });
  });
});
