import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { ShapeElement, TextElement } from '../models/canvas-element.model';
import { ThemeColorRef } from '../models/design-theme.model';
import { PAGE_MARGIN } from '../models/editor-config';
import { measureTextHeight } from '../utils/text-measure.util';
import { generateId } from '../utils/id.util';
import { AgentClient, AgentGenerateRequest, AgentGenerateResult } from './agent-client';

/** Simulated network latency, long enough that the panel's busy state is visibly testable. */
const RESPONSE_DELAY_MS = 600;

const GAP = 16;

/**
 * Fast, offline stand-in for the real backend (`HttpAgentClient`, Track E3) —
 * used by tests and available for local demos without Ollama running. Always
 * succeeds with a small, deterministic starter layout — a heading, a body
 * paragraph and an accent bar — built the same way a hand-authored template
 * is: literal colours paired with theme slot refs (see `design-theme.model.ts`),
 * sized with the same `measureTextHeight` the text renderer and properties
 * panel use, so nothing about the output looks second-class next to a
 * human-placed element.
 */
@Injectable()
export class MockAgentClient extends AgentClient {
  generate(request: AgentGenerateRequest): Observable<AgentGenerateResult> {
    return of(buildResult(request)).pipe(delay(RESPONSE_DELAY_MS));
  }
}

function buildResult(request: AgentGenerateRequest): AgentGenerateResult {
  const { page, theme, prompt } = request;
  const contentWidth = Math.max(page.width - PAGE_MARGIN * 2, 1);
  const accent = theme.colors.accents[0];
  const accentColor = accent?.solid ?? theme.colors.ink;
  const accentRef: ThemeColorRef | undefined = accent ? 'accent-0-solid' : undefined;

  const accentBar: ShapeElement = {
    id: generateId(),
    name: 'Accent bar',
    x: PAGE_MARGIN,
    y: PAGE_MARGIN,
    width: 64,
    height: 6,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'shape',
    shape: 'rectangle',
    fill: accentColor,
    fillRef: accentRef,
    stroke: accentColor,
    strokeRef: accentRef,
    strokeWidth: 0,
    cornerRadius: 3,
  };

  const headingY = PAGE_MARGIN + accentBar.height + GAP;
  const headingAttrs = {
    text: headline(prompt),
    width: contentWidth,
    fontFamily: theme.fonts.heading,
    fontSize: 32,
    fontStyle: 'bold' as const,
    letterSpacing: 0,
    lineHeight: 1.2,
  };
  const heading: TextElement = {
    ...headingAttrs,
    id: generateId(),
    name: 'Heading',
    x: PAGE_MARGIN,
    y: headingY,
    height: measureTextHeight(headingAttrs),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'text',
    fill: theme.colors.ink,
    fillRef: 'ink',
    align: 'left',
  };

  const bodyY = headingY + heading.height + GAP;
  const bodyAttrs = {
    text: `AI-generated placeholder copy for "${prompt.trim() || 'your design'}". Replace with your own content once the real agent is wired up.`,
    width: contentWidth,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontStyle: 'normal' as const,
    letterSpacing: 0,
    lineHeight: 1.5,
  };
  const body: TextElement = {
    ...bodyAttrs,
    id: generateId(),
    name: 'Body',
    x: PAGE_MARGIN,
    y: bodyY,
    height: measureTextHeight(bodyAttrs),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    type: 'text',
    fill: theme.colors.muted,
    fillRef: 'muted',
    align: 'left',
  };

  return {
    summary: `Generated a starter layout for "${prompt.trim() || 'your design'}"`,
    elements: [accentBar, heading, body],
  };
}

/** A short headline from the prompt: capitalized, trimmed, and never empty. */
function headline(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return 'New design';
  }
  const clipped = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}
