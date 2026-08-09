import { Routes } from '@angular/router';

import { EditorShell } from './layout/editor-shell/editor-shell';
import { ProjectsList } from './layout/projects-list/projects-list';

/**
 * The project list is the landing route -- the first place `Router` enters
 * this app (PLAN-PHASE4.md Track I4). The editor itself becomes a routed
 * child keyed by project id, read by `EditorShell` and handed to
 * `PersistenceService.openProject`.
 */
export const routes: Routes = [
  { path: '', component: ProjectsList },
  { path: 'projects/:id', component: EditorShell },
  { path: '**', redirectTo: '' },
];
