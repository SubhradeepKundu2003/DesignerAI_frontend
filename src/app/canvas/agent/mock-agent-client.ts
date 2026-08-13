import { Injectable } from '@angular/core';
import { Observable, delay, from, of } from 'rxjs';

import {
  AgentClient,
  AgentGenerateFromDocumentRequest,
  AgentGenerateRequest,
  AgentGenerateResult,
} from './agent-client';
import { DocumentGenerateResult, LlmBlock, SectionPlan } from './document-generate.model';

/** Simulated network latency, long enough that the panel's busy state is visibly testable. */
const RESPONSE_DELAY_MS = 600;
/** How many source paragraphs the mock bundles onto one page — mirrors `paginate`'s intent, not its exact math. */
const PARAGRAPHS_PER_PAGE = 3;

/**
 * Fast, offline stand-in for the real backend (`HttpAgentClient`, Track E3) —
 * used by tests and available for local demos without Ollama running. Always
 * succeeds with a small, deterministic heading + body plan -- content and
 * intent only, no coordinates, no template ids, same contract the real
 * backend returns. `NewsletterAssembler.assembleOntoPage()` turns this into
 * positioned elements exactly the same way it would for a real response, so
 * nothing about the output looks second-class next to one.
 */
@Injectable()
export class MockAgentClient extends AgentClient {
  generate(request: AgentGenerateRequest): Observable<AgentGenerateResult> {
    return of(buildResult(request)).pipe(delay(RESPONSE_DELAY_MS));
  }

  generateFromDocument(request: AgentGenerateFromDocumentRequest): Observable<DocumentGenerateResult> {
    return from(request.file.text().then(buildDocumentResult)).pipe(delay(RESPONSE_DELAY_MS));
  }
}

function buildResult(request: AgentGenerateRequest): AgentGenerateResult {
  const { prompt } = request;
  return {
    summary: `Generated a starter layout for "${prompt.trim() || 'your design'}"`,
    blocks: [
      headingBlock(headline(prompt)),
      bodyBlock(
        `AI-generated placeholder copy for "${prompt.trim() || 'your design'}". Replace with your own content once the real agent is wired up.`,
      ),
    ],
    warnings: [],
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

/**
 * Offline stand-in for `POST /generate/document`: splits the file into
 * paragraphs and bundles a few onto each page as a heading + body, with no
 * real section-aware or infographic-aware intelligence — good enough to
 * exercise `NewsletterAssembler`'s multi-page pipeline without a live
 * backend, same spirit as {@link buildResult} above.
 */
function buildDocumentResult(text: string): DocumentGenerateResult {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return {
      pages: [
        { blocks: [headingBlock('Untitled'), bodyBlock('The uploaded document had no readable text.')], warnings: [] },
      ],
      images: [],
    };
  }

  const pages: SectionPlan[] = [];
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    const group = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
    const blocks: LlmBlock[] = [
      headingBlock(headline(group[0])),
      ...group.map((paragraph) => bodyBlock(paragraph)),
    ];
    pages.push({ blocks, warnings: [] });
  }
  return { pages, images: [] };
}

function headingBlock(text: string): LlmBlock {
  return { kind: 'heading', text, tags: [] };
}

function bodyBlock(text: string): LlmBlock {
  return { kind: 'body', text, tags: [] };
}
