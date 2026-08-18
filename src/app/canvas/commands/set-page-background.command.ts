import { Command } from '../models/commands.model';
import { CanvasStore } from '../state/canvas.store';

/** Changes one page's background colour — used by `GenerateMenu` to apply
 * TCS/TATA branded mode's black/white background to a prompt-generated page. */
export class SetPageBackgroundCommand implements Command {
  readonly label = 'Change page background';

  private readonly previousBackground: string | undefined;

  constructor(
    private readonly canvas: CanvasStore,
    private readonly pageId: string,
    private readonly background: string,
  ) {
    this.previousBackground = canvas.pages().find((page) => page.id === pageId)?.background;
  }

  execute(): void {
    this.canvas.patchPage(this.pageId, { background: this.background });
  }

  undo(): void {
    if (this.previousBackground !== undefined) {
      this.canvas.patchPage(this.pageId, { background: this.previousBackground });
    }
  }
}
