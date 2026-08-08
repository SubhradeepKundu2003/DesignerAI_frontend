/**
 * Parsing and hashing for `data:` URLs, used by `ProjectFileService` to
 * externalize large `ImageElement.src` values into the `.dzn` zip's
 * `assets/` folder instead of leaving them inline in `document.json`.
 */

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,(.*)$/s;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const DEFAULT_EXTENSION = 'png';

export interface ParsedDataUrl {
  readonly mimeType: string;
  readonly base64: string;
  /** Decoded byte length — what the size threshold is measured against. */
  readonly byteLength: number;
}

/** Splits a `data:` URL into its mime type and base64 payload, or `null` if it isn't one (or isn't base64-encoded). */
export function parseDataUrl(src: string): ParsedDataUrl | null {
  const match = DATA_URL_PATTERN.exec(src);
  if (!match || !match[2]) {
    return null;
  }

  const [, mimeType = 'application/octet-stream', , base64] = match;
  // Base64 encodes 3 bytes as 4 characters; padding (`=`) trims the last group.
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const byteLength = Math.max(Math.floor((base64.length * 3) / 4) - padding, 0);

  return { mimeType, base64, byteLength };
}

/** The filename extension to give an asset written from `mimeType`, defaulting to `png` for anything unrecognised. */
export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? DEFAULT_EXTENSION;
}

/**
 * A short, stable content hash used only to dedupe identical images across a
 * document — not a security hash. FNV-1a over the base64 payload, so two
 * elements pointing at pixel-identical data always externalize to one asset.
 */
export function hashBase64(base64: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < base64.length; i++) {
    hash ^= base64.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
