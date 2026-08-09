import { DesignTheme } from '../models/design-theme.model';

/**
 * Shipped theme presets. `INDIGO_CLASSIC` mirrors `templates/palette.ts` and
 * `services/element-factory.service.ts`'s hand-picked defaults exactly, so
 * applying it to a document that predates theming is a no-op in appearance.
 */
export const INDIGO_CLASSIC: DesignTheme = {
  id: 'theme-indigo-classic',
  name: 'Indigo Classic',
  colors: {
    ink: '#1c1f24',
    muted: '#5b6472',
    surface: '#ffffff',
    border: '#e2e4e9',
    accents: [
      { name: 'Indigo', solid: '#4f46e5', tint: '#eef2ff' },
      { name: 'Teal', solid: '#0d9488', tint: '#f0fdfa' },
      { name: 'Amber', solid: '#d97706', tint: '#fffbeb' },
      { name: 'Rose', solid: '#e11d48', tint: '#fff1f3' },
    ],
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: 8,
  spacing: 20,
};

export const SLATE_EDITORIAL: DesignTheme = {
  id: 'theme-slate-editorial',
  name: 'Slate Editorial',
  colors: {
    ink: '#1f2933',
    muted: '#616e7c',
    surface: '#ffffff',
    border: '#d9dee3',
    accents: [
      { name: 'Navy', solid: '#334e68', tint: '#f0f4f8' },
      { name: 'Rust', solid: '#b45309', tint: '#fef3e2' },
      { name: 'Forest', solid: '#15633f', tint: '#eafaf1' },
      { name: 'Plum', solid: '#7c3aed', tint: '#f4eefe' },
    ],
  },
  fonts: { heading: 'Georgia', body: 'Inter' },
  radius: 2,
  spacing: 24,
};

export const SUNSET_BOLD: DesignTheme = {
  id: 'theme-sunset-bold',
  name: 'Sunset Bold',
  colors: {
    ink: '#2a1a12',
    muted: '#83695c',
    surface: '#fffaf5',
    border: '#f1ded0',
    accents: [
      { name: 'Coral', solid: '#e8571f', tint: '#fef0e9' },
      { name: 'Amber', solid: '#d97706', tint: '#fff7e6' },
      { name: 'Magenta', solid: '#c2255c', tint: '#fdedf3' },
      { name: 'Gold', solid: '#a16207', tint: '#fdf6e3' },
    ],
  },
  fonts: { heading: 'Trebuchet MS', body: 'Verdana' },
  radius: 16,
  spacing: 20,
};

export const FOREST_MONO: DesignTheme = {
  id: 'theme-forest-mono',
  name: 'Forest Mono',
  colors: {
    ink: '#12261e',
    muted: '#4d6459',
    surface: '#f6faf7',
    border: '#d3e3d8',
    accents: [
      { name: 'Pine', solid: '#0f6b4c', tint: '#e7f6ee' },
      { name: 'Moss', solid: '#4d7c0f', tint: '#f1f8e6' },
      { name: 'Clay', solid: '#92603a', tint: '#f7efe7' },
      { name: 'Slate', solid: '#3f5765', tint: '#eaf1f4' },
    ],
  },
  fonts: { heading: 'Courier New', body: 'Arial' },
  radius: 4,
  spacing: 16,
};

/**
 * TCS-inspired corporate theme — deep navy on white with a restrained accent
 * cycle, matching the dark-navy-and-blue register of TCS's own brand pages
 * rather than any single verified hex from an internal brand book. Meant for
 * corporate newsletter pages: sober ink/navy for headings, a cyan accent for
 * highlights, plus two muted secondary accents so 4-up stat/card templates
 * still have colour variety without drifting off-brand.
 */
export const TCS_CORPORATE: DesignTheme = {
  id: 'theme-tcs-corporate',
  name: 'TCS Corporate',
  colors: {
    ink: '#051c2c',
    muted: '#5b6b78',
    surface: '#ffffff',
    border: '#dce3e8',
    accents: [
      { name: 'TCS Navy', solid: '#04233b', tint: '#e7ecf1' },
      { name: 'TCS Blue', solid: '#0070ad', tint: '#e5f2fa' },
      { name: 'Cyan', solid: '#00a3e0', tint: '#e3f6fd' },
      { name: 'Slate', solid: '#4d6070', tint: '#eef1f4' },
    ],
  },
  fonts: { heading: 'Georgia', body: 'Inter' },
  radius: 6,
  spacing: 20,
};

export const DESIGN_THEME_PRESETS: readonly DesignTheme[] = [
  INDIGO_CLASSIC,
  SLATE_EDITORIAL,
  SUNSET_BOLD,
  FOREST_MONO,
  TCS_CORPORATE,
];

export const DEFAULT_THEME: DesignTheme = INDIGO_CLASSIC;
