/**
 * The `.dzn` project file — a zip container (built client-side with JSZip, see
 * `ProjectFileService`) that round-trips a whole project rather than the one
 * localStorage slot `PersistenceService` autosaves to. `manifest.json`'s
 * `formatVersion` is independent of `CanvasDocument.version`: the container can
 * grow fields later (multiple themes, a fonts folder) without touching the
 * document schema.
 *
 * G1 scope was `manifest.json` + `document.json` only — `document.json` already
 * carries `CanvasDocument.theme` inline, so no separate `theme.json` is needed.
 * G2 adds two more top-level zip entries, both optional so a G1 file still
 * imports cleanly:
 * ```
 * project.dzn (zip)
 * ├── manifest.json
 * ├── document.json     any ImageElement.src over the threshold is replaced
 * │                       with an `asset:` ref, see below
 * ├── thumbnail.png      first-page snapshot, best-effort — its absence never
 * │                       fails an import
 * └── assets/
 *       └── img-<hash>.<ext>
 * ```
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

/** Zip entry the first page's snapshot is written to, if the render succeeds. */
export const PROJECT_THUMBNAIL_ENTRY = 'thumbnail.png';

/** Folder externalized image assets are written to. */
export const PROJECT_ASSETS_DIR = 'assets';

/**
 * `ImageElement.src` values above this size get written to `assets/` instead
 * of staying inline as a data URL — keeps `document.json` (and every undo
 * snapshot of it) small without paying a size-threshold decision for every
 * tiny icon-sized picture.
 */
export const PROJECT_ASSET_SIZE_THRESHOLD_BYTES = 50 * 1024;

/** Prefix an externalized `ImageElement.src` is replaced with, e.g. `asset:img-<hash>.png`. */
export const PROJECT_ASSET_URI_PREFIX = 'asset:';

export function isProjectManifest(value: unknown): value is ProjectManifest {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as ProjectManifest).formatVersion === PROJECT_FILE_FORMAT_VERSION &&
    typeof (value as ProjectManifest).title === 'string'
  );
}

/** The asset filename referenced by an externalized `src`, e.g. `img-<hash>.png`. */
export function assetRefFilename(src: string): string | null {
  return src.startsWith(PROJECT_ASSET_URI_PREFIX) ? src.slice(PROJECT_ASSET_URI_PREFIX.length) : null;
}
