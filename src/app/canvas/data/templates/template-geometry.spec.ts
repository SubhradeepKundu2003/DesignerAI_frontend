import { PAGE_MARGIN, PAGE_SIZE } from '../../models/editor-config';
import { INFOGRAPHIC_TEMPLATES } from './index';

/**
 * Guards the fix for the "infographics don't fit the page" bug (see
 * `plan.md` Part 3, B1): `NewsletterAssembler.buildInfographicBlock` centres
 * a template within the page's content width but never shrinks one that's
 * wider than that budget (`Math.max(diff / 2, 0)` just clamps to the left
 * margin), so any template authored over budget renders off the right edge
 * of the page. `circular-step-timeline.template.ts` did exactly this at
 * `WIDTH = 780` against a 698px content width. Every template's declared
 * footprint must fit within `PAGE_SIZE.width - PAGE_MARGIN * 2` so that
 * assumption holds for every future template too, not just the ones this
 * pass happened to fix.
 */
describe('infographic template footprints', () => {
  const CONTENT_WIDTH = PAGE_SIZE.width - PAGE_MARGIN * 2;

  it.each(INFOGRAPHIC_TEMPLATES.map((template) => [template.id, template.size.width] as const))(
    '%s (%dpx wide) fits within the page content width',
    (_id, width) => {
      expect(width).toBeLessThanOrEqual(CONTENT_WIDTH);
    },
  );
});
