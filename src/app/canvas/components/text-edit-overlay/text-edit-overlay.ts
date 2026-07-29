import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';

import { UpdateElementCommand } from '../../commands/update-element.command';
import { CommandBus } from '../../commands/command-bus.service';
import { CanvasStore } from '../../state/canvas.store';
import { TextEditingStore } from '../../state/text-editing.store';
import { ViewportStore } from '../../state/viewport.store';
import { measureTextHeight } from '../../utils/text-measure.util';

/**
 * The HTML textarea that sits over a text box while it is being edited.
 *
 * The Konva node underneath is hidden by the workspace for the duration —
 * this is a real DOM element instead, because a canvas has no text cursor,
 * no IME support and no selection handles of its own. Position, rotation and
 * every typographic attribute are mirrored from the element so the switch
 * from drawn text to editable text is invisible; the only thing this owns
 * that the document doesn't is the in-progress keystrokes, kept as the
 * textarea's own value until they are committed.
 */
@Component({
  selector: 'app-text-edit-overlay',
  imports: [],
  templateUrl: './text-edit-overlay.html',
  styleUrl: './text-edit-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextEditOverlay {
  private readonly canvas = inject(CanvasStore);
  private readonly commands = inject(CommandBus);
  private readonly textEditing = inject(TextEditingStore);
  private readonly viewport = inject(ViewportStore);

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');

  /** Reactive: follows pan/zoom/typography changes while an edit is open. */
  protected readonly overlayStyle = computed(() => {
    const id = this.textEditing.editingId();
    const element = id ? this.canvas.elementById(id) : undefined;
    if (!element || element.type !== 'text') {
      return null;
    }

    const zoom = this.viewport.zoom();
    return {
      left: element.x * zoom + this.viewport.panX(),
      top: element.y * zoom + this.viewport.panY(),
      width: element.width * zoom,
      rotation: element.rotation,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize * zoom,
      fontWeight: element.fontStyle.includes('bold') ? 700 : 400,
      fontStyleCss: element.fontStyle.includes('italic') ? 'italic' : 'normal',
      color: element.fill,
      textAlign: element.align,
      letterSpacing: element.letterSpacing * zoom,
      lineHeight: element.lineHeight,
    };
  });

  /** The id last seeded into the textarea, so a re-render never overwrites typing. */
  private lastSeededId: string | null = null;

  constructor() {
    // Not reactive to the document on purpose: seeding must happen exactly
    // once per edit session (id null -> id), never again while it is open,
    // or every keystroke elsewhere in the app would overwrite what the user
    // just typed. `untracked` reads the starting text without subscribing.
    effect(() => {
      const id = this.textEditing.editingId();
      if (id === null) {
        this.lastSeededId = null;
        return;
      }

      const textarea = this.textareaRef()?.nativeElement;
      if (!textarea || id === this.lastSeededId) {
        return;
      }

      const element = untracked(() => this.canvas.elementById(id));
      if (!element || element.type !== 'text') {
        return;
      }

      this.lastSeededId = id;
      textarea.value = element.text;
      autosize(textarea);
      textarea.focus();
      textarea.select();
    });
  }

  protected onInput(event: Event): void {
    autosize(event.target as HTMLTextAreaElement);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.textEditing.end();
      return;
    }

    // Shift+Enter still inserts a newline; plain Enter finishes editing.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).blur();
    }
  }

  protected commit(): void {
    const id = this.textEditing.editingId();
    const textarea = this.textareaRef()?.nativeElement;
    // `end()` runs unconditionally: Escape already cleared the id, and the
    // blur this causes must not be mistaken for a second commit.
    this.textEditing.end();
    if (!id || !textarea) {
      return;
    }

    const element = untracked(() => this.canvas.elementById(id));
    if (!element || element.type !== 'text') {
      return;
    }

    const text = textarea.value;
    if (text === element.text) {
      return;
    }

    const height = measureTextHeight({
      text,
      width: element.width,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontStyle: element.fontStyle,
      letterSpacing: element.letterSpacing,
      lineHeight: element.lineHeight,
    });

    this.commands.dispatch(
      new UpdateElementCommand(this.canvas, id, { text, height }, { label: 'Edit text' }),
    );
  }
}

/** Grows the textarea to fit its content, so wrapped lines are never clipped. */
function autosize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}
