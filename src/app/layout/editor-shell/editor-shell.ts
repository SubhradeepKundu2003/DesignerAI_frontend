import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { CanvasWorkspace } from '../../canvas/components/canvas-workspace/canvas-workspace';
import { PageNavigator } from '../../canvas/components/page-navigator/page-navigator';
import { KeyboardShortcuts } from '../../canvas/services/keyboard-shortcuts.service';
import { PersistenceService } from '../../canvas/services/persistence.service';
import { EditorSidebar } from '../editor-sidebar/editor-sidebar';
import { EditorToolbar } from '../editor-toolbar/editor-toolbar';
import { PropertiesPanel } from '../properties-panel/properties-panel';
import { ZoomControls } from '../zoom-controls/zoom-controls';

/**
 * The editor workspace: toolbar on top, tools on the left, properties on the
 * right, zoom bar at the bottom and the canvas in the middle.
 *
 * Composition, plus the two pieces of editor-wide plumbing that have to live
 * above every panel: the global keyboard shortcuts (bound on the window so
 * they fire regardless of which panel has focus), and opening whichever
 * project the `/projects/:id` route names against {@link PersistenceService}.
 */
@Component({
  selector: 'app-editor-shell',
  imports: [
    EditorToolbar,
    EditorSidebar,
    CanvasWorkspace,
    PropertiesPanel,
    PageNavigator,
    ZoomControls,
  ],
  templateUrl: './editor-shell.html',
  styleUrl: './editor-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'shortcuts.handleKeydown($event)',
    '(window:keyup)': 'shortcuts.handleKeyup($event)',
  },
})
export class EditorShell {
  protected readonly shortcuts = inject(KeyboardShortcuts);
  private readonly persistence = inject(PersistenceService);
  private readonly projectId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      const id = this.projectId();
      if (id) {
        this.persistence.openProject(id);
      }
    });
  }
}
