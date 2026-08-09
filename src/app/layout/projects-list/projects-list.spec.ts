import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiProject } from '../../core/services/project-api.service';
import { ProjectsList } from './projects-list';

const BASE = environment.apiBaseUrl;
const LEGACY_KEY = 'designerai:canvas:v1';

const project = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  id: 'p1',
  ownerId: null,
  title: 'My Design',
  formatVersion: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const legacyDocument = () => ({
  version: 1,
  pages: [{ id: 'p1', width: 794, height: 1123, background: '#fff', elements: [], groups: [] }],
});

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('ProjectsList', () => {
  let fixture: ComponentFixture<ProjectsList>;
  let http: HttpTestingController;
  let router: Router;

  // Fixture creation is a separate step (not part of beforeEach) so tests can seed localStorage
  // -- read by ProjectsList's constructor -- before the component is actually constructed.
  function createFixture(): void {
    fixture = TestBed.createComponent(ProjectsList);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProjectsList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should list projects returned by the API', async () => {
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('My Design');
  });

  it('should show an empty state with no projects', async () => {
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No projects yet');
  });

  it('should show an error state when the list request fails', async () => {
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Couldn't reach the server",
    );
  });

  it('should create a project and navigate to it', async () => {
    createFixture();
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
    createFixture();
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
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();

    vi.spyOn(window, 'prompt').mockReturnValue(null);
    fixture.componentInstance['rename'](project());

    http.expectNone({ url: `${BASE}/projects/p1`, method: 'PATCH' });
  });

  it('should delete a project after confirmation', async () => {
    createFixture();
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
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([project()]);
    await fixture.whenStable();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.componentInstance['remove'](project());

    http.expectNone({ url: `${BASE}/projects/p1`, method: 'DELETE' });
  });

  it('should not show the legacy import banner when nothing is saved under the old key', async () => {
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('We found a design');
  });

  it('should offer to import a legacy save found under the old localStorage key', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyDocument()));
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('We found a design');
  });

  it('should import the legacy save as a new project and navigate to it', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyDocument()));
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const importButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.legacy-banner__actions button'),
    ).find((button) =>
      button.textContent?.includes('Import as a new project'),
    ) as HTMLButtonElement;
    importButton.click();

    const createReq = http.expectOne({ url: `${BASE}/projects`, method: 'POST' });
    expect(createReq.request.body).toEqual({ title: 'Imported design' });
    createReq.flush(project({ id: 'imported-id', title: 'Imported design' }));

    await flushMicrotasks();
    const saveReq = http.expectOne({ url: `${BASE}/projects/imported-id/document`, method: 'PUT' });
    saveReq.flush(legacyDocument());
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'imported-id']);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('should hide the legacy banner without touching the saved slot when dismissed', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyDocument()));
    createFixture();
    fixture.detectChanges();
    http.expectOne(`${BASE}/projects`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance['dismissLegacy']();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('We found a design');
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });
});
