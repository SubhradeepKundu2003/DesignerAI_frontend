import { Injectable } from '@angular/core';

import {
  CanvasElement,
  FrameElement,
  GroupElement,
  TextElement,
  isFrameElement,
  isTextElement,
} from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { contrastRatio, isLargeText } from '../utils/color-contrast.util';
import { boxesIntersect, computeBoundingBox } from '../utils/geometry.util';
import { measureTextHeight } from '../utils/text-measure.util';

export type LintRule =
  'out-of-bounds' | 'low-contrast' | 'overlapping-elements' | 'empty-frame' | 'text-overflow';

export interface LintIssue {
  readonly rule: LintRule;
  readonly message: string;
  /** Ids of the elements this issue is about — two for `overlapping-text`, one otherwise. */
  readonly elementIds: readonly string[];
}

const MIN_CONTRAST_NORMAL = 4.5;
const MIN_CONTRAST_LARGE = 3;
/** Rounding slop so a wrap that lands exactly on the box height isn't flagged. */
const TEXT_OVERFLOW_TOLERANCE_PX = 1;

/**
 * Pure, no-AI checks over a page: out-of-bounds elements, low text/background
 * contrast, overlapping text boxes, empty frames and wrapped-text overflow —
 * everything `measureTextHeight` (from M5) and the existing bounding-box
 * helpers can already answer without a render pass.
 *
 * One implementation, two callers: the document-generation `NewsletterAssembler`
 * runs this on each assembled page before it's committed (repair/warn against
 * the lint errors), and the toolbar's manual "Check design" button runs it
 * for human-made pages.
 */
@Injectable({ providedIn: 'root' })
export class DesignLintService {
  lint(page: Page): LintIssue[] {
    const elementsById = new Map(page.elements.map((element) => [element.id, element]));
    const visibleElements = page.elements.filter((element) => element.visible);
    // Ambient background art (see `BaseElement.decorative`) is exempt from
    // bounds/overlap checks: it's deliberately placed at page edges/corners
    // and deliberately sits under real content, neither of which is a mistake.
    const lintableElements = visibleElements.filter((element) => !element.decorative);
    const issues: LintIssue[] = [];

    for (const element of lintableElements) {
      issues.push(...this.checkBounds(element, page));

      if (isTextElement(element)) {
        issues.push(...this.checkContrast(element, page, elementsById));
        issues.push(...this.checkTextOverflow(element));
      }

      if (isFrameElement(element)) {
        issues.push(...this.checkEmptyFrame(element));
      }
    }

    issues.push(...this.checkOverlappingElements(lintableElements, page.groups ?? []));

    return issues;
  }

  private checkBounds(element: CanvasElement, page: Page): LintIssue[] {
    const box = computeBoundingBox([element]);
    const withinBounds =
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= page.width &&
      box.y + box.height <= page.height;
    return withinBounds
      ? []
      : [
          {
            rule: 'out-of-bounds',
            message: `"${element.name}" extends outside the page.`,
            elementIds: [element.id],
          },
        ];
  }

  private checkContrast(
    element: TextElement,
    page: Page,
    elementsById: ReadonlyMap<string, CanvasElement>,
  ): LintIssue[] {
    const background = this.backgroundBehind(element, page, elementsById);
    const ratio = contrastRatio(element.fill, background);
    if (ratio === null) {
      return [];
    }

    const threshold = isLargeText(element.fontSize, element.fontStyle)
      ? MIN_CONTRAST_LARGE
      : MIN_CONTRAST_NORMAL;
    return ratio >= threshold
      ? []
      : [
          {
            rule: 'low-contrast',
            message: `"${element.name}" text is hard to read against its background (${ratio.toFixed(1)}:1, needs ${threshold}:1).`,
            elementIds: [element.id],
          },
        ];
  }

  /** The immediate visual background behind `element`: its parent frame's fill, or the page's. */
  private backgroundBehind(
    element: CanvasElement,
    page: Page,
    elementsById: ReadonlyMap<string, CanvasElement>,
  ): string {
    const parent = element.parentId ? elementsById.get(element.parentId) : undefined;
    if (parent && isFrameElement(parent) && parent.background) {
      return parent.background;
    }
    return page.background;
  }

  private checkTextOverflow(element: TextElement): LintIssue[] {
    const measured = measureTextHeight(element);
    return measured <= element.height + TEXT_OVERFLOW_TOLERANCE_PX
      ? []
      : [
          {
            rule: 'text-overflow',
            message: `"${element.name}" text is taller than its box and will be clipped.`,
            elementIds: [element.id],
          },
        ];
  }

  private checkEmptyFrame(element: FrameElement): LintIssue[] {
    return element.childIds.length > 0
      ? []
      : [
          {
            rule: 'empty-frame',
            message: `"${element.name}" is an empty frame.`,
            elementIds: [element.id],
          },
        ];
  }

  /**
   * Checks for overlap at the *placed-block* level, not the raw element
   * level: elements sharing a `parentId` (a `GroupElement`'s members — e.g.
   * every part of one hand-placed or document-generated infographic
   * template, see `buildTemplatePlacement`) are merged into a single
   * bounding box first. Without this, a template's own intentionally-tight
   * internal geometry (say, an accent bar flush against its panel edge)
   * would falsely trip on itself; two different blocks landing on top of
   * each other — two infographics, or an infographic and a text block —
   * still always will. Ungrouped elements are their own one-member block,
   * so this subsumes the old text-vs-text-only check.
   */
  private checkOverlappingElements(
    elements: readonly CanvasElement[],
    groups: readonly GroupElement[],
  ): LintIssue[] {
    const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
    const blocksByKey = new Map<string, CanvasElement[]>();
    for (const element of elements) {
      const key = element.parentId ?? element.id;
      const block = blocksByKey.get(key);
      if (block) {
        block.push(element);
      } else {
        blocksByKey.set(key, [element]);
      }
    }

    const blocks = [...blocksByKey.entries()].map(([key, members]) => ({
      name: groupNameById.get(key) ?? members[0].name,
      box: computeBoundingBox(members),
      representativeId: members[0].id,
    }));

    const issues: LintIssue[] = [];
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (boxesIntersect(a.box, b.box)) {
          issues.push({
            rule: 'overlapping-elements',
            message: `"${a.name}" overlaps "${b.name}".`,
            elementIds: [a.representativeId, b.representativeId],
          });
        }
      }
    }
    return issues;
  }
}
