import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';

import { ApplyThemeCommand } from '../../canvas/commands/apply-theme.command';
import { CommandBus } from '../../canvas/commands/command-bus.service';
import { ElementActions } from '../../canvas/services/element-actions.service';
import { PersistenceService } from '../../canvas/services/persistence.service';
import { ProjectFileService } from '../../canvas/services/project-file.service';
import { CanvasStore } from '../../canvas/state/canvas.store';
import { EditorSettingsStore } from '../../canvas/state/editor-settings.store';
import { ThemeStore } from '../../canvas/state/theme.store';
import { ViewportStore } from '../../canvas/state/viewport.store';
import { IconButton } from '../../shared/components/icon-button/icon-button';
import { ExportMenu } from './export-menu/export-menu';

/** Top toolbar: history, object actions, canvas aids and the zoom readout. */
@Component({
  selector: 'app-editor-toolbar',
  imports: [IconButton, ExportMenu],
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
  private readonly projectFile = inject(ProjectFileService);
  private readonly canvas = inject(CanvasStore);
  private readonly theme = inject(ThemeStore);

  private readonly importInput = viewChild.required<ElementRef<HTMLInputElement>>('importInput');

  protected readonly themePresets = this.theme.presets;
  protected readonly activeThemeId = computed(() => this.theme.activeTheme().id);

  protected readonly gridVisible = this.settings.gridVisible;
  protected readonly snapEnabled = this.settings.snapEnabled;
  protected readonly zoomPercent = this.viewport.zoomPercent;

  protected readonly canUndo = this.commands.canUndo;
  protected readonly canRedo = this.commands.canRedo;

  protected readonly canDelete = this.actions.canDelete;
  protected readonly canDuplicate = this.actions.canDuplicate;
  protected readonly canBringForward = this.actions.canBringForward;
  protected readonly canSendBackward = this.actions.canSendBackward;
  protected readonly canGroup = this.actions.canGroup;
  protected readonly canUngroup = this.actions.canUngroup;
  protected readonly canFrame = this.actions.canFrame;
  protected readonly canDissolveFrame = this.actions.canDissolveFrame;

  protected readonly canLoad = this.persistence.hasSave;
  protected readonly justSaved = this.persistence.justSaved;
  protected readonly importError = this.projectFile.importError;

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

  protected group(): void {
    this.actions.groupSelection();
  }

  protected ungroup(): void {
    this.actions.ungroupSelection();
  }

  /** The one-button toolbar action always frames in a row; a column frame starts by switching the direction in the properties panel. */
  protected frame(): void {
    this.actions.frameSelection('row');
  }

  protected dissolveFrame(): void {
    this.actions.dissolveFrameSelection();
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

  protected exportProject(): void {
    void this.projectFile.exportProject();
  }

  protected pickProjectFile(): void {
    this.importInput().nativeElement.click();
  }

  protected onProjectFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still fires a change event.
    input.value = '';
    if (file) {
      void this.projectFile.importProject(file);
    }
  }

  protected setTheme(id: string): void {
    const theme = this.themePresets.find((preset) => preset.id === id);
    if (theme && theme.id !== this.activeThemeId()) {
      this.commands.dispatch(new ApplyThemeCommand(this.canvas, theme));
    }
  }
}

function labelFor(action: string, change: string | null): string {
  return change ? `${action} — ${change.toLowerCase()}` : action;
}
