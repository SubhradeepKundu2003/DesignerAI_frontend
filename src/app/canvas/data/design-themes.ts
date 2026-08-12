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

export const OCEAN_BREEZE: DesignTheme = {
  id: 'theme-ocean-breeze',
  name: 'Ocean Breeze',
  colors: {
    ink: '#0b2a35',
    muted: '#4f7684',
    surface: '#f5fcfd',
    border: '#cfe9ee',
    accents: [
      { name: 'Teal', solid: '#0891b2', tint: '#e5f8fb' },
      { name: 'Cyan', solid: '#0ea5b7', tint: '#e3f9fb' },
      { name: 'Seafoam', solid: '#14b8a6', tint: '#e3faf5' },
      { name: 'Sand', solid: '#ca8a04', tint: '#fdf6e0' },
    ],
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: 12,
  spacing: 20,
};

export const BERRY_PUNCH: DesignTheme = {
  id: 'theme-berry-punch',
  name: 'Berry Punch',
  colors: {
    ink: '#2c0f2e',
    muted: '#7a5b7d',
    surface: '#fffafd',
    border: '#f0dcee',
    accents: [
      { name: 'Magenta', solid: '#c026d3', tint: '#fbe8fb' },
      { name: 'Violet', solid: '#7c3aed', tint: '#f0eafe' },
      { name: 'Fuchsia', solid: '#db2777', tint: '#fce4ef' },
      { name: 'Grape', solid: '#9333ea', tint: '#f4e8fd' },
    ],
  },
  fonts: { heading: 'Trebuchet MS', body: 'Inter' },
  radius: 20,
  spacing: 20,
};

export const MIDNIGHT_NEON: DesignTheme = {
  id: 'theme-midnight-neon',
  name: 'Midnight Neon',
  colors: {
    ink: '#eef2ff',
    muted: '#a5adc7',
    surface: '#12132b',
    border: '#2c2e52',
    accents: [
      { name: 'Neon Lime', solid: '#a3e635', tint: '#26330f' },
      { name: 'Electric Blue', solid: '#38bdf8', tint: '#0f2836' },
      { name: 'Hot Pink', solid: '#f472b6', tint: '#331926' },
      { name: 'Violet', solid: '#a78bfa', tint: '#241f3d' },
    ],
  },
  fonts: { heading: 'Trebuchet MS', body: 'Arial' },
  radius: 6,
  spacing: 20,
};

export const BLOSSOM_PASTEL: DesignTheme = {
  id: 'theme-blossom-pastel',
  name: 'Blossom Pastel',
  colors: {
    ink: '#3d2c34',
    muted: '#8a7480',
    surface: '#fffdfb',
    border: '#f4e3e8',
    accents: [
      { name: 'Blush', solid: '#f472b6', tint: '#fdeef5' },
      { name: 'Peach', solid: '#fb923c', tint: '#fef1e6' },
      { name: 'Lilac', solid: '#c084fc', tint: '#f7edfe' },
      { name: 'Mint', solid: '#4ade80', tint: '#e9fbf0' },
    ],
  },
  fonts: { heading: 'Georgia', body: 'Verdana' },
  radius: 24,
  spacing: 24,
};

export const GRAPHITE_MONO: DesignTheme = {
  id: 'theme-graphite-mono',
  name: 'Graphite Mono',
  colors: {
    ink: '#1a1a1a',
    muted: '#6b6b6b',
    surface: '#fafafa',
    border: '#dcdcdc',
    accents: [
      { name: 'Charcoal', solid: '#404040', tint: '#ececec' },
      { name: 'Steel', solid: '#57606a', tint: '#eceef0' },
      { name: 'Ember', solid: '#b91c1c', tint: '#fbe9e9' },
      { name: 'Slate', solid: '#71717a', tint: '#efeff0' },
    ],
  },
  fonts: { heading: 'Helvetica', body: 'Arial' },
  radius: 0,
  spacing: 20,
};

export const DESIGN_THEME_PRESETS: readonly DesignTheme[] = [
  INDIGO_CLASSIC,
  SLATE_EDITORIAL,
  SUNSET_BOLD,
  FOREST_MONO,
  TCS_CORPORATE,
  OCEAN_BREEZE,
  BERRY_PUNCH,
  MIDNIGHT_NEON,
  BLOSSOM_PASTEL,
  GRAPHITE_MONO,
];

export const DEFAULT_THEME: DesignTheme = INDIGO_CLASSIC;

/**
 * A random preset other than `current` (by id), for auto-varying the theme
 * on each generation — see `GenerateMenu`/`GenerateDocumentMenu`. Falls back
 * to `current` itself when it's the only preset available, so this is always
 * safe to call unconditionally.
 */
export function pickNextTheme(current: DesignTheme): DesignTheme {
  const candidates = DESIGN_THEME_PRESETS.filter((preset) => preset.id !== current.id);
  if (candidates.length === 0) {
    return current;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
