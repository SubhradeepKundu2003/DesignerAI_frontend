/**
 * The `.dzn` project file — a zip container (built client-side with JSZip, see
 * `ProjectFileService`) that round-trips a whole project rather than the one
 * localStorage slot `PersistenceService` autosaves to. `manifest.json`'s
 * `formatVersion` is independent of `CanvasDocument.version`: the container can
 * grow fields later (multiple themes, a fonts folder, externalized assets)
 * without touching the document schema.
 *
 * G1 scope: `manifest.json` + `document.json` only — `document.json` already
 * carries `CanvasDocument.theme` inline, so no separate `theme.json` is needed.
 * Thumbnail and asset externalization are later G milestones.
 */
export interface ProjectManifest {
  readonly formatVersion: 1;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly title: string;
}

export const PROJECT_FILE_FORMAT_VERSION = 1 as const;
export const PROJECT_FILE_EXTENSION = 'dzn';

export function isProjectManifest(value: unknown): value is ProjectManifest {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as ProjectManifest).formatVersion === PROJECT_FILE_FORMAT_VERSION &&
    typeof (value as ProjectManifest).title === 'string'
  );
}
