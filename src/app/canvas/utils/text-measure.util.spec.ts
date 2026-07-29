import { measureTextHeight } from './text-measure.util';

const BASE = {
  fontFamily: 'Inter',
  fontSize: 20,
  fontStyle: 'normal' as const,
  letterSpacing: 0,
  lineHeight: 1.5,
};

describe('measureTextHeight', () => {
  it('should grow with more lines', () => {
    // jsdom's canvas stub measures every character as 0px wide, so
    // width-driven wrapping never kicks in here — explicit newlines are what
    // this test can actually rely on to add lines.
    const oneLine = measureTextHeight({ ...BASE, text: 'Hi', width: 400 });
    const manyLines = measureTextHeight({
      ...BASE,
      text: 'Line\n'.repeat(20),
      width: 400,
    });

    expect(manyLines).toBeGreaterThan(oneLine);
  });

  it('should never return less than 1', () => {
    expect(measureTextHeight({ ...BASE, text: '', width: 100 })).toBeGreaterThanOrEqual(1);
  });
});
