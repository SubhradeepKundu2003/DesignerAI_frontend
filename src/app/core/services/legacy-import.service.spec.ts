import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CanvasDocument } from '../../canvas/models/canvas-document.model';
import { LegacyImportService } from './legacy-import.service';

const BASE = environment.apiBaseUrl;
const LEGACY_KEY = 'designerai:canvas:v1';

function blankDocument(): CanvasDocument {
  return {
    version: 1,
    pages: [{ id: 'p1', width: 794, height: 1123, background: '#fff', elements: [], groups: [] }],
  };
}

/** `import()` chains through `AssetExternalizationService` before the save PUT is dispatched. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('LegacyImportService', () => {
  let service: LegacyImportService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LegacyImportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('detect', () => {
    it('should return null when nothing is saved under the legacy key', () => {
      expect(service.detect()).toBeNull();
    });

    it('should return the document when a valid legacy save exists', () => {
      const document = blankDocument();
      localStorage.setItem(LEGACY_KEY, JSON.stringify(document));

      expect(service.detect()).toEqual(document);
    });

    it('should return null for corrupted or non-document JSON', () => {
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ not: 'a document' }));

      expect(service.detect()).toBeNull();
    });
  });

  describe('import', () => {
    it('should create a project, save the document, and clear the legacy slot', async () => {
      const document = blankDocument();
      localStorage.setItem(LEGACY_KEY, JSON.stringify(document));

      const importPromise = service.import(document, 'Imported design');

      const createReq = http.expectOne({ url: `${BASE}/projects`, method: 'POST' });
      expect(createReq.request.body).toEqual({ title: 'Imported design' });
      createReq.flush({
        id: 'new-id',
        owner_id: null,
        title: 'Imported design',
        format_version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      await flushMicrotasks();
      const saveReq = http.expectOne({ url: `${BASE}/projects/new-id/document`, method: 'PUT' });
      expect(saveReq.request.body).toEqual(document);
      saveReq.flush(document);

      expect(await importPromise).toBe('new-id');
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it('should leave the legacy slot in place when the save fails', async () => {
      const document = blankDocument();
      localStorage.setItem(LEGACY_KEY, JSON.stringify(document));

      const importPromise = service.import(document, 'Imported design');

      const createReq = http.expectOne({ url: `${BASE}/projects`, method: 'POST' });
      createReq.flush({
        id: 'new-id',
        owner_id: null,
        title: 'Imported design',
        format_version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      await flushMicrotasks();
      const saveReq = http.expectOne({ url: `${BASE}/projects/new-id/document`, method: 'PUT' });
      saveReq.error(new ProgressEvent('offline'));

      await expect(importPromise).rejects.toBeTruthy();
      expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    });
  });
});
