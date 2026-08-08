import { InfographicTemplate } from '../../models/infographic-template.model';
import { ARC_PROCESS_TEMPLATE } from './arc-process.template';
import { CARD_GRID_TEMPLATE } from './card-grid.template';
import { COMPARISON_COLUMNS_TEMPLATE } from './comparison-columns.template';
import { FUNNEL_TEMPLATE } from './funnel.template';
import { HUB_SPOKE_TEMPLATE } from './hub-spoke.template';
import { MATRIX_2X2_TEMPLATE } from './matrix-2x2.template';
import { QUADRANT_WHEEL_TEMPLATE } from './quadrant-wheel.template';
import { RADIAL_PROCESS_TEMPLATE } from './radial-process.template';
import { STAT_CALLOUT_TEMPLATE } from './stat-callout.template';
import { STAT_ROW_TEMPLATE } from './stat-row.template';
import { VERTICAL_TIMELINE_TEMPLATE } from './vertical-timeline.template';
import { ZIGZAG_TIMELINE_TEMPLATE } from './zigzag-timeline.template';

/**
 * Editable infographic layouts — Tier 2 of Track B (PLAN-PHASE2.md): unlike
 * the flattened PNGs in `infographics.manifest.ts`, every word here is a real
 * `TextElement`, selectable and AI-rewritable once placed.
 */
export const INFOGRAPHIC_TEMPLATES: readonly InfographicTemplate[] = [
  RADIAL_PROCESS_TEMPLATE,
  CARD_GRID_TEMPLATE,
  STAT_ROW_TEMPLATE,
  QUADRANT_WHEEL_TEMPLATE,
  ZIGZAG_TIMELINE_TEMPLATE,
  VERTICAL_TIMELINE_TEMPLATE,
  COMPARISON_COLUMNS_TEMPLATE,
  FUNNEL_TEMPLATE,
  HUB_SPOKE_TEMPLATE,
  MATRIX_2X2_TEMPLATE,
  STAT_CALLOUT_TEMPLATE,
  ARC_PROCESS_TEMPLATE,
];
