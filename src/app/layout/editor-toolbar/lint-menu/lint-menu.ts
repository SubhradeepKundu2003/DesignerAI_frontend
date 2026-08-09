import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { DesignLintService, LintIssue } from '../../../canvas/services/design-lint.service';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { IconButton } from '../../../shared/components/icon-button/icon-button';

/**
 * Toolbar control for Track E2's design linter — a "Check design" button that
 * runs `DesignLintService` against the active page and lists what it finds.
 * Structured like `ExportMenu`/`GenerateMenu`: a toggle button revealing a
 * small flyout, no shared popover primitive to reach for. Unlike those two,
 * there's nothing to configure first — opening the panel *is* running the
 * check, against whatever the active page looks like right now.
 */
@Component({
  selector: 'app-lint-menu',
  imports: [IconButton],
  templateUrl: './lint-menu.html',
  styleUrl: './lint-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class LintMenu {
  private readonly lintService = inject(DesignLintService);
  private readonly canvas = inject(CanvasStore);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly issues = signal<LintIssue[]>([]);

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.recheck();
    this.open.set(true);
  }

  protected recheck(): void {
    this.issues.set(this.lintService.lint(this.canvas.activePage()));
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
