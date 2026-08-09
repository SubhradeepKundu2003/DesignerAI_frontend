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

/** Shape common to every manifest version that has ever shipped — enough to read `formatVersion` off it before migrating up. */
interface RawManifest {
  readonly formatVersion: number;
  readonly title: string;
}

function isRawManifest(value: unknown): value is RawManifest {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as RawManifest).formatVersion === 'number' &&
    typeof (value as RawManifest).title === 'string'
  );
}

/**
 * One entry per past format bump, keyed by the version it upgrades *from*. Empty today — format v1 is
 * the only version that has ever shipped — but this is the seam a future `manifest.json` field addition
 * hooks into (e.g. `MANIFEST_MIGRATIONS[1] = (m) => ({ ...m, formatVersion: 2, fonts: [] })`) so an
 * already-exported v1 `.dzn` keeps opening instead of failing "newer, incompatible version".
 */
const MANIFEST_MIGRATIONS: Record<number, (manifest: RawManifest) => RawManifest> = {};

/**
 * Validates and migrates a raw parsed `manifest.json` up to {@link PROJECT_FILE_FORMAT_VERSION}.
 * Returns `null` for a malformed manifest or one from a future, not-yet-understood format version;
 * throws only if an older version is missing a registered migration step (a broken migration chain,
 * not a bad file — a bug worth surfacing loudly rather than swallowing as "invalid file").
 */
export function parseProjectManifest(value: unknown): ProjectManifest | null {
  if (!isRawManifest(value) || value.formatVersion > PROJECT_FILE_FORMAT_VERSION) {
    return null;
  }

  let manifest = value;
  while (manifest.formatVersion < PROJECT_FILE_FORMAT_VERSION) {
    const migrate = MANIFEST_MIGRATIONS[manifest.formatVersion];
    if (!migrate) {
      throw new Error(`No migration registered from .dzn format v${manifest.formatVersion}.`);
    }
    manifest = migrate(manifest);
  }
  return manifest as ProjectManifest;
}

/** The asset filename referenced by an externalized `src`, e.g. `img-<hash>.png`. */
export function assetRefFilename(src: string): string | null {
  return src.startsWith(PROJECT_ASSET_URI_PREFIX) ? src.slice(PROJECT_ASSET_URI_PREFIX.length) : null;
}
