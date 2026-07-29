import { Injectable } from '@angular/core';

export interface SnapBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuides {
  /** Page-space x positions of vertical guide lines currently engaged. */
  readonly vertical: readonly number[];
  /** Page-space y positions of horizontal guide lines currently engaged. */
  readonly horizontal: readonly number[];
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuides;
}

export interface SnapOptions {
  page: { width: number; height: number };
  margin: number;
  gridSize: number;
  /** Match distance, already converted to page px (screen px / zoom). */
  threshold: number;
  snapToGrid: boolean;
  snapToGuides: boolean;
}

interface Match {
  delta: number;
  guide: number;
}

/**
 * Pure position math for a drag in progress: alignment guides against the
 * page, its margins and its other elements, with grid rounding as the
 * fallback where no guide claims an axis.
 *
 * Stateless on purpose — {@link CanvasInteractions} calls this on every
 * `dragmove` with a fresh snapshot of the other elements, so recomputing a
 * frame's snap never needs a store write of its own.
 */
@Injectable({ providedIn: 'root' })
export class SnappingService {
  /** Snaps `box`'s top-left corner, returning it with the guides that matched. */
  snap(box: SnapBox, others: readonly SnapBox[], options: SnapOptions): SnapResult {
    if (!options.snapToGrid && !options.snapToGuides) {
      return { x: box.x, y: box.y, guides: { vertical: [], horizontal: [] } };
    }

    let x = box.x;
    let y = box.y;
    const vertical: number[] = [];
    const horizontal: number[] = [];

    if (options.snapToGuides) {
      const xMatch = bestMatch(
        [box.x, box.x + box.width / 2, box.x + box.width],
        verticalCandidates(options.page, options.margin, others),
        options.threshold,
      );
      if (xMatch) {
        x = box.x + xMatch.delta;
        vertical.push(xMatch.guide);
      }

      const yMatch = bestMatch(
        [box.y, box.y + box.height / 2, box.y + box.height],
        horizontalCandidates(options.page, options.margin, others),
        options.threshold,
      );
      if (yMatch) {
        y = box.y + yMatch.delta;
        horizontal.push(yMatch.guide);
      }
    }

    // Guides win: grid only fills in an axis that no guide has already claimed.
    if (options.snapToGrid) {
      if (vertical.length === 0) {
        x = roundTo(x, options.gridSize);
      }
      if (horizontal.length === 0) {
        y = roundTo(y, options.gridSize);
      }
    }

    return { x, y, guides: { vertical, horizontal } };
  }
}

function verticalCandidates(
  page: { width: number },
  margin: number,
  others: readonly SnapBox[],
): number[] {
  const candidates = [0, page.width, page.width / 2, margin, page.width - margin];
  for (const other of others) {
    candidates.push(other.x, other.x + other.width, other.x + other.width / 2);
  }
  return candidates;
}

function horizontalCandidates(
  page: { height: number },
  margin: number,
  others: readonly SnapBox[],
): number[] {
  const candidates = [0, page.height, page.height / 2, margin, page.height - margin];
  for (const other of others) {
    candidates.push(other.y, other.y + other.height, other.y + other.height / 2);
  }
  return candidates;
}

/** The smallest in-threshold offset across every edge/candidate pair, if any. */
function bestMatch(
  edges: readonly number[],
  candidates: readonly number[],
  threshold: number,
): Match | null {
  let best: Match | null = null;

  for (const edge of edges) {
    for (const candidate of candidates) {
      const delta = candidate - edge;
      if (Math.abs(delta) > threshold) {
        continue;
      }
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, guide: candidate };
      }
    }
  }

  return best;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
