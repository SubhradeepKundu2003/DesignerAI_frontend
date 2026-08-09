import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CanvasDocument } from '../../canvas/models/canvas-document.model';
import { ProjectApiService } from './project-api.service';

const BASE = environment.apiBaseUrl;

describe('ProjectApiService', () => {
  let service: ProjectApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create a project and map the raw snake_case response to camelCase', () => {
    let result: unknown;
    service.createProject('My Design').subscribe((project) => (result = project));

    const req = http.expectOne(`${BASE}/projects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'My Design' });
    req.flush({
      id: 'p1',
      owner_id: null,
      title: 'My Design',
      format_version: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(result).toEqual({
      id: 'p1',
      ownerId: null,
      title: 'My Design',
      formatVersion: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });

  it('should list projects', () => {
    let result: unknown;
    service.listProjects().subscribe((projects) => (result = projects));

    const req = http.expectOne(`${BASE}/projects`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'p1',
        owner_id: null,
        title: 'A',
        format_version: 1,
        created_at: 't1',
        updated_at: 't1',
      },
    ]);

    expect(result).toEqual([
      { id: 'p1', ownerId: null, title: 'A', formatVersion: 1, createdAt: 't1', updatedAt: 't1' },
    ]);
  });

  it('should rename a project', () => {
    let result: unknown;
    service.renameProject('p1', 'Renamed').subscribe((project) => (result = project));

    const req = http.expectOne(`${BASE}/projects/p1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Renamed' });
    req.flush({
      id: 'p1',
      owner_id: null,
      title: 'Renamed',
      format_version: 1,
      created_at: 't1',
      updated_at: 't2',
    });

    expect((result as { title: string }).title).toBe('Renamed');
  });

  it('should delete a project', () => {
    let completed = false;
    service.deleteProject('p1').subscribe({ complete: () => (completed = true) });

    const req = http.expectOne(`${BASE}/projects/p1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('should fetch a project document', () => {
    const document: CanvasDocument = { version: 1, pages: [] };
    let result: unknown;
    service.getDocument('p1').subscribe((doc) => (result = doc));

    const req = http.expectOne(`${BASE}/projects/p1/document`);
    expect(req.request.method).toBe('GET');
    req.flush(document);

    expect(result).toEqual(document);
  });

  it('should save a project document', () => {
    const document: CanvasDocument = { version: 1, pages: [] };
    service.saveDocument('p1', document).subscribe();

    const req = http.expectOne(`${BASE}/projects/p1/document`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(document);
    req.flush(document);
  });

  it('should upload an asset as multipart form data and map the response', () => {
    let result: unknown;
    const file = new Blob(['bytes'], { type: 'image/png' });
    service.uploadAsset('p1', file, 'pic.png').subscribe((asset) => (result = asset));

    const req = http.expectOne(`${BASE}/projects/p1/assets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({
      id: 'a1',
      content_hash: 'abc123',
      mime_type: 'image/png',
      byte_size: 5,
      url: '/assets/a1',
    });

    expect(result).toEqual({
      id: 'a1',
      contentHash: 'abc123',
      mimeType: 'image/png',
      byteSize: 5,
      url: '/assets/a1',
    });
  });

  it('should resolve an asset url from an id', () => {
    expect(service.assetUrl('a1')).toBe(`${BASE}/assets/a1`);
  });
});
