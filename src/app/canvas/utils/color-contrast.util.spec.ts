import { contrastRatio, isLargeText } from './color-contrast.util';

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colours', () => {
    expect(contrastRatio('#4f46e5', '#4f46e5')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#111111', '#eeeeee')).toBeCloseTo(
      contrastRatio('#eeeeee', '#111111')!,
      5,
    );
  });

  it('expands 3-digit hex the same way as its 6-digit equivalent', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#ffffff', '#000000')!, 5);
  });

  it('returns null when either colour is not hex', () => {
    expect(contrastRatio('rebeccapurple', '#ffffff')).toBeNull();
    expect(contrastRatio('#ffffff', 'rgb(0, 0, 0)')).toBeNull();
  });
});

describe('isLargeText', () => {
  it('treats 24px+ regular text as large', () => {
    expect(isLargeText(24, 'normal')).toBe(true);
    expect(isLargeText(23.9, 'normal')).toBe(false);
  });

  it('treats 18.66px+ bold text as large', () => {
    expect(isLargeText(18.66, 'bold')).toBe(true);
    expect(isLargeText(18, 'bold')).toBe(false);
  });

  it('does not lower the bar for italic-only text', () => {
    expect(isLargeText(20, 'italic')).toBe(false);
  });
});
