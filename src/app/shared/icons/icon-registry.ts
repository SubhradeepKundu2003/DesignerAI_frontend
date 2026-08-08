/**
 * The canvas content-icon set: decorative glyphs `IconElement` (and the
 * infographic templates) place *on the page*. Not the editor's own UI chrome
 * — see `shared/components/app-icon/icon-paths.ts` for that, a deliberately
 * separate set so "icons the app uses to draw its own buttons" never gets
 * mixed up with "icons a document can contain."
 *
 * Shape descriptors rather than raw SVG markup, same reasoning as
 * `app-icon`'s icon set: declarative data that two different renderers (a
 * flattened `<img>` data URL for templates today, a live Konva shape for
 * `IconElement`) can each turn into pixels their own way, from one source.
 * All glyphs sit on a 24x24 grid with a ~1.8px stroke.
 */

export type IconGlyphPart =
  | { readonly kind: 'path'; readonly d: string }
  | {
      readonly kind: 'circle';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      /** Solid-filled instead of stroked — only the `target` dot needs this. */
      readonly filled?: boolean;
    }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly width: number; readonly height: number };

const path = (d: string): IconGlyphPart => ({ kind: 'path', d });
const circle = (cx: number, cy: number, r: number, filled = false): IconGlyphPart => ({
  kind: 'circle',
  cx,
  cy,
  r,
  filled,
});
const rect = (x: number, y: number, width: number, height: number): IconGlyphPart => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
});

export const ICON_GLYPHS = {
  lightbulb: [
    path('M12 3.5a5.5 5.5 0 0 0-3.2 9.98c.46.33.7.85.7 1.4V16h5v-1.12c0-.55.24-1.07.7-1.4A5.5 5.5 0 0 0 12 3.5Z'),
    path('M9.6 18.5h4.8'),
    path('M10.2 20.5h3.6'),
  ],
  target: [circle(12, 12, 7.5), circle(12, 12, 4), circle(12, 12, 0.9, true)],
  trendUp: [path('M4 16.5 9.5 11l3.5 3.5L20 7'), path('M14.5 7H20v5.5')],
  flag: [path('M6 3.5v17'), path('M6 4.5h12.5l-3 4 3 4H6')],
  chat: [rect(4, 5, 16, 11), path('M8.5 19.5 11.5 16')],
  check: [circle(12, 12, 8.5), path('M8 12.3 10.7 15 16 9.3')],
  users: [
    circle(9, 8.3, 3),
    path('M3.8 19c.3-3 2.6-5 5.2-5s4.9 2 5.2 5'),
    circle(17.3, 9.3, 2.2),
    path('M15.9 19c.1-2.1 1.5-3.7 3.3-4.1'),
  ],
  star: [path('M12 3.5l2.4 5 5.4.6-4 3.8.9 5.5-4.7-2.6-4.7 2.6.9-5.5-4-3.8 5.4-.6Z')],
  calendar: [rect(4, 5.5, 16, 14.5), path('M4 9.5h16'), path('M8 3.5v3.5M16 3.5v3.5')],
  compass: [circle(12, 12, 8.5), path('M15.2 8.8 13.4 13.4 8.8 15.2l1.8-4.6Z')],
} as const;

export type IconName = keyof typeof ICON_GLYPHS;

export const ICON_NAMES = Object.keys(ICON_GLYPHS) as readonly IconName[];
