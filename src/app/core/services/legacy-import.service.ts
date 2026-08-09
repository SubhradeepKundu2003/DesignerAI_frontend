import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AssetExternalizationService } from '../../canvas/services/asset-externalization.service';
import { CanvasDocument, isCanvasDocument } from '../../canvas/models/canvas-document.model';
import { LocalStorageService } from './local-storage.service';
import { ProjectApiService } from './project-api.service';

/** The only key `PersistenceService` ever wrote before Track H/I's backend existed. */
const LEGACY_STORAGE_KEY = 'designerai:canvas:v1';

/**
 * One-time bridge for that pre-backend, single-slot save (PLAN-PHASE4.md
 * Track K1) -- so a design made before this backend shipped isn't silently
 * orphaned once `PersistenceService` moves on to per-project cache keys. The
 * legacy slot is only cleared once its document has actually landed on the
 * server, matching Track K1's "no one's current work disappears silently."
 */
@Injectable({ providedIn: 'root' })
export class LegacyImportService {
  private readonly storage = inject(LocalStorageService);
  private readonly api = inject(ProjectApiService);
  private readonly externalization = inject(AssetExternalizationService);

  /** The legacy document, if the pre-backend save slot still holds one. */
  detect(): CanvasDocument | null {
    const value = this.storage.get<CanvasDocument>(LEGACY_STORAGE_KEY);
    return isCanvasDocument(value) ? value : null;
  }

  /** Imports the legacy document as a new project and clears the legacy slot. */
  async import(document: CanvasDocument, title: string): Promise<string> {
    const project = await firstValueFrom(this.api.createProject(title));
    const externalized = await this.externalization.externalize(project.id, document);
    await firstValueFrom(this.api.saveDocument(project.id, externalized));
    this.storage.remove(LEGACY_STORAGE_KEY);
    return project.id;
  }
}
