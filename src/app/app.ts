import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PersistenceService } from './canvas/services/persistence.service';
import { EditorShell } from './layout/editor-shell/editor-shell';

@Component({
  selector: 'app-root',
  imports: [EditorShell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    inject(PersistenceService).restoreOnStartup();
  }
}
