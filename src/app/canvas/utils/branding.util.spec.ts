import { BrandAssets } from '../state/brand-assets.store';
import { PAGE_MARGIN } from '../models/editor-config';
import { buildBackgroundPatternElement, buildLogoElements, pickMonochromeForeground } from './branding.util';

const PAGE = { width: 794, height: 1123 };

const ASSETS: BrandAssets = {
  tcsBlack: { src: 'tcs-black.svg', aspectRatio: 200 / 64 },
  tcsWhite: { src: 'tcs-white.svg', aspectRatio: 200 / 64 },
  tataBlack: { src: 'tata-black.svg', aspectRatio: 220 / 64 },
  tataWhite: { src: 'tata-white.svg', aspectRatio: 220 / 64 },
};

describe('pickMonochromeForeground', () => {
  it('picks black for a white background', () => {
    expect(pickMonochromeForeground('#ffffff')).toBe('#000000');
  });

  it('picks white for a black background', () => {
    expect(pickMonochromeForeground('#000000')).toBe('#ffffff');
  });

  it('falls back to black for an unparseable colour', () => {
    expect(pickMonochromeForeground('rebeccapurple')).toBe('#000000');
  });
});

describe('buildLogoElements', () => {
  it('places the white variants on a black page, black on a white page', () => {
    const onBlack = buildLogoElements(PAGE, '#000000', ASSETS);
    expect(onBlack.map((logo) => logo.src)).toEqual(['tcs-white.svg', 'tata-white.svg']);

    const onWhite = buildLogoElements(PAGE, '#ffffff', ASSETS);
    expect(onWhite.map((logo) => logo.src)).toEqual(['tcs-black.svg', 'tata-black.svg']);
  });

  it('anchors TCS to the left margin and TATA to the right margin', () => {
    const [tcs, tata] = buildLogoElements(PAGE, '#ffffff', ASSETS);
    expect(tcs.x).toBe(PAGE_MARGIN);
    expect(tata.x + tata.width).toBe(PAGE.width - PAGE_MARGIN);
  });

  it('tags every logo as a locked, decorative brand element', () => {
    for (const logo of buildLogoElements(PAGE, '#ffffff', ASSETS)) {
      expect(logo.locked).toBe(true);
      expect(logo.decorative).toBe(true);
      expect(logo.brandRole).toBe('logo');
    }
  });
});

describe('buildBackgroundPatternElement', () => {
  it('spans the full page as one tagged, decorative, locked image', () => {
    const pattern = buildBackgroundPatternElement(PAGE, '#ffffff');
    expect(pattern.x).toBe(0);
    expect(pattern.y).toBe(0);
    expect(pattern.width).toBe(PAGE.width);
    expect(pattern.height).toBe(PAGE.height);
    expect(pattern.type).toBe('image');
    expect(pattern.locked).toBe(true);
    expect(pattern.decorative).toBe(true);
    expect(pattern.brandRole).toBe('background-pattern');
  });

  it('embeds the black dot colour and a low fill-opacity for a white background', () => {
    const pattern = buildBackgroundPatternElement(PAGE, '#ffffff');
    const svg = decodeURIComponent(pattern.src.replace('data:image/svg+xml;utf8,', ''));
    expect(svg).toContain('fill="#000000"');
    expect(svg).toMatch(/fill-opacity="0\.0\d+"/);
  });

  it('embeds the white dot colour for a black background', () => {
    const pattern = buildBackgroundPatternElement(PAGE, '#000000');
    const svg = decodeURIComponent(pattern.src.replace('data:image/svg+xml;utf8,', ''));
    expect(svg).toContain('fill="#ffffff"');
  });
});
