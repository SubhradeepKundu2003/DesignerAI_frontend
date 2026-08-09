import { Injectable } from '@angular/core';

import {
  CanvasElement,
  FrameElement,
  TextElement,
  isFrameElement,
  isTextElement,
} from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { contrastRatio, isLargeText } from '../utils/color-contrast.util';
import { boxesIntersect, computeBoundingBox } from '../utils/geometry.util';
import { measureTextHeight } from '../utils/text-measure.util';

export type LintRule =
  'out-of-bounds' | 'low-contrast' | 'overlapping-text' | 'empty-frame' | 'text-overflow';

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
 * One implementation, two callers: Track E4 runs this on agent output before
 * it's committed (reject/retry against the lint errors), and the toolbar's
 * manual "Check design" button runs it for human-made pages.
 */
@Injectable({ providedIn: 'root' })
export class DesignLintService {
  lint(page: Page): LintIssue[] {
    const elementsById = new Map(page.elements.map((element) => [element.id, element]));
    const visibleElements = page.elements.filter((element) => element.visible);
    const issues: LintIssue[] = [];

    for (const element of visibleElements) {
      issues.push(...this.checkBounds(element, page));

      if (isTextElement(element)) {
        issues.push(...this.checkContrast(element, page, elementsById));
        issues.push(...this.checkTextOverflow(element));
      }

      if (isFrameElement(element)) {
        issues.push(...this.checkEmptyFrame(element));
      }
    }

    issues.push(...this.checkOverlappingText(visibleElements.filter(isTextElement)));

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

  private checkOverlappingText(textElements: readonly TextElement[]): LintIssue[] {
    const issues: LintIssue[] = [];
    for (let i = 0; i < textElements.length; i++) {
      for (let j = i + 1; j < textElements.length; j++) {
        const a = textElements[i];
        const b = textElements[j];
        if (boxesIntersect(a, b)) {
          issues.push({
            rule: 'overlapping-text',
            message: `"${a.name}" overlaps "${b.name}".`,
            elementIds: [a.id, b.id],
          });
        }
      }
    }
    return issues;
  }
}
