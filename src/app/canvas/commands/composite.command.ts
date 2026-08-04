import { Command } from '../models/commands.model';

/**
 * Bundles several commands into one undo step.
 *
 * Used wherever a single user gesture has to touch more than one thing that
 * already has its own command — a grouped drag committing one
 * `UpdateElementCommand` per member, or deleting a group alongside the
 * elements it contains. Undo runs the wrapped commands in reverse, so each
 * one still sees the state it originally expects to unwind.
 */
export class CompositeCommand implements Command {
  constructor(
    private readonly commands: readonly Command[],
    readonly label: string,
  ) {}

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i -= 1) {
      this.commands[i].undo();
    }
  }
}
