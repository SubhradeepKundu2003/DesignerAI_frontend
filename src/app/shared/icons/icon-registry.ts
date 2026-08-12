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
  rocket: [
    path(
      'M12 3C14 5.2 15 8 15 11.5c0 2-.5 3.8-1.3 5.3L12 20l-1.7-3.2C9.5 15.3 9 13.5 9 11.5 9 8 10 5.2 12 3Z',
    ),
    circle(12, 10.5, 1.6),
    path('M9.2 15 6.5 18.5'),
    path('M14.8 15 17.5 18.5'),
  ],
  shield: [
    path('M12 3 19 6v5.5c0 4.7-3 7.8-7 9.5-4-1.7-7-4.8-7-9.5V6Z'),
    path('M8.7 12 10.9 14.3 15.3 9.8'),
  ],
  globe: [
    circle(12, 12, 8.5),
    path('M3.5 12h17'),
    path('M12 3.5c2.6 2.2 4 5.2 4 8.5s-1.4 6.3-4 8.5c-2.6-2.2-4-5.2-4-8.5s1.4-6.3 4-8.5Z'),
  ],
  clock: [circle(12, 12, 8.5), path('M12 7.5V12l3.3 2')],
  gift: [
    rect(4.5, 10.5, 15, 9.5),
    rect(3.5, 7.5, 17, 3.5),
    path('M12 7.5V20'),
    circle(9.5, 5, 1.8),
    circle(14.5, 5, 1.8),
  ],
  heart: [
    path(
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0-.1-7.7Z',
    ),
  ],
  briefcase: [
    rect(3.5, 8, 17, 11),
    path('M8.5 8V6c0-.8.7-1.5 1.5-1.5h4c.8 0 1.5.7 1.5 1.5v2'),
    path('M3.5 13h17'),
  ],
  award: [circle(12, 9, 5.5), path('M9 13.8 7.3 20.5 12 17.8l4.7 2.7-1.7-6.7')],
  zap: [path('M13 2.5 5.5 13.5h5l-1.5 8 8-11.5h-5l1-7.5Z')],
  book: [rect(4, 5, 7.5, 14), rect(12.5, 5, 7.5, 14)],
  mail: [rect(3.5, 6, 17, 12), path('M3.5 7 12 13l8.5-6')],
  megaphone: [
    path('M4 10v4h4l9 4V6l-9 4Z'),
    path('M8 14v3.5h2V14'),
    path('M18 9.5v5'),
    path('M20.5 8v8'),
  ],
  gear: [
    circle(12, 12, 4),
    circle(12, 12, 7.5),
    rect(11, 2.5, 2, 3),
    rect(11, 18.5, 2, 3),
    rect(2.5, 11, 3, 2),
    rect(18.5, 11, 3, 2),
  ],
  graduationCap: [
    path('M12 4 2 9l10 5 10-5Z'),
    path('M6 11.5v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5'),
    path('M22 9v6'),
  ],
  mapPin: [path('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'), circle(12, 10, 3)],
  search: [circle(10, 10, 6), path('M14.4 14.4 20 20')],
} as const;

export type IconName = keyof typeof ICON_GLYPHS;

export const ICON_NAMES = Object.keys(ICON_GLYPHS) as readonly IconName[];
