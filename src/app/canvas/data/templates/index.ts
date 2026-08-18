import { InfographicTemplate } from '../../models/infographic-template.model';
import { ARC_PROCESS_TEMPLATE } from './arc-process.template';
import { BANNER_TIMELINE_COLUMNS_TEMPLATE } from './banner-timeline-columns.template';
import { BAR_CHART_TEMPLATE } from './bar-chart.template';
import { BAR_CHART_CAPS_TEMPLATE } from './bar-chart-caps.template';
import { BLOB_STEPS_TEMPLATE } from './blob-steps.template';
import { CARD_GRID_TEMPLATE } from './card-grid.template';
import { CHEVRON_FAN_TEMPLATE } from './chevron-fan.template';
import { CIRCULAR_STEP_TIMELINE_TEMPLATE } from './circular-step-timeline.template';
import { COMPARISON_COLUMNS_TEMPLATE } from './comparison-columns.template';
import { FUNNEL_TEMPLATE } from './funnel.template';
import { HEXAGON_BANNER_HUB_TEMPLATE } from './hexagon-banner-hub.template';
import { HUB_BRANCH_LIST_TEMPLATE } from './hub-branch-list.template';
import { HUB_MINDMAP_6_TEMPLATE } from './hub-mindmap-6.template';
import { HUB_PILLS_GRID_TEMPLATE } from './hub-pills-grid.template';
import { HUB_SPOKE_TEMPLATE } from './hub-spoke.template';
import { ICON_ARCH_GRID_TEMPLATE } from './icon-arch-grid.template';
import { ICON_BULLET_LIST_TEMPLATE } from './icon-bullet-list.template';
import { ICON_CARD_CLUSTER_TEMPLATE } from './icon-card-cluster.template';
import { KPI_DASHBOARD_TEMPLATE } from './kpi-dashboard.template';
import { KPI_HALFMOON_TEMPLATE } from './kpi-halfmoon.template';
import { KPI_RING_GRID_TEMPLATE } from './kpi-ring-grid.template';
import { MATRIX_2X2_TEMPLATE } from './matrix-2x2.template';
import { NESTED_ARC_COMPARISON_TEMPLATE } from './nested-arc-comparison.template';
import { PERCENTAGE_BAR_RANKING_TEMPLATE } from './percentage-bar-ranking.template';
import { PHOTO_ARCH_GRID_TEMPLATE } from './photo-arch-grid.template';
import { PHOTO_FEATURE_ROW_TEMPLATE } from './photo-feature-row.template';
import { PICTURE_PLACEHOLDER_TEMPLATE } from './picture-placeholder.template';
import { PYRAMID_TEMPLATE } from './pyramid.template';
import { QUADRANT_INFO_TEMPLATE } from './quadrant-info.template';
import { QUADRANT_WHEEL_TEMPLATE } from './quadrant-wheel.template';
import { QUOTE_CALLOUT_TEMPLATE } from './quote-callout.template';
import { QUOTE_SPOTLIGHT_TEMPLATE } from './quote-spotlight.template';
import { RADIAL_PROCESS_TEMPLATE } from './radial-process.template';
import { SEGMENTED_WHEEL_TEMPLATE } from './segmented-wheel.template';
import { STAT_BADGE_TEMPLATE } from './stat-badge.template';
import { STAT_CALLOUT_TEMPLATE } from './stat-callout.template';
import { STAT_ROW_TEMPLATE } from './stat-row.template';
import { STAT_ROW_ARC_TEMPLATE } from './stat-row-arc.template';
import { STAT_SPOTLIGHT_TEMPLATE } from './stat-spotlight.template';
import { STEP_TRACKER_TEMPLATE } from './step-tracker.template';
import { TIMELINE_WAYPOINTS_TEMPLATE } from './timeline-waypoints.template';
import { VENN_DIAGRAM_TEMPLATE } from './venn-diagram.template';
import { VERTICAL_TIMELINE_TEMPLATE } from './vertical-timeline.template';
import { WEAVING_ARROW_TIMELINE_TEMPLATE } from './weaving-arrow-timeline.template';
import { WINDING_MILESTONE_PATH_TEMPLATE } from './winding-milestone-path.template';
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
  KPI_DASHBOARD_TEMPLATE,
  QUOTE_CALLOUT_TEMPLATE,
  ICON_BULLET_LIST_TEMPLATE,
  PERCENTAGE_BAR_RANKING_TEMPLATE,
  BAR_CHART_TEMPLATE,
  PYRAMID_TEMPLATE,
  STEP_TRACKER_TEMPLATE,
  VENN_DIAGRAM_TEMPLATE,
  STAT_SPOTLIGHT_TEMPLATE,
  STAT_BADGE_TEMPLATE,
  STAT_ROW_ARC_TEMPLATE,
  KPI_HALFMOON_TEMPLATE,
  KPI_RING_GRID_TEMPLATE,
  QUOTE_SPOTLIGHT_TEMPLATE,
  BAR_CHART_CAPS_TEMPLATE,
  TIMELINE_WAYPOINTS_TEMPLATE,
  PHOTO_FEATURE_ROW_TEMPLATE,
  CHEVRON_FAN_TEMPLATE,
  BLOB_STEPS_TEMPLATE,
  QUADRANT_INFO_TEMPLATE,
  ICON_CARD_CLUSTER_TEMPLATE,
  HUB_BRANCH_LIST_TEMPLATE,
  SEGMENTED_WHEEL_TEMPLATE,
  CIRCULAR_STEP_TIMELINE_TEMPLATE,
  NESTED_ARC_COMPARISON_TEMPLATE,
  PHOTO_ARCH_GRID_TEMPLATE,
  ICON_ARCH_GRID_TEMPLATE,
  HUB_MINDMAP_6_TEMPLATE,
  HUB_PILLS_GRID_TEMPLATE,
  BANNER_TIMELINE_COLUMNS_TEMPLATE,
  WEAVING_ARROW_TIMELINE_TEMPLATE,
  WINDING_MILESTONE_PATH_TEMPLATE,
  HEXAGON_BANNER_HUB_TEMPLATE,
  PICTURE_PLACEHOLDER_TEMPLATE,
];
