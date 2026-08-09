/**
 * WCAG contrast-ratio math for the design linter (`design-lint.service.ts`).
 *
 * Every colour in the document is a literal CSS colour string (see
 * `TextElement.fill`), but in practice they are all produced by
 * `ColorInput`, which only ever emits `#rgb`/`#rrggbb` hex — so parsing is
 * scoped to hex forms rather than the full CSS colour grammar. A colour this
 * doesn't recognise (a named colour typed into an older/hand-authored
 * document, say) makes contrast unknowable, not non-compliant, so callers get
 * `null` back rather than a false positive.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHexColor(value: string): Rgb | null {
  const hex = value.trim();

  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    const [r, g, b] = short[1].split('').map((digit) => parseInt(digit + digit, 16));
    return { r, g, b };
  }

  const long = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (long) {
    const [, rgb] = long;
    return {
      r: parseInt(rgb.slice(0, 2), 16),
      g: parseInt(rgb.slice(2, 4), 16),
      b: parseInt(rgb.slice(4, 6), 16),
    };
  }

  return null;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The WCAG contrast ratio (1–21) between two colours, order-independent, or
 * `null` if either string isn't hex.
 */
export function contrastRatio(a: string, b: string): number | null {
  const colorA = parseHexColor(a);
  const colorB = parseHexColor(b);
  if (!colorA || !colorB) {
    return null;
  }

  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG's "large text" carve-out gets a lower contrast bar (3:1 instead of
 * 4.5:1): 24px+ regular weight, or 18.66px+ (14pt) bold.
 */
export function isLargeText(fontSize: number, fontStyle: string): boolean {
  return fontSize >= 24 || (fontStyle.includes('bold') && fontSize >= 18.66);
}
