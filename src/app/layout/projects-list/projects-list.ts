import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ApiProject, ProjectApiService } from '../../core/services/project-api.service';

const DEFAULT_TITLE = 'Untitled design';

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
  private readonly router = inject(Router);

  protected readonly projects = signal<ApiProject[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly loadError = signal(false);

  constructor() {
    this.refresh();
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
