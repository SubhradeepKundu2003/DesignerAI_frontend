import { Injectable, inject } from '@angular/core';

import { IconName } from '../../shared/icons/icon-registry';
import { DataPoint, DocumentGenerateResult, LlmBlock } from '../agent/document-generate.model';
import { BarChartContent } from '../data/templates/bar-chart.template';
import { IconBulletListContent } from '../data/templates/icon-bullet-list.template';
import { KpiDashboardContent } from '../data/templates/kpi-dashboard.template';
import { QuoteCalloutContent } from '../data/templates/quote-callout.template';
import { StatCalloutContent } from '../data/templates/stat-callout.template';
import { VerticalTimelineContent } from '../data/templates/vertical-timeline.template';
import { CanvasElement, GroupElement, IconElement, TextElement, isTextElement } from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { DesignTheme, ThemeColorRef } from '../models/design-theme.model';
import { PAGE_BACKGROUND, PAGE_MARGIN, PAGE_SIZE } from '../models/editor-config';
import { generateId } from '../utils/id.util';
import { measureTextHeight } from '../utils/text-measure.util';
import { buildTemplatePlacement } from '../utils/template-placement.util';
import { DesignLintService } from './design-lint.service';
import { InfographicMatcherService } from './infographic-matcher.service';

/** Mirrors `PAGE_MARGIN`/`GAP` and the heading/body/highlight font sizes the
 * backend's `layout.py` uses for the single-page prompt flow — kept visually
 * consistent between the two generation paths. */
const GAP = 16;
const HEADING_FONT_SIZE = 32;
const BODY_FONT_SIZE = 16;
const HIGHLIGHT_FONT_SIZE = 16;
const ICON_SIZE = 32;
const MIN_FONT_SIZE = 10;

/** Templates whose `build()` reads a `content` override (Track P4) — every
 * other template still only ever renders its own placeholder copy, so an
 * `infographic` block matched to one of them falls back to a plain text
 * block instead, rather than placing polished-looking but wrong content. */
const PARAMETERIZED_TEMPLATE_IDS = new Set([
  'template-stat-callout',
  'template-bar-chart',
  'template-kpi-dashboard',
  'template-quote-callout',
  'template-vertical-timeline',
  'template-icon-bullet-list',
]);

export interface AssembledPage {
  readonly page: Page;
  readonly elements: readonly CanvasElement[];
  readonly groups: readonly GroupElement[];
  /** Lint issues that survived the repair loop — never blocking, shown as a per-page warning badge. */
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

/**
 * Turns a backend `DocumentGenerateResult` (content + intent only, no
 * coordinates, no template ids — see `document-generate.model.ts`) into
 * positioned, templated pages ready for `AddPageCommand`/`AddElementsCommand`.
 *
 * Three responsibilities, in order:
 * 1. Stack `heading`/`body`/`highlight` blocks top-down (same deterministic
 *    margin/gap approach `layout.py` uses server-side for the single-page
 *    flow, ported here since this is the one place with both the real
 *    `measureTextHeight` and the `InfographicTemplate` catalog).
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
    const queue: LlmBlock[][] = result.pages.map((sectionPlan) => [...sectionPlan.blocks]);
    const assembled: AssembledPage[] = [];

    while (queue.length > 0) {
      const blocks = queue.shift()!;
      const { assembledPage, overflow } = this.assembleOnePage(blocks, theme, usedTemplateIds);
      assembled.push(assembledPage);
      if (overflow.length > 0) {
        queue.unshift(overflow);
      }
    }
    return assembled;
  }

  private assembleOnePage(
    blocks: readonly LlmBlock[],
    theme: DesignTheme,
    usedTemplateIds: Set<string>,
  ): { assembledPage: AssembledPage; overflow: LlmBlock[] } {
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

    const elements: CanvasElement[] = [];
    const groups: GroupElement[] = [];
    let cursorY = PAGE_MARGIN;
    let accentIndex = 0;

    for (let i = 0; i < blocks.length; i++) {
      const built = this.buildBlock(blocks[i], {
        origin: { x: PAGE_MARGIN, y: cursorY },
        contentWidth,
        theme,
        accentIndex,
        usedTemplateIds,
      });
      if (!built) {
        continue;
      }

      const bottom = cursorY + built.height;
      if (elements.length > 0 && bottom > maxY) {
        return this.finishPage(page, elements, groups, blocks.slice(i));
      }

      elements.push(...built.elements);
      if (built.group) {
        groups.push(built.group);
      }
      cursorY = bottom + GAP;
      if (built.usesAccent) {
        accentIndex += 1;
      }
    }

    return this.finishPage(page, elements, groups, []);
  }

  private finishPage(
    page: Page,
    elements: CanvasElement[],
    groups: GroupElement[],
    overflow: LlmBlock[],
  ): { assembledPage: AssembledPage; overflow: LlmBlock[] } {
    const finished: Page = { ...page, elements, groups };
    const warnings = this.verifyAndRepair(finished);
    return { assembledPage: { page: finished, elements: finished.elements, groups: finished.groups, warnings }, overflow };
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
    }
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
    const template = this.matcher.match(block.tags, ctx.usedTemplateIds, PARAMETERIZED_TEMPLATE_IDS);

    if (!PARAMETERIZED_TEMPLATE_IDS.has(template.id)) {
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
    const { elements, group } = buildTemplatePlacement(template, origin, content);
    return { elements, group, height: template.size.height, usesAccent: false };
  }

  /**
   * Repairs what's cheaply fixable without another model round-trip — an
   * overflowing content-overridden template box (fixed-height by design, see
   * each of the six templates' hardcoded text-box heights) shrinks its font
   * until it fits or hits a floor — then re-lints and reports whatever
   * remains as a warning. Never drops content and never blocks the commit.
   */
  private verifyAndRepair(page: Page): string[] {
    const overflowIssues = this.lint.lint(page).filter((issue) => issue.rule === 'text-overflow');
    for (const issue of overflowIssues) {
      const index = page.elements.findIndex((element) => element.id === issue.elementIds[0]);
      const element = index >= 0 ? page.elements[index] : undefined;
      if (element && isTextElement(element)) {
        const shrunk = shrinkToFit(element);
        if (shrunk) {
          page.elements[index] = shrunk;
        }
      }
    }
    return this.lint.lint(page).map((issue) => issue.message);
  }
}

function accentFor(theme: DesignTheme, index: number): [string, ThemeColorRef] {
  const accents = theme.colors.accents;
  if (!accents.length) {
    return [theme.colors.ink, 'ink'];
  }
  const accent = accents[index % accents.length];
  return [accent.solid, `accent-${index % accents.length}-solid`];
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
    default:
      return undefined;
  }
}
