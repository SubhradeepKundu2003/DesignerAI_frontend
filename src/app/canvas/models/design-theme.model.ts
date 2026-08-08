/**
 * The theme layer that sits on top of the element model.
 *
 * Elements keep literal colour/font values — a document still renders with no
 * theme at all, e.g. one saved before this model existed — but a themeable
 * field can *also* carry a `ThemeColorRef`, which is how {@link ApplyThemeCommand}
 * (see `commands/apply-theme.command.ts`) knows which literal values to
 * recompute when the active theme changes.
 */

export interface ThemeAccent {
  name: string;
  solid: string;
  tint: string;
}

export interface DesignTheme {
  readonly id: string;
  name: string;
  colors: {
    ink: string;
    muted: string;
    surface: string;
    border: string;
    /** Cycled by index — `accent-0-solid` is `accents[0].solid`, and so on. */
    accents: ThemeAccent[];
  };
  fonts: {
    heading: string;
    body: string;
  };
  /** Default corner radius for new shapes, in px. */
  radius: number;
  /** Base spacing unit templates/frames align to, in px. */
  spacing: number;
}

/**
 * What a themeable field (`fillRef`, `strokeRef`, …) points at: one of the
 * theme's flat colours, or an accent by cycle index and variant.
 */
export type ThemeColorRef = 'ink' | 'muted' | 'surface' | 'border' | `accent-${number}-solid` | `accent-${number}-tint`;

const ACCENT_REF_PATTERN = /^accent-(\d+)-(solid|tint)$/;

/** Looks up `ref` against `theme`, or `undefined` for an out-of-range accent index. */
export function resolveThemeColor(theme: DesignTheme, ref: ThemeColorRef): string | undefined {
  switch (ref) {
    case 'ink':
      return theme.colors.ink;
    case 'muted':
      return theme.colors.muted;
    case 'surface':
      return theme.colors.surface;
    case 'border':
      return theme.colors.border;
    default: {
      const match = ACCENT_REF_PATTERN.exec(ref);
      if (!match) {
        return undefined;
      }
      const accent = theme.colors.accents[Number(match[1])];
      return accent ? (match[2] === 'solid' ? accent.solid : accent.tint) : undefined;
    }
  }
}
