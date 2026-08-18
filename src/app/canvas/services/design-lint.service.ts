import { Injectable } from '@angular/core';

import { TCS_CORPORATE } from '../data/design-themes';
import {
  CanvasElement,
  FrameElement,
  GroupElement,
  TextElement,
  isFrameElement,
  isIconElement,
  isShapeElement,
  isTextElement,
} from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { DesignTheme, ThemeColorRef } from '../models/design-theme.model';
import { contrastRatio, isLargeText } from '../utils/color-contrast.util';
import { boxesIntersect, computeBoundingBox } from '../utils/geometry.util';
import { measureTextHeight } from '../utils/text-measure.util';

export type LintRule =
  | 'out-of-bounds'
  | 'low-contrast'
  | 'overlapping-elements'
  | 'sibling-text-overlap'
  | 'empty-frame'
  | 'text-overflow'
  | 'accent-overuse';

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
 * TCS guideline p. 25: "TCS blue and yellow should comprise no more than 25%
 * of any layout. Use TCS red, green, and orange sparingly, limiting their
 * presence to a maximum of 10%." `TCS_CORPORATE.colors.accents` orders TCS
 * Blue/TCS Blue Deep (secondary) before TCS Orange/TCS Red (tertiary) — see
 * that theme's own comment in `data/design-themes.ts` — so these indices
 * classify each accent slot without hardcoding hex values here.
 */
const SECONDARY_ACCENT_INDICES: readonly number[] = [0, 1];
const TERTIARY_ACCENT_INDICES: readonly number[] = [2, 3];
const SECONDARY_MAX_AREA_RATIO = 0.25;
const TERTIARY_MAX_AREA_RATIO = 0.1;

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
  /**
   * `theme` is optional and, when given, only ever adds the `accent-overuse`
   * check (see {@link checkAccentBalance}) — every other rule is theme-
   * agnostic. Callers that don't have a theme handy (or are checking a page
   * built under a non-TCS theme, where the 25%/10% caps don't apply) can
   * simply omit it.
   */
  lint(page: Page, theme?: DesignTheme): LintIssue[] {
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
    issues.push(...this.checkSiblingTextOverlap(lintableElements));
    issues.push(...this.checkAccentBalance(lintableElements, page, theme));

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

  /**
   * `checkOverlappingElements` deliberately merges same-`parentId` elements
   * into one block box before comparing, since a template's own internal
   * geometry routinely layers shapes on purpose (an accent bar flush against
   * its panel, a number drawn inside its own coloured badge) — so it can
   * never see a collision *within* one template's members. That's the right
   * call for shapes/icons, but two *text* elements sharing a `parentId` are
   * never meant to overlap each other in any template in this codebase — the
   * case this exists for is a `NewsletterAssembler` repair (`growToFit`)
   * growing one label's box down or across into a sibling label that was
   * never designed to move. Scoped to text-vs-text specifically (not
   * text-vs-shape/icon) to avoid flagging the many intentional text-on-shape
   * layouts (a stat drawn inside its own circle, a label centred on a card)
   * that would otherwise make this rule useless noise.
   */
  private checkSiblingTextOverlap(elements: readonly CanvasElement[]): LintIssue[] {
    const textByParent = new Map<string, TextElement[]>();
    for (const element of elements) {
      if (!isTextElement(element) || !element.parentId) {
        continue;
      }
      const siblings = textByParent.get(element.parentId);
      if (siblings) {
        siblings.push(element);
      } else {
        textByParent.set(element.parentId, [element]);
      }
    }

    const issues: LintIssue[] = [];
    for (const siblings of textByParent.values()) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          if (boxesIntersect(siblings[i], siblings[j])) {
            issues.push({
              rule: 'sibling-text-overlap',
              message: `"${siblings[i].name}" overlaps "${siblings[j].name}" within the same infographic.`,
              elementIds: [siblings[i].id, siblings[j].id],
            });
          }
        }
      }
    }
    return issues;
  }

  /**
   * TCS guideline p. 25's area caps (see `SECONDARY_MAX_AREA_RATIO`/
   * `TERTIARY_MAX_AREA_RATIO`, above) — a no-op unless `theme` is the TCS
   * Corporate preset, since the accent-index-to-role mapping this reads is
   * only true for that theme's particular colour ordering.
   *
   * Sums each lintable element's own box area (unrotated, same approximation
   * `checkOverlappingElements` already makes) by which accent it's `fillRef`'d
   * to, against the page's total area. This only ever sees elements a theme
   * actually recoloured — an accent painted as a bare literal with no
   * `fillRef` isn't theme-controlled and so isn't this rule's to police.
   */
  private checkAccentBalance(elements: readonly CanvasElement[], page: Page, theme: DesignTheme | undefined): LintIssue[] {
    if (!theme || theme.id !== TCS_CORPORATE.id) {
      return [];
    }

    const pageArea = page.width * page.height;
    if (pageArea <= 0) {
      return [];
    }

    let secondaryArea = 0;
    let tertiaryArea = 0;
    for (const element of elements) {
      const index = accentIndexOf(element);
      if (index === undefined) {
        continue;
      }
      const area = element.width * element.height;
      if (SECONDARY_ACCENT_INDICES.includes(index)) {
        secondaryArea += area;
      } else if (TERTIARY_ACCENT_INDICES.includes(index)) {
        tertiaryArea += area;
      }
    }

    const issues: LintIssue[] = [];
    const secondaryRatio = secondaryArea / pageArea;
    if (secondaryRatio > SECONDARY_MAX_AREA_RATIO) {
      issues.push({
        rule: 'accent-overuse',
        message: `TCS blue covers ${Math.round(secondaryRatio * 100)}% of the page — the guideline caps blue+yellow at 25%.`,
        elementIds: [],
      });
    }
    const tertiaryRatio = tertiaryArea / pageArea;
    if (tertiaryRatio > TERTIARY_MAX_AREA_RATIO) {
      issues.push({
        rule: 'accent-overuse',
        message: `TCS orange/red cover ${Math.round(tertiaryRatio * 100)}% of the page — the guideline caps orange+red+green at 10%.`,
        elementIds: [],
      });
    }
    return issues;
  }
}

/** The accent cycle index `element` is themed to via `fillRef`/`strokeRef`, if any. */
function accentIndexOf(element: CanvasElement): number | undefined {
  const refs: (ThemeColorRef | undefined)[] = [];
  if (isTextElement(element) || isShapeElement(element) || isIconElement(element) || isFrameElement(element)) {
    refs.push(element.fillRef);
  }
  if (isShapeElement(element)) {
    refs.push(element.strokeRef);
  }
  for (const ref of refs) {
    const match = ref ? /^accent-(\d+)-(solid|tint)$/.exec(ref) : null;
    if (match) {
      return Number(match[1]);
    }
  }
  return undefined;
}
