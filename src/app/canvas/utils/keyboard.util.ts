/** Pure helpers behind the global keyboard shortcuts. No Angular, no state. */

const ARROW_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

export function isArrowKey(key: string): boolean {
  return key in ARROW_DELTA;
}

/** The nudge for `key` scaled to `distance` px, or `null` for a non-arrow key. */
export function arrowDelta(key: string, distance: number): { dx: number; dy: number } | null {
  const direction = ARROW_DELTA[key];
  return direction ? { dx: direction.dx * distance, dy: direction.dy * distance } : null;
}

/**
 * Whether `target` is a form control that should keep every keystroke for
 * itself — shortcuts stay off while the user is typing a value or a name.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}
