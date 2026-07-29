import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CommandBus } from '../../canvas/commands/command-bus.service';
import { ElementActions } from '../../canvas/services/element-actions.service';
import { PersistenceService } from '../../canvas/services/persistence.service';
import { EditorSettingsStore } from '../../canvas/state/editor-settings.store';
import { ViewportStore } from '../../canvas/state/viewport.store';
import { IconButton } from '../../shared/components/icon-button/icon-button';

/** Top toolbar: history, object actions, canvas aids and the zoom readout. */
@Component({
  selector: 'app-editor-toolbar',
  imports: [IconButton],
  templateUrl: './editor-toolbar.html',
  styleUrl: './editor-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorToolbar {
  private readonly settings = inject(EditorSettingsStore);
  private readonly viewport = inject(ViewportStore);
  private readonly commands = inject(CommandBus);
  private readonly actions = inject(ElementActions);
  private readonly persistence = inject(PersistenceService);

  protected readonly gridVisible = this.settings.gridVisible;
  protected readonly snapEnabled = this.settings.snapEnabled;
  protected readonly zoomPercent = this.viewport.zoomPercent;

  protected readonly canUndo = this.commands.canUndo;
  protected readonly canRedo = this.commands.canRedo;

  protected readonly canDelete = this.actions.canDelete;
  protected readonly canDuplicate = this.actions.canDuplicate;
  protected readonly canBringForward = this.actions.canBringForward;
  protected readonly canSendBackward = this.actions.canSendBackward;

  protected readonly canLoad = this.persistence.hasSave;
  protected readonly justSaved = this.persistence.justSaved;

  /** Names the change on the button, so undo says what it will reverse. */
  protected readonly undoLabel = computed(() => labelFor('Undo', this.commands.undoLabel()));
  protected readonly redoLabel = computed(() => labelFor('Redo', this.commands.redoLabel()));

  protected undo(): void {
    this.commands.undo();
  }

  protected redo(): void {
    this.commands.redo();
  }

  protected duplicate(): void {
    this.actions.duplicateSelection();
  }

  protected delete(): void {
    this.actions.deleteSelection();
  }

  protected bringForward(): void {
    this.actions.bringForward();
  }

  protected sendBackward(): void {
    this.actions.sendBackward();
  }

  protected toggleGrid(): void {
    this.settings.toggleGrid();
  }

  protected toggleSnap(): void {
    this.settings.toggleSnap();
  }

  protected save(): void {
    this.persistence.save();
  }

  protected load(): void {
    this.persistence.load();
  }
}

function labelFor(action: string, change: string | null): string {
  return change ? `${action} — ${change.toLowerCase()}` : action;
}
