import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CanvasDocument } from '../../canvas/models/canvas-document.model';

export interface ApiProject {
  readonly id: string;
  readonly ownerId: string | null;
  readonly title: string;
  readonly formatVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UploadedAsset {
  readonly id: string;
  readonly contentHash: string;
  readonly mimeType: string;
  readonly byteSize: number;
  /** Path relative to `apiBaseUrl` — pass through {@link ProjectApiService.assetUrl} to resolve it. */
  readonly url: string;
}

/** The wire shape `designerai-backend` actually returns — snake_case, per its own schema (Track H). */
interface RawProject {
  readonly id: string;
  readonly owner_id: string | null;
  readonly title: string;
  readonly format_version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawAsset {
  readonly id: string;
  readonly content_hash: string;
  readonly mime_type: string;
  readonly byte_size: number;
  readonly url: string;
}

function fromRawProject(raw: RawProject): ApiProject {
  return {
    id: raw.id,
    ownerId: raw.owner_id,
    title: raw.title,
    formatVersion: raw.format_version,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function fromRawAsset(raw: RawAsset): UploadedAsset {
  return {
    id: raw.id,
    contentHash: raw.content_hash,
    mimeType: raw.mime_type,
    byteSize: raw.byte_size,
    url: raw.url,
  };
}

/**
 * Talks to `designerai-backend` (Track H) — the only place in the app that knows its wire format
 * (snake_case JSON) is different from the app's own camelCase conventions; every method here returns
 * the mapped, camelCase shape so nothing downstream has to think about it.
 */
@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createProject(title: string): Observable<ApiProject> {
    return this.http
      .post<RawProject>(`${this.baseUrl}/projects`, { title })
      .pipe(map(fromRawProject));
  }

  listProjects(): Observable<ApiProject[]> {
    return this.http
      .get<RawProject[]>(`${this.baseUrl}/projects`)
      .pipe(map((rows) => rows.map(fromRawProject)));
  }

  renameProject(id: string, title: string): Observable<ApiProject> {
    return this.http
      .patch<RawProject>(`${this.baseUrl}/projects/${id}`, { title })
      .pipe(map(fromRawProject));
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }

  getDocument(id: string): Observable<CanvasDocument> {
    return this.http.get<CanvasDocument>(`${this.baseUrl}/projects/${id}/document`);
  }

  saveDocument(id: string, document: CanvasDocument): Observable<CanvasDocument> {
    return this.http.put<CanvasDocument>(`${this.baseUrl}/projects/${id}/document`, document);
  }

  uploadAsset(projectId: string, file: Blob, filename: string): Observable<UploadedAsset> {
    const form = new FormData();
    form.append('file', file, filename);
    return this.http
      .post<RawAsset>(`${this.baseUrl}/projects/${projectId}/assets`, form)
      .pipe(map(fromRawAsset));
  }

  assetUrl(id: string): string {
    return `${this.baseUrl}/assets/${id}`;
  }
}
