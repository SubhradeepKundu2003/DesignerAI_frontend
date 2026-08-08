import { ThemeColorRef } from '../../models/design-theme.model';

/**
 * Brand-neutral colours shared by every template — a light, newsletter-safe
 * palette (as opposed to the dark 16:9 slide theme the source PNGs used),
 * built around the same indigo the shape tool already defaults to.
 *
 * These literal values are also `INDIGO_CLASSIC` in `data/design-themes.ts`,
 * exactly — so a template that pairs a literal here with the matching
 * `*Ref` from {@link accentRef} (or the `'ink' | 'muted' | 'border'` literals
 * directly) renders identically with no theme applied, and recolours
 * correctly the moment one is.
 */
export const INK = '#1c1f24';
export const MUTED = '#5b6472';
export const BORDER = '#e2e4e9';

export const ACCENTS = {
  indigo: { solid: '#4f46e5', tint: '#eef2ff' },
  teal: { solid: '#0d9488', tint: '#f0fdfa' },
  amber: { solid: '#d97706', tint: '#fffbeb' },
  rose: { solid: '#e11d48', tint: '#fff1f3' },
} as const;

export const ACCENT_CYCLE = [ACCENTS.indigo, ACCENTS.teal, ACCENTS.amber, ACCENTS.rose] as const;

/** The `ThemeColorRef` matching `ACCENT_CYCLE[index]`, for pairing with its literal value. */
export function accentRef(index: number, variant: 'solid' | 'tint'): ThemeColorRef {
  return `accent-${index}-${variant}`;
}
