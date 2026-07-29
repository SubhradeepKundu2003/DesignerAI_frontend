/**
 * Reads a design token — a CSS custom property declared on `:root` — at runtime.
 *
 * Konva paints to a canvas and so cannot use the stylesheet, but the chrome it
 * paints (margin guides, selection outlines, snap guides) belongs to the same
 * palette as the DOM UI. Looking the token up keeps `styles/_tokens.scss` the
 * one place a colour is defined; `fallback` covers environments without a
 * document, and tokens that have not been declared.
 */
export function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
