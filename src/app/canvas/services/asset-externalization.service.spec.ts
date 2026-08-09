import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { imageElement, shapeElement } from '../../../testing/canvas-fixtures';
import { ImageElement } from '../models/canvas-element.model';
import { CanvasDocument } from '../models/canvas-document.model';
import { AssetExternalizationService } from './asset-externalization.service';

const BASE = environment.apiBaseUrl;
const PROJECT_ID = 'p1';

// Decodes to well over the 50 KB threshold; all-'A' is valid (padding-free) base64.
const LARGE_IMAGE_SRC = `data:image/png;base64,${'A'.repeat(70000)}`;

function documentWith(...elements: ImageElement[]): CanvasDocument {
  return {
    version: 1,
    pages: [{ id: 'p1', width: 794, height: 1123, background: '#fff', elements, groups: [] }],
  };
}

describe('AssetExternalizationService', () => {
  let service: AssetExternalizationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssetExternalizationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should leave a small image inline', async () => {
    const document = documentWith(imageElement());

    const result = await service.externalize(PROJECT_ID, document);

    expect(result).toBe(document);
    http.expectNone(`${BASE}/projects/${PROJECT_ID}/assets`);
  });

  it('should leave non-image elements untouched', async () => {
    const document: CanvasDocument = {
      version: 1,
      pages: [{ id: 'p1', width: 794, height: 1123, background: '#fff', elements: [shapeElement()], groups: [] }],
    };

    const result = await service.externalize(PROJECT_ID, document);

    expect(result).toBe(document);
  });

  it('should upload a large image and replace its src with the backend asset url', async () => {
    const document = documentWith(imageElement({ src: LARGE_IMAGE_SRC }));

    const resultPromise = service.externalize(PROJECT_ID, document);

    const req = http.expectOne(`${BASE}/projects/${PROJECT_ID}/assets`);
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({ id: 'asset-1', content_hash: 'abc', mime_type: 'image/png', byte_size: 70000, url: '/assets/asset-1' });

    const result = await resultPromise;

    expect((result.pages[0].elements[0] as ImageElement).src).toBe(`${BASE}/assets/asset-1`);
  });

  it('should dedupe identical large images to a single upload', async () => {
    const document = documentWith(
      imageElement({ src: LARGE_IMAGE_SRC, name: 'A' }),
      imageElement({ src: LARGE_IMAGE_SRC, name: 'B' }),
    );

    const resultPromise = service.externalize(PROJECT_ID, document);

    const req = http.expectOne(`${BASE}/projects/${PROJECT_ID}/assets`);
    req.flush({ id: 'asset-1', content_hash: 'abc', mime_type: 'image/png', byte_size: 70000, url: '/assets/asset-1' });

    const result = await resultPromise;
    const [first, second] = result.pages[0].elements as ImageElement[];
    expect(first.src).toBe(second.src);
  });
});
