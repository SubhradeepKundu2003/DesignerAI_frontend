import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CanvasDocument } from '../../canvas/models/canvas-document.model';
import { LegacyImportService } from '../../core/services/legacy-import.service';
import { ApiProject, ProjectApiService } from '../../core/services/project-api.service';

const DEFAULT_TITLE = 'Untitled design';
const LEGACY_IMPORT_TITLE = 'Imported design';

/**
 * The landing route (`/`) -- create, open, rename and delete projects
 * against `designerai-backend`. The first screen `Router` renders in this
 * app (PLAN-PHASE4.md Track I4); the canvas editor is a routed child at
 * `/projects/:id`, reached from here.
 */
@Component({
  selector: 'app-projects-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly api = inject(ProjectApiService);
  private readonly legacyImport = inject(LegacyImportService);
  private readonly router = inject(Router);

  protected readonly projects = signal<ApiProject[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly loadError = signal(false);

  protected readonly legacyDocument = signal<CanvasDocument | null>(null);
  protected readonly importingLegacy = signal(false);
  protected readonly legacyImportError = signal(false);

  constructor() {
    this.refresh();
    this.legacyDocument.set(this.legacyImport.detect());
  }

  protected create(): void {
    this.creating.set(true);
    this.api.createProject(DEFAULT_TITLE).subscribe({
      next: (project) => void this.router.navigate(['/projects', project.id]),
      error: () => this.creating.set(false),
    });
  }

  protected rename(project: ApiProject): void {
    const title = window.prompt('Rename project', project.title)?.trim();
    if (!title || title === project.title) {
      return;
    }
    this.api.renameProject(project.id, title).subscribe(() => this.refresh());
  }

  protected remove(project: ApiProject): void {
    if (!window.confirm(`Delete "${project.title}"? This can't be undone.`)) {
      return;
    }
    this.api.deleteProject(project.id).subscribe(() => this.refresh());
  }

  protected async importLegacy(): Promise<void> {
    const document = this.legacyDocument();
    if (!document || this.importingLegacy()) {
      return;
    }

    this.importingLegacy.set(true);
    this.legacyImportError.set(false);
    try {
      const id = await this.legacyImport.import(document, LEGACY_IMPORT_TITLE);
      this.legacyDocument.set(null);
      await this.router.navigate(['/projects', id]);
    } catch {
      this.importingLegacy.set(false);
      this.legacyImportError.set(true);
    }
  }

  /** Hides the offer for this visit — the legacy slot itself is untouched, so it's offered again next time. */
  protected dismissLegacy(): void {
    this.legacyDocument.set(null);
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.listProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
        this.creating.set(false);
        this.loadError.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.creating.set(false);
        this.loadError.set(true);
      },
    });
  }
}
