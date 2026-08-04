/**
 * A small line-icon set shared by the infographic templates.
 *
 * Every icon is a 24x24 stroke path, so recoloring is just swapping `stroke`
 * and any size renders crisp — these become the decorative `ImageElement`s a
 * template drops on top of its native shapes/text (see
 * `infographic-template.model.ts`).
 */
const ICON_PATHS: Record<string, string> = {
  lightbulb: `
    <path d="M12 3.5a5.5 5.5 0 0 0-3.2 9.98c.46.33.7.85.7 1.4V16h5v-1.12c0-.55.24-1.07.7-1.4A5.5 5.5 0 0 0 12 3.5Z"/>
    <path d="M9.6 18.5h4.8"/>
    <path d="M10.2 20.5h3.6"/>`,
  target: `
    <circle cx="12" cy="12" r="7.5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="12" cy="12" r="0.9" fill="{color}" stroke="none"/>`,
  trendUp: `
    <path d="M4 16.5 9.5 11l3.5 3.5L20 7"/>
    <path d="M14.5 7H20v5.5"/>`,
  flag: `
    <path d="M6 3.5v17"/>
    <path d="M6 4.5h12.5l-3 4 3 4H6"/>`,
  chat: `
    <rect x="4" y="5" width="16" height="11" rx="3"/>
    <path d="M8.5 19.5 11.5 16"/>`,
  check: `
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M8 12.3 10.7 15 16 9.3"/>`,
  users: `
    <circle cx="9" cy="8.3" r="3"/>
    <path d="M3.8 19c.3-3 2.6-5 5.2-5s4.9 2 5.2 5"/>
    <circle cx="17.3" cy="9.3" r="2.2"/>
    <path d="M15.9 19c.1-2.1 1.5-3.7 3.3-4.1"/>`,
  star: `
    <path d="M12 3.5l2.4 5 5.4.6-4 3.8.9 5.5-4.7-2.6-4.7 2.6.9-5.5-4-3.8 5.4-.6Z"/>`,
  calendar: `
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/>
    <path d="M4 9.5h16"/>
    <path d="M8 3.5v3.5M16 3.5v3.5"/>`,
  compass: `
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M15.2 8.8 13.4 13.4 8.8 15.2l1.8-4.6Z"/>`,
};

export type IconName = keyof typeof ICON_PATHS;

/** A self-contained SVG data URL, ready for an `ImageElement.src`. */
export function iconDataUrl(name: IconName, color: string, size = 32): string {
  const body = ICON_PATHS[name].replace(/\{color\}/g, color);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
