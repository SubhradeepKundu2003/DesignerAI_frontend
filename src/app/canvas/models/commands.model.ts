/**
 * The mutation contract.
 *
 * Every change to the Canvas JSON document is a command: the stores are only
 * ever written through one of these, which is what makes undo/redo fall out for
 * free. It is also the seam the AI service will use later — generated designs
 * arrive as commands, not as direct store writes or Konva calls.
 */
export interface Command {
  /**
   * Human-readable summary ("Move element", "Change fill"). Shown on the
   * undo/redo tooltips today; the same string is the editing trace an AI
   * refinement loop will read later.
   */
  readonly label: string;

  execute(): void;

  undo(): void;

  /**
   * Folds `next` into this command so a continuous interaction — a slider
   * scrub, typing in a field — costs one undo step rather than dozens.
   *
   * Called on the command already on the undo stack, *after* `next` has been
   * executed. Returning `true` means this command has absorbed it and `next`
   * must not be pushed; returning `false` (the default) keeps them separate.
   */
  mergeWith?(next: Command): boolean;
}
