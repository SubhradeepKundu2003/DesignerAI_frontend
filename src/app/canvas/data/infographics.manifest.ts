/**
 * The infographics asset library — curated from the TCS Talent Development
 * deck in `C:\Users\kundu\Downloads\Infographics`.
 *
 * These are flattened 16:9 slide exports (title, copy and icons already baked
 * into the pixels), not editable vector source. Placing one adds a plain
 * `ImageElement` — resizable, movable, croppable like any image — but the
 * Lorem Ipsum text inside the picture itself cannot be edited or AI-rewritten
 * until a layout is hand-rebuilt as native Canvas JSON elements (see
 * PLAN-PHASE2.md, Track B, Tier 2). All 22 have been opened and hand-labelled;
 * update the label/tags here if a source PNG is ever swapped out.
 */
export interface InfographicAsset {
  readonly id: string;
  /** Path under `public/`, served at the app root. */
  readonly file: string;
  readonly label: string;
  readonly tags: readonly string[];
}

export const INFOGRAPHICS: readonly InfographicAsset[] = [
  {
    id: 'infographic-01',
    file: '/assets/infographics/infographic-01.png',
    label: 'Four-point radial process',
    tags: ['process', 'radial', 'numbered', 'dark'],
  },
  {
    id: 'infographic-02',
    file: '/assets/infographics/infographic-02.png',
    label: 'Four-card photo feature row',
    tags: ['cards', 'photo', 'feature', 'dark'],
  },
  {
    id: 'infographic-03',
    file: '/assets/infographics/infographic-03.png',
    label: 'Quadrant icon wheel',
    tags: ['process', 'wheel', 'icons', 'dark'],
  },
  {
    id: 'infographic-04',
    file: '/assets/infographics/infographic-04.png',
    label: 'Four-step interlocking arc process',
    tags: ['process', 'arc', 'steps', 'dark'],
  },
  {
    id: 'infographic-05',
    file: '/assets/infographics/infographic-05.png',
    label: 'Three-point pinwheel',
    tags: ['process', 'pinwheel', 'icons', 'dark'],
  },
  {
    id: 'infographic-06',
    file: '/assets/infographics/infographic-06.png',
    label: 'Four-bar percentage ranking',
    tags: ['bars', 'ranking', 'percentage', 'list', 'dark'],
  },
  {
    id: 'infographic-07',
    file: '/assets/infographics/infographic-07.png',
    label: 'Three-step blob list',
    tags: ['steps', 'list', 'numbered', 'light'],
  },
  {
    id: 'infographic-08',
    file: '/assets/infographics/infographic-08.png',
    label: 'Quadrant pinwheel with center label',
    tags: ['quadrant', 'pinwheel', 'center-label', 'light'],
  },
  {
    id: 'infographic-09',
    file: '/assets/infographics/infographic-09.png',
    label: 'Five-icon card cluster',
    tags: ['cards', 'icons', 'cluster', 'light'],
  },
  {
    id: 'infographic-10',
    file: '/assets/infographics/infographic-10.png',
    label: 'Five-branch hub list',
    tags: ['hub', 'branches', 'list', 'light'],
  },
  {
    id: 'infographic-11',
    file: '/assets/infographics/infographic-11.png',
    label: 'Five-segment exploded pie wheel',
    tags: ['wheel', 'pie', 'icons', 'segments', 'dark'],
  },
  {
    id: 'infographic-12',
    file: '/assets/infographics/infographic-12.png',
    label: 'Five-step circular timeline',
    tags: ['timeline', 'steps', 'icons', 'light'],
  },
  {
    id: 'infographic-13',
    file: '/assets/infographics/infographic-13.png',
    label: 'Five-band fanned comparison',
    tags: ['comparison', 'fan', 'bands', 'light'],
  },
  {
    id: 'infographic-14',
    file: '/assets/infographics/infographic-14.png',
    label: 'Six-card grid',
    tags: ['grid', 'cards', 'list', 'dark'],
  },
  {
    id: 'infographic-15',
    file: '/assets/infographics/infographic-15.png',
    label: 'Six-icon badge grid',
    tags: ['grid', 'cards', 'icons', 'dark'],
  },
  {
    id: 'infographic-16',
    file: '/assets/infographics/infographic-16.png',
    label: 'Six-node hub mind map',
    tags: ['hub', 'mindmap', 'branches', 'light'],
  },
  {
    id: 'infographic-17',
    file: '/assets/infographics/infographic-17.png',
    label: 'Hub with six pill branches and grid',
    tags: ['hub', 'branches', 'grid', 'light'],
  },
  {
    id: 'infographic-18',
    file: '/assets/infographics/infographic-18.png',
    label: 'Seven-item two-column banner list',
    tags: ['list', 'banners', 'timeline', 'light'],
  },
  {
    id: 'infographic-19',
    file: '/assets/infographics/infographic-19.png',
    label: 'Four-step weaving arrow timeline',
    tags: ['timeline', 'arrows', 'weaving', 'light'],
  },
  {
    id: 'infographic-20',
    file: '/assets/infographics/infographic-20.png',
    label: 'Four-step zigzag timeline',
    tags: ['timeline', 'process', 'arrows', 'light'],
  },
  {
    id: 'infographic-21',
    file: '/assets/infographics/infographic-21.png',
    label: 'Winding milestone path',
    tags: ['timeline', 'path', 'milestones', 'light'],
  },
  {
    id: 'infographic-22',
    file: '/assets/infographics/infographic-22.png',
    label: 'Hexagon hub with banner arrows',
    tags: ['hub', 'hexagon', 'banners', 'light'],
  },
];
