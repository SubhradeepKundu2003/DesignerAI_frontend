import { Injectable, inject } from '@angular/core';

import { IconName } from '../../shared/icons/icon-registry';
import { DataPoint, DocumentGenerateResult, InfographicShape, LlmBlock } from '../agent/document-generate.model';
import { ArcProcessContent } from '../data/templates/arc-process.template';
import { BarChartContent } from '../data/templates/bar-chart.template';
import { BarChartCapsContent } from '../data/templates/bar-chart-caps.template';
import { CardGridContent } from '../data/templates/card-grid.template';
import { CircularStepTimelineContent } from '../data/templates/circular-step-timeline.template';
import { ComparisonColumnsContent } from '../data/templates/comparison-columns.template';
import { FunnelContent } from '../data/templates/funnel.template';
import { HubBranchListContent } from '../data/templates/hub-branch-list.template';
import { HubMindmap6Content } from '../data/templates/hub-mindmap-6.template';
import { HubPillsGridContent } from '../data/templates/hub-pills-grid.template';
import { HubSpokeContent } from '../data/templates/hub-spoke.template';
import { IconArchGridContent } from '../data/templates/icon-arch-grid.template';
import { IconBulletListContent } from '../data/templates/icon-bullet-list.template';
import { IconCardClusterContent } from '../data/templates/icon-card-cluster.template';
import { KpiDashboardContent } from '../data/templates/kpi-dashboard.template';
import { KpiHalfmoonContent } from '../data/templates/kpi-halfmoon.template';
import { KpiRingGridContent } from '../data/templates/kpi-ring-grid.template';
import { Matrix2x2Content } from '../data/templates/matrix-2x2.template';
import { NestedArcComparisonContent } from '../data/templates/nested-arc-comparison.template';
import { PercentageBarRankingContent } from '../data/templates/percentage-bar-ranking.template';
import { PhotoArchGridContent } from '../data/templates/photo-arch-grid.template';
import { PhotoFeatureRowContent } from '../data/templates/photo-feature-row.template';
import { PICTURE_PLACEHOLDER_TEMPLATE, PicturePlaceholderContent } from '../data/templates/picture-placeholder.template';
import { PyramidContent } from '../data/templates/pyramid.template';
import { QuadrantInfoContent } from '../data/templates/quadrant-info.template';
import { QuadrantWheelContent } from '../data/templates/quadrant-wheel.template';
import { QuoteCalloutContent } from '../data/templates/quote-callout.template';
import { QuoteSpotlightContent } from '../data/templates/quote-spotlight.template';
import { RadialProcessContent } from '../data/templates/radial-process.template';
import { SegmentedWheelContent } from '../data/templates/segmented-wheel.template';
import { StatBadgeContent } from '../data/templates/stat-badge.template';
import { StatCalloutContent } from '../data/templates/stat-callout.template';
import { StatRowContent } from '../data/templates/stat-row.template';
import { StatRowArcContent } from '../data/templates/stat-row-arc.template';
import { StatSpotlightContent } from '../data/templates/stat-spotlight.template';
import { StepTrackerContent } from '../data/templates/step-tracker.template';
import { TimelineWaypointsContent } from '../data/templates/timeline-waypoints.template';
import { VennDiagramContent } from '../data/templates/venn-diagram.template';
import { VerticalTimelineContent } from '../data/templates/vertical-timeline.template';
import { WindingMilestonePathContent } from '../data/templates/winding-milestone-path.template';
import { ZigzagTimelineContent } from '../data/templates/zigzag-timeline.template';
import { CanvasElement, GroupElement, IconElement, TextElement, isTextElement } from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { DesignTheme, ThemeColorRef } from '../models/design-theme.model';
import { PAGE_BACKGROUND, PAGE_MARGIN, PAGE_SIZE } from '../models/editor-config';
import { halfCircle } from '../data/templates/template-kit';
import { generateId } from '../utils/id.util';
import { measureTextHeight } from '../utils/text-measure.util';
import { buildTemplatePlacement } from '../utils/template-placement.util';
import { DesignLintService } from './design-lint.service';
import { InfographicMatcherService, SHAPE_TEMPLATE_IDS } from './infographic-matcher.service';

/** Heading/body/highlight font sizes and stacking gap shared by both
 * `assemble()` and `assembleOntoPage()`, so a prompt-generated page and a
 * document-generated one look consistent. */
const GAP = 16;
const HEADING_FONT_SIZE = 32;
const BODY_FONT_SIZE = 16;
const HIGHLIGHT_FONT_SIZE = 16;
const ICON_SIZE = 32;
const MIN_FONT_SIZE = 10;

/** Templates whose `build()` reads a `content` override (Track P4) — every
 * other template still only ever renders its own placeholder copy, so an
 * `infographic` block matched to one of them falls back to a plain text
 * block instead, rather than placing polished-looking but wrong content.
 * Derived from `SHAPE_TEMPLATE_IDS` so this list and the shape→template map
 * can't drift apart. */
const PARAMETERIZED_TEMPLATE_IDS = new Set(Object.values(SHAPE_TEMPLATE_IDS).flat());

/** Mirrors `app/agent/guardrails.py`'s `_SHAPE_DATA_POINT_COUNT` -- the exact
 * number of `dataPoints` each shape's templates render via `mergeFixedList`.
 * `quote` is deliberately absent: it's driven by `block.quote`, not a fixed
 * list, so it has no fabrication risk to guard against here. */
const SHAPE_DATA_POINT_COUNT: Partial<Record<InfographicShape, number>> = {
  stat: 1,
  venn: 2,
  stat_row: 3,
  kpi: 4,
  bar_chart: 4,
  bullet_list: 4,
  timeline: 5,
  grid: 6,
};

/** Every `mergeFixedList`-based template's exact `dataPoints` requirement,
 * keyed by template id rather than shape -- needed because a block can also
 * reach a parameterized template via the tag-overlap fallback path (see
 * `buildInfographicBlock` below), which knows nothing about shapes or exact
 * counts. Without this, a block a few points short of a shape's count could
 * still land on that shape's template through `tags` alone and render
 * partly fabricated content, the exact bug this file's class doc warns
 * about -- `mergeFixedList` pads any slot it doesn't get an override for
 * with the template's own hardcoded default (e.g. `kpi-dashboard.template.ts`'s
 * made-up "4.6/5 Client satisfaction" tile), observed happening in practice. */
const TEMPLATE_MIN_DATA_POINTS = new Map<string, number>(
  (Object.entries(SHAPE_TEMPLATE_IDS) as [InfographicShape, readonly string[]][]).flatMap(([shape, ids]) => {
    const count = SHAPE_DATA_POINT_COUNT[shape];
    return count === undefined ? [] : ids.map((id): [string, number] => [id, count]);
  }),
);

export interface AssembledPage {
  readonly page: Page;
  readonly elements: readonly CanvasElement[];
  readonly groups: readonly GroupElement[];
  /** Backend content/design guardrail findings (`SectionPlan.warnings`) followed by any
   * geometric lint issues that survived the repair loop — never blocking, surfaced to the user. */
  readonly warnings: readonly string[];
}

interface BuiltBlock {
  readonly elements: readonly CanvasElement[];
  readonly group?: GroupElement;
  readonly height: number;
  readonly usesAccent: boolean;
}

interface BlockContext {
  readonly origin: { x: number; y: number };
  readonly contentWidth: number;
  readonly theme: DesignTheme;
  readonly accentIndex: number;
  readonly usedTemplateIds: Set<string>;
}

/** One block from a `SectionPlan`, tagged with which plan it came from so a
 * plan's backend `warnings` can still be attached to the first page its
 * content actually lands on once every plan's blocks are flattened into one
 * continuous stream (see `assemble()`). */
interface QueuedBlock {
  readonly block: LlmBlock;
  readonly planIndex: number;
}

/**
 * Turns backend content blocks (content + intent only, no coordinates, no
 * template ids — see `document-generate.model.ts`) into positioned, templated
 * elements ready for `AddPageCommand`/`AddElementsCommand`. The one place
 * either generation flow becomes real geometry: `assemble()` for a whole
 * document (`DocumentGenerateResult` -- every plan's blocks flattened and
 * packed continuously, a fresh page starting only once the current one is
 * actually full), `assembleOntoPage()` for a single prompt-driven page
 * (`GenerateMenu`) added onto a page the caller already picked.
 *
 * Three responsibilities, in order:
 * 1. Stack `heading`/`body`/`highlight` blocks top-down (deterministic
 *    margin/gap layout, using the real `measureTextHeight`).
 * 2. Match each `infographic` block to a real template by tag overlap
 *    (`InfographicMatcherService`) and place it via `buildTemplatePlacement`,
 *    grouped so it moves/deletes as one unit.
 * 3. Run `DesignLintService` on the assembled page, repair what's cheaply
 *    fixable (shrink overflowing text, push a block that wouldn't fit onto a
 *    fresh page), and surface whatever's left as a non-blocking warning.
 */
@Injectable({ providedIn: 'root' })
export class NewsletterAssembler {
  private readonly matcher = inject(InfographicMatcherService);
  private readonly lint = inject(DesignLintService);

  assemble(result: DocumentGenerateResult, theme: DesignTheme): AssembledPage[] {
    const usedTemplateIds = new Set<string>();
    const items: QueuedBlock[] = [];
    result.pages.forEach((sectionPlan, planIndex) => {
      for (const block of sectionPlan.blocks) {
        items.push({ block, planIndex });
      }
    });
    const planWarnings = result.pages.map((sectionPlan) => sectionPlan.warnings);
    // Once a plan's warnings have been attached to a page, never attach them
    // again -- a plan's content can still spill across a page boundary, but
    // it's still the same section, already reported once.
    const warnedPlans = new Set<number>();

    const assembled: AssembledPage[] = [];
    let index = 0;
    do {
      const { assembledPage, nextIndex } = this.packPage(items, index, theme, usedTemplateIds, planWarnings, warnedPlans);
      assembled.push(assembledPage);
      index = nextIndex;
    } while (index < items.length);
    return assembled;
  }

  /**
   * Same content→positioned-elements pipeline as {@link assemble}, for the
   * single-prompt `Generate` flow (`GenerateMenu`) instead of a whole
   * document: one caller-supplied target page, no overflow-driven pagination
   * (there's no "next page" to spill onto here — a prompt-generated page that
   * overflows just gets flagged by the lint pass, like any other overlong
   * block would). Reuses `buildBlock`/`buildPageDecoration`/`verifyAndRepair`
   * so a prompt-generated infographic gets the exact same real-template
   * matching and lint-repair a document-generated one does — the backend
   * only ever proposes content, never a template id or pixel position, same
   * grounding contract either flow.
   */
  assembleOntoPage(
    blocks: readonly LlmBlock[],
    theme: DesignTheme,
    target: { id: string; width: number; height: number },
  ): { elements: CanvasElement[]; groups: GroupElement[]; warnings: string[] } {
    const usedTemplateIds = new Set<string>();
    const contentWidth = Math.max(target.width - PAGE_MARGIN * 2, 1);
    const elements: CanvasElement[] = buildPageDecoration(theme, target.width, target.height);
    const groups: GroupElement[] = [];
    let cursorY = PAGE_MARGIN;
    let accentIndex = 0;

    for (const block of blocks) {
      const built = this.buildBlock(block, {
        origin: { x: PAGE_MARGIN, y: cursorY },
        contentWidth,
        theme,
        accentIndex,
        usedTemplateIds,
      });
      if (!built) {
        continue;
      }
      elements.push(...built.elements);
      if (built.group) {
        groups.push(built.group);
      }
      cursorY += built.height + GAP;
      if (built.usesAccent) {
        accentIndex += 1;
      }
    }

    const page: Page = {
      id: target.id,
      width: target.width,
      height: target.height,
      background: PAGE_BACKGROUND,
      elements,
      groups,
    };
    const warnings = this.verifyAndRepair(page);
    return { elements: page.elements, groups: page.groups, warnings };
  }

  /**
   * Fills one fresh page starting at `items[startIndex]`, pulling blocks from
   * however many plans it takes to fill it (not just the plan `items[startIndex]`
   * came from) and stopping only once a block genuinely doesn't fit -- the fix
   * for pages that used to end up mostly empty just because the plan that
   * produced them ran short. `nextIndex` tells the caller where the next page
   * should resume.
   */
  private packPage(
    items: readonly QueuedBlock[],
    startIndex: number,
    theme: DesignTheme,
    usedTemplateIds: Set<string>,
    planWarnings: readonly (readonly string[])[],
    warnedPlans: Set<number>,
  ): { assembledPage: AssembledPage; nextIndex: number } {
    const page: Page = {
      id: generateId('page'),
      width: PAGE_SIZE.width,
      height: PAGE_SIZE.height,
      background: PAGE_BACKGROUND,
      elements: [],
      groups: [],
    };
    const contentWidth = Math.max(page.width - PAGE_MARGIN * 2, 1);
    const maxY = page.height - PAGE_MARGIN;

    const elements: CanvasElement[] = buildPageDecoration(theme, page.width, page.height);
    const groups: GroupElement[] = [];
    const warnings: string[] = [];
    let cursorY = PAGE_MARGIN;
    let accentIndex = 0;
    // Tracks real content placed, separately from `elements.length` — that
    // array is pre-seeded with background decoration, so it's always > 0
    // even before the first block lands. Without this, a first block too
    // tall to fit would overflow to a fresh page immediately, leaving this
    // one with decoration and no content at all.
    let placedBlocks = 0;

    let i = startIndex;
    for (; i < items.length; i++) {
      const { block, planIndex } = items[i];
      // `buildInfographicBlock` marks a matched template id "used" as a side
      // effect of building it, before this loop knows whether the result
      // will actually fit -- snapshot so a discarded attempt (the `break`
      // below) can undo that mark. Without this, a block that overflows onto
      // the next page permanently burns a pool slot for a placement that
      // never happened, so the *next* page's build of the very same block
      // matches a different template than the one that's actually rendered.
      const usedTemplateIdsBeforeBuild = new Set(usedTemplateIds);
      const built = this.buildBlock(block, {
        origin: { x: PAGE_MARGIN, y: cursorY },
        contentWidth,
        theme,
        accentIndex,
        usedTemplateIds,
      });

      if (built) {
        const bottom = cursorY + built.height;
        if (placedBlocks > 0 && bottom > maxY) {
          // Doesn't fit -- leave it for the next page (where it'll be built
          // fresh), and don't mark its plan warned yet, since this block
          // hasn't actually landed anywhere.
          restoreUsedTemplateIds(usedTemplateIds, usedTemplateIdsBeforeBuild);
          break;
        }
        elements.push(...built.elements);
        if (built.group) {
          groups.push(built.group);
        }
        placedBlocks += 1;
        cursorY = bottom + GAP;
        if (built.usesAccent) {
          accentIndex += 1;
        }
      }

      if (!warnedPlans.has(planIndex)) {
        warnedPlans.add(planIndex);
        warnings.push(...planWarnings[planIndex]);
      }
    }

    const finished: Page = { ...page, elements, groups };
    const lintWarnings = this.verifyAndRepair(finished);
    return {
      assembledPage: {
        page: finished,
        elements: finished.elements,
        groups: finished.groups,
        warnings: [...warnings, ...lintWarnings],
      },
      nextIndex: i,
    };
  }

  private buildBlock(block: LlmBlock, ctx: BlockContext): BuiltBlock | null {
    switch (block.kind) {
      case 'heading':
        return this.buildTextBlock(block.text, ctx, {
          name: 'Heading',
          fontFamily: ctx.theme.fonts.heading,
          fontSize: HEADING_FONT_SIZE,
          fontStyle: 'bold',
          lineHeight: 1.2,
          fill: ctx.theme.colors.ink,
          fillRef: 'ink',
        });
      case 'body':
        return this.buildTextBlock(block.text, ctx, {
          name: 'Body',
          fontFamily: ctx.theme.fonts.body,
          fontSize: BODY_FONT_SIZE,
          fontStyle: 'normal',
          lineHeight: 1.5,
          fill: ctx.theme.colors.muted,
          fillRef: 'muted',
        });
      case 'highlight':
        return this.buildHighlightBlock(block, ctx);
      case 'infographic':
        return this.buildInfographicBlock(block, ctx);
      case 'picture':
        return this.buildPictureBlock(block, ctx);
    }
  }

  /**
   * An empty, editable "add a picture here" slot -- placed only when the
   * model itself proposes a `picture` block (see `LlmBlock.kind`'s doc
   * comment), never auto-filled: same "the user decides what picture goes
   * here" reasoning `_store_extracted_images` already applies to pictures
   * pulled straight out of the source document.
   */
  private buildPictureBlock(block: LlmBlock, ctx: BlockContext): BuiltBlock | null {
    const content: PicturePlaceholderContent = { caption: block.text || undefined };
    const origin = {
      x: ctx.origin.x + Math.max((ctx.contentWidth - PICTURE_PLACEHOLDER_TEMPLATE.size.width) / 2, 0),
      y: ctx.origin.y,
    };
    const { elements, group } = buildTemplatePlacement(PICTURE_PLACEHOLDER_TEMPLATE, origin, content, ctx.theme);
    return { elements, group, height: PICTURE_PLACEHOLDER_TEMPLATE.size.height, usesAccent: false };
  }

  private buildTextBlock(
    text: string,
    ctx: BlockContext,
    style: {
      name: string;
      fontFamily: string;
      fontSize: number;
      fontStyle: 'normal' | 'bold';
      lineHeight: number;
      fill: string;
      fillRef: ThemeColorRef;
    },
  ): BuiltBlock | null {
    if (!text.trim()) {
      return null;
    }
    const attrs = {
      text,
      width: ctx.contentWidth,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontStyle: style.fontStyle,
      letterSpacing: 0,
      lineHeight: style.lineHeight,
    };
    const height = measureTextHeight(attrs);
    const element: TextElement = {
      id: generateId(),
      name: style.name,
      x: ctx.origin.x,
      y: ctx.origin.y,
      height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      type: 'text',
      align: 'left',
      ...attrs,
      fill: style.fill,
      fillRef: style.fillRef,
    };
    return { elements: [element], height, usesAccent: false };
  }

  private buildHighlightBlock(block: LlmBlock, ctx: BlockContext): BuiltBlock | null {
    if (!block.text.trim()) {
      return null;
    }
    const [fill, fillRef] = accentFor(ctx.theme, ctx.accentIndex);
    const icon: IconElement = {
      id: generateId(),
      name: 'Highlight icon',
      x: ctx.origin.x,
      y: ctx.origin.y,
      width: ICON_SIZE,
      height: ICON_SIZE,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      type: 'icon',
      iconId: (block.icon ?? 'star') as IconName,
      fill,
      fillRef,
    };
    const labelWidth = Math.max(ctx.contentWidth - ICON_SIZE - GAP, 1);
    const labelAttrs = {
      text: block.text,
      width: labelWidth,
      fontFamily: ctx.theme.fonts.body,
      fontSize: HIGHLIGHT_FONT_SIZE,
      fontStyle: 'normal' as const,
      letterSpacing: 0,
      lineHeight: 1.4,
    };
    const labelHeight = measureTextHeight(labelAttrs);
    const label: TextElement = {
      id: generateId(),
      name: 'Highlight label',
      x: ctx.origin.x + ICON_SIZE + GAP,
      y: ctx.origin.y,
      height: labelHeight,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      type: 'text',
      align: 'left',
      ...labelAttrs,
      fill: ctx.theme.colors.ink,
      fillRef: 'ink',
    };
    return { elements: [icon, label], height: Math.max(ICON_SIZE, labelHeight), usesAccent: true };
  }

  private buildInfographicBlock(block: LlmBlock, ctx: BlockContext): BuiltBlock | null {
    // A block with no real content (no shape the backend's guardrail pass
    // trusted, no dataPoints, no quote) must never reach a parameterized
    // template: `tags` alone can still tie-break towards one (see
    // `InfographicMatcherService`'s `preferredTemplateIds`), and mapping no
    // content onto it renders that template's own hardcoded placeholder copy
    // as if it were real -- exactly the "polished-looking but wrong content"
    // this method exists to avoid (see the class doc comment).
    const hasRealContent = Boolean(block.shape) || (block.dataPoints?.length ?? 0) > 0 || Boolean(block.quote);
    const matched = hasRealContent
      ? this.matcher.match(block.tags, ctx.usedTemplateIds, PARAMETERIZED_TEMPLATE_IDS, block.shape)
      : undefined;
    // `shape` (backend-verified) always carries exactly enough dataPoints for
    // its template. The tag-overlap fallback has no such guarantee -- it can
    // still land on a parameterized template with too few points, which
    // would render fabricated content for the slots it doesn't cover. Re-verify
    // here regardless of which path matched, since this is the last point
    // before that template actually gets built.
    const minDataPoints = matched && TEMPLATE_MIN_DATA_POINTS.get(matched.id);
    const hasEnoughDataPoints = minDataPoints === undefined || (block.dataPoints?.length ?? 0) >= minDataPoints;
    const template = matched && hasEnoughDataPoints ? matched : undefined;

    if (!template || !PARAMETERIZED_TEMPLATE_IDS.has(template.id)) {
      const fallbackText = fallbackTextFor(block);
      return fallbackText
        ? this.buildTextBlock(fallbackText, ctx, {
            name: 'Highlight',
            fontFamily: ctx.theme.fonts.body,
            fontSize: BODY_FONT_SIZE,
            fontStyle: 'normal',
            lineHeight: 1.5,
            fill: ctx.theme.colors.muted,
            fillRef: 'muted',
          })
        : null;
    }

    ctx.usedTemplateIds.add(template.id);
    const content = mapBlockToContent(template.id, block);
    const origin = {
      x: ctx.origin.x + Math.max((ctx.contentWidth - template.size.width) / 2, 0),
      y: ctx.origin.y,
    };
    const { elements, group } = buildTemplatePlacement(template, origin, content, ctx.theme);
    return { elements, group, height: template.size.height, usesAccent: false };
  }

  /**
   * Repairs what's cheaply fixable without another model round-trip — an
   * overflowing content-overridden template box (fixed-height by design,
   * sized for each template's own hardcoded placeholder copy, not for
   * whatever real content ends up substituted in) first shrinks its font
   * until it fits or hits a floor. If it still doesn't fit even at that
   * floor, the box itself grows to the text's real measured height instead
   * of leaving the overflow clipped — the box is an ordinary element (a
   * `GroupElement`'s own box is a derived bounding box of its members, see
   * that type's doc comment), so growing it is just as inspectable/movable/
   * resizable afterward as anything else placed on the page, no different
   * from how the user could stretch it by hand. Re-lints after every repair
   * and reports whatever's still left (e.g. a grown box now overlapping a
   * neighbour) as a warning. Never drops content and never blocks the commit.
   */
  private verifyAndRepair(page: Page): string[] {
    const overflowIssues = this.lint.lint(page).filter((issue) => issue.rule === 'text-overflow');
    for (const issue of overflowIssues) {
      const index = page.elements.findIndex((element) => element.id === issue.elementIds[0]);
      const element = index >= 0 ? page.elements[index] : undefined;
      if (!element || !isTextElement(element)) {
        continue;
      }
      const shrunk = shrinkToFit(element);
      page.elements[index] = shrunk ?? growToFit(element);
    }
    return this.lint.lint(page).map((issue) => issue.message);
  }
}

/**
 * Two ambient half-circle motifs behind every generated page's content — a
 * wide low dome across the bottom edge and a smaller cap tucked in the top
 * corner, both `accent-*-tint`'d so `ApplyThemeCommand` recolours them with
 * the rest of the page. Kept fully inside the page rect (no negative/overflowing
 * coordinates) and flagged `decorative` so `DesignLintService` never reports
 * them as out-of-bounds or as overlapping the real content stacked on top.
 */
function buildPageDecoration(theme: DesignTheme, pageWidth: number, pageHeight: number): CanvasElement[] {
  const [bottomFill, bottomRef] = accentFor(theme, 0, 'tint');
  const [cornerFill, cornerRef] = accentFor(theme, 1, 'tint');

  const bottomBandHeight = Math.round(pageHeight * 0.16);
  const bottomBand = halfCircle({
    x: 0,
    y: pageHeight - bottomBandHeight,
    width: pageWidth,
    height: bottomBandHeight,
    orientation: 'up',
    name: 'Decoration: bottom band',
    fill: bottomFill,
    fillRef: bottomRef,
  });

  const cornerSize = Math.round(pageWidth * 0.34);
  const cornerCap = halfCircle({
    x: pageWidth - cornerSize,
    y: 0,
    width: cornerSize,
    height: Math.round(cornerSize / 2),
    orientation: 'down',
    name: 'Decoration: corner cap',
    fill: cornerFill,
    fillRef: cornerRef,
  });

  return [{ ...bottomBand, decorative: true }, { ...cornerCap, decorative: true }];
}

function accentFor(theme: DesignTheme, index: number, variant: 'solid' | 'tint' = 'solid'): [string, ThemeColorRef] {
  const accents = theme.colors.accents;
  if (!accents.length) {
    return [theme.colors.ink, 'ink'];
  }
  const i = index % accents.length;
  const accent = accents[i];
  return variant === 'tint' ? [accent.tint, `accent-${i}-tint`] : [accent.solid, `accent-${i}-solid`];
}

function shrinkToFit(element: TextElement): TextElement | null {
  for (let fontSize = element.fontSize - 1; fontSize >= MIN_FONT_SIZE; fontSize -= 1) {
    const height = measureTextHeight({ ...element, fontSize });
    if (height <= element.height) {
      return { ...element, fontSize };
    }
  }
  return null;
}

/** Rolls `current` back to exactly `snapshot`'s contents, in place -- used to
 * undo a discarded infographic build's template-id mark (see `packPage`). */
function restoreUsedTemplateIds(current: Set<string>, snapshot: ReadonlySet<string>): void {
  for (const id of current) {
    if (!snapshot.has(id)) {
      current.delete(id);
    }
  }
}

/** Last resort once `shrinkToFit` can't get text down to `MIN_FONT_SIZE` and still
 * have it fit — grows the box to the text's real measured height so the content
 * stays fully visible (and selectable/editable/movable, like any other element)
 * instead of being silently clipped at its old, placeholder-sized box. */
function growToFit(element: TextElement): TextElement {
  return { ...element, height: Math.ceil(measureTextHeight(element)) };
}

/** First-choice fallback text when a matched template has no content override to receive `block`'s data. */
function fallbackTextFor(block: LlmBlock): string {
  return block.quote || block.purpose || block.text || dataPointsToText(block.dataPoints);
}

function dataPointsToText(dataPoints: readonly DataPoint[] | undefined): string {
  return (dataPoints ?? []).map((point) => `${point.label}: ${point.value}`).join(' · ');
}

/** Extracts a leading number from a string like `'42%'` or `'$1.2M'`; `0` if none is found. */
function parseLeadingNumber(value: string): number {
  const match = /-?\d+(\.\d+)?/.exec(value);
  return match ? Number(match[0]) : 0;
}

function mapBlockToContent(templateId: string, block: LlmBlock): unknown {
  const dataPoints = block.dataPoints ?? [];
  switch (templateId) {
    case 'template-stat-callout': {
      const [point] = dataPoints;
      return {
        stat: point?.value,
        statLabel: point?.label,
        headline: block.purpose || undefined,
        body: block.text || undefined,
      } satisfies StatCalloutContent;
    }
    case 'template-bar-chart':
      return {
        items: dataPoints.map((point) => ({ label: point.label, value: parseLeadingNumber(point.value) })),
      } satisfies BarChartContent;
    case 'template-kpi-dashboard':
      return {
        kpis: dataPoints.map((point) => ({ value: point.value, label: point.label })),
      } satisfies KpiDashboardContent;
    case 'template-quote-callout':
      return { quote: block.quote || undefined } satisfies QuoteCalloutContent;
    case 'template-vertical-timeline':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies VerticalTimelineContent;
    case 'template-icon-bullet-list':
      return {
        items: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies IconBulletListContent;
    case 'template-stat-row':
      return {
        stats: dataPoints.map((point) => ({ value: point.value, label: point.label })),
      } satisfies StatRowContent;
    case 'template-percentage-bar-ranking':
      return {
        items: dataPoints.map((point) => ({ label: point.label, pct: parseLeadingNumber(point.value) })),
      } satisfies PercentageBarRankingContent;
    case 'template-radial-process':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies RadialProcessContent;
    case 'template-zigzag-timeline':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies ZigzagTimelineContent;
    case 'template-arc-process':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies ArcProcessContent;
    case 'template-step-tracker':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies StepTrackerContent;
    case 'template-funnel':
      return {
        stages: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies FunnelContent;
    case 'template-quadrant-wheel':
      return {
        callouts: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies QuadrantWheelContent;
    case 'template-matrix-2x2':
      return {
        quadrants: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies Matrix2x2Content;
    case 'template-pyramid':
      return {
        tiers: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies PyramidContent;
    case 'template-venn-diagram': {
      const [leftPoint, rightPoint] = dataPoints;
      return {
        left: leftPoint ? { title: leftPoint.label, body: leftPoint.value } : undefined,
        right: rightPoint ? { title: rightPoint.label, body: rightPoint.value } : undefined,
        centerLabel: block.purpose || undefined,
        caption: block.text || undefined,
      } satisfies VennDiagramContent;
    }
    case 'template-stat-spotlight': {
      const [point] = dataPoints;
      return {
        stat: point?.value,
        statLabel: point?.label,
        headline: block.purpose || undefined,
      } satisfies StatSpotlightContent;
    }
    case 'template-stat-badge': {
      const [point] = dataPoints;
      return { stat: point?.value, statLabel: point?.label } satisfies StatBadgeContent;
    }
    case 'template-stat-row-arc':
      return {
        stats: dataPoints.map((point) => ({ value: point.value, label: point.label })),
      } satisfies StatRowArcContent;
    case 'template-kpi-halfmoon':
      return {
        kpis: dataPoints.map((point) => ({ value: point.value, label: point.label })),
      } satisfies KpiHalfmoonContent;
    case 'template-kpi-ring-grid':
      return {
        kpis: dataPoints.map((point) => ({ value: point.value, label: point.label })),
      } satisfies KpiRingGridContent;
    case 'template-quote-spotlight':
      return { quote: block.quote || undefined } satisfies QuoteSpotlightContent;
    case 'template-bar-chart-caps':
      return {
        items: dataPoints.map((point) => ({ label: point.label, pct: parseLeadingNumber(point.value) })),
      } satisfies BarChartCapsContent;
    case 'template-timeline-waypoints':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies TimelineWaypointsContent;
    case 'template-card-grid':
      return {
        cards: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies CardGridContent;
    case 'template-hub-spoke':
      return {
        branches: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies HubSpokeContent;
    case 'template-comparison-columns':
      // No natural per-item "title" in this layout's single-line bullets --
      // the point's own label/value collapse into one line rather than a
      // dropped `value` (see `ComparisonColumnsContent`'s doc comment).
      return {
        items: dataPoints.map((point) => ({ text: `${point.label}: ${point.value}` })),
      } satisfies ComparisonColumnsContent;
    case 'template-photo-feature-row':
      return {
        cards: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies PhotoFeatureRowContent;
    case 'template-quadrant-info':
      return {
        callouts: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies QuadrantInfoContent;
    case 'template-circular-step-timeline':
      return {
        steps: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies CircularStepTimelineContent;
    case 'template-hub-branch-list':
      return {
        items: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies HubBranchListContent;
    case 'template-icon-card-cluster':
      return {
        cards: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies IconCardClusterContent;
    case 'template-nested-arc-comparison':
      return {
        bands: dataPoints.map((point) => ({ label: point.label, body: point.value })),
      } satisfies NestedArcComparisonContent;
    case 'template-segmented-wheel':
      return {
        wedges: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies SegmentedWheelContent;
    case 'template-hub-mindmap-6':
      return {
        branches: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies HubMindmap6Content;
    case 'template-winding-milestone-path':
      return {
        milestones: dataPoints.map((point) => ({ title: point.label, body: point.value })),
      } satisfies WindingMilestonePathContent;
    case 'template-icon-arch-grid':
      // Single-field cards (body only, no separate title) -- fold the point's
      // label into its body text rather than dropping it, same pattern
      // `template-comparison-columns` uses above.
      return {
        cards: dataPoints.map((point) => ({ body: `${point.label}: ${point.value}` })),
      } satisfies IconArchGridContent;
    case 'template-photo-arch-grid':
      return {
        cards: dataPoints.map((point) => ({ body: `${point.label}: ${point.value}` })),
      } satisfies PhotoArchGridContent;
    case 'template-hub-pills-grid':
      // Two parallel 6-slot lists sharing the same 6 dataPoints: each pill's
      // short label out front, its longer elaboration in the grid cell below.
      return {
        pills: dataPoints.map((point) => ({ label: point.label })),
        cells: dataPoints.map((point) => ({ body: point.value })),
      } satisfies HubPillsGridContent;
    default:
      return undefined;
  }
}
