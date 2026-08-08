import { extensionForMimeType, hashBase64, parseDataUrl } from './data-url.util';

describe('parseDataUrl', () => {
  it('should split mime type and base64 payload', () => {
    const parsed = parseDataUrl('data:image/png;base64,aGVsbG8=');
    expect(parsed).toEqual({ mimeType: 'image/png', base64: 'aGVsbG8=', byteLength: 5 });
  });

  it('should return null for a non-data URL', () => {
    expect(parseDataUrl('https://example.com/pic.png')).toBeNull();
  });

  it('should return null for a data URL that is not base64-encoded', () => {
    expect(parseDataUrl('data:text/plain,hello')).toBeNull();
  });
});

describe('extensionForMimeType', () => {
  it('should map known image mime types', () => {
    expect(extensionForMimeType('image/jpeg')).toBe('jpg');
    expect(extensionForMimeType('image/svg+xml')).toBe('svg');
  });

  it('should default unrecognised mime types to png', () => {
    expect(extensionForMimeType('application/octet-stream')).toBe('png');
  });
});

describe('hashBase64', () => {
  it('should be stable for identical input', () => {
    expect(hashBase64('aGVsbG8=')).toBe(hashBase64('aGVsbG8='));
  });

  it('should differ for different input', () => {
    expect(hashBase64('aGVsbG8=')).not.toBe(hashBase64('d29ybGQ='));
  });
});
