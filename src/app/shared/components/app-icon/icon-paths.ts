/**
 * Icon geometry for {@link AppIcon}.
 *
 * Icons are stored as shape descriptors rather than raw SVG markup so the
 * component can render them declaratively — no `innerHTML`, no sanitizer
 * bypass. All shapes are drawn on a 24×24 grid with a 2px stroke, matching the
 * lucide visual language.
 */

export type IconShape =
  | { readonly kind: 'path'; readonly d: string }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rx?: number;
    }
  | {
      readonly kind: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    };

const path = (d: string): IconShape => ({ kind: 'path', d });

export const ICON_PATHS = {
  // History
  undo: [path('M9 14 4 9l5-5'), path('M4 9h10.5a5.5 5.5 0 0 1 0 11H11')],
  redo: [path('m15 14 5-5-5-5'), path('M20 9H9.5a5.5 5.5 0 0 0 0 11H13')],

  // Object actions
  duplicate: [
    { kind: 'rect', x: 8, y: 8, width: 14, height: 14, rx: 2 },
    path('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'),
  ],
  trash: [
    path('M3 6h18'),
    path('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'),
    path('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
    { kind: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { kind: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
  bringForward: [
    { kind: 'rect', x: 8, y: 8, width: 8, height: 8, rx: 2 },
    path('M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2'),
    path('M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2'),
  ],
  sendBackward: [
    { kind: 'rect', x: 14, y: 14, width: 8, height: 8, rx: 2 },
    { kind: 'rect', x: 2, y: 2, width: 8, height: 8, rx: 2 },
    path('M7 14v1a2 2 0 0 0 2 2h1'),
    path('M14 7h1a2 2 0 0 1 2 2v1'),
  ],

  // Canvas chrome
  grid: [
    { kind: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 },
    path('M3 9h18'),
    path('M3 15h18'),
    path('M9 3v18'),
    path('M15 3v18'),
  ],
  magnet: [
    path('m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15'),
    path('m5 8 4 4'),
    path('m12 15 4 4'),
  ],

  // Insert tools
  text: [path('M4 7V4h16v3'), path('M9 20h6'), path('M12 4v16')],
  square: [{ kind: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 }],
  circle: [{ kind: 'circle', cx: 12, cy: 12, r: 9 }],
  divider: [path('M5 12h14')],
  image: [
    { kind: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 },
    { kind: 'circle', cx: 9, cy: 9, r: 1.8 },
    path('m21 15-3.09-3.09a2 2 0 0 0-2.83 0L6 21'),
  ],
  layers: [
    path(
      'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
    ),
    path('m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'),
    path('m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65'),
  ],
  upload: [
    path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'),
    path('M17 8l-5-5-5 5'),
    path('M12 3v12'),
  ],

  // Zoom
  plus: [path('M5 12h14'), path('M12 5v14')],
  minus: [path('M5 12h14')],
  fit: [
    path('M8 3H5a2 2 0 0 0-2 2v3'),
    path('M21 8V5a2 2 0 0 0-2-2h-3'),
    path('M3 16v3a2 2 0 0 0 2 2h3'),
    path('M16 21h3a2 2 0 0 0 2-2v-3'),
  ],

  // Persistence
  save: [
    path('M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'),
    path('M17 21v-8H7v8'),
    path('M7 3v5h8'),
  ],
  open: [
    path(
      'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2',
    ),
  ],

  // Layer row toggles
  eye: [
    path(
      'M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0',
    ),
    { kind: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  eyeOff: [
    path('M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68'),
    path('M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61'),
    path('M14.12 14.12a3 3 0 1 1-4.24-4.24'),
    path('m2 2 20 20'),
  ],
  lock: [
    { kind: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 },
    path('M7 11V7a5 5 0 0 1 10 0v4'),
  ],
  unlock: [
    { kind: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 },
    path('M7 11V7a5 5 0 0 1 9.9-1'),
  ],
  grip: [
    { kind: 'circle', cx: 9, cy: 5, r: 1 },
    { kind: 'circle', cx: 9, cy: 12, r: 1 },
    { kind: 'circle', cx: 9, cy: 19, r: 1 },
    { kind: 'circle', cx: 15, cy: 5, r: 1 },
    { kind: 'circle', cx: 15, cy: 12, r: 1 },
    { kind: 'circle', cx: 15, cy: 19, r: 1 },
  ],

  // Text properties
  bold: [path('M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8')],
  italic: [path('M19 4h-9'), path('M14 20H5'), path('m15 4-4 16')],
  alignLeft: [path('M15 12H3'), path('M17 18H3'), path('M21 6H3')],
  alignCenter: [path('M17 12H7'), path('M19 18H5'), path('M21 6H3')],
  alignRight: [path('M21 12H9'), path('M21 18H7'), path('M21 6H3')],

  // Misc
  rotate: [path('M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'), path('M21 3v5h-5')],
  cursor: [path('m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z')],
  chevronDown: [path('m6 9 6 6 6-6')],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof ICON_PATHS;
