import { TestBed } from '@angular/core/testing';

import { SnapBox, SnappingService } from './snapping.service';

describe('SnappingService', () => {
  let snapping: SnappingService;

  const page = { width: 800, height: 1000 };
  const margin = 40;
  const box: SnapBox = { x: 100, y: 100, width: 50, height: 50 };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    snapping = TestBed.inject(SnappingService);
  });

  function options(overrides: Partial<Parameters<SnappingService['snap']>[2]> = {}) {
    return {
      page,
      margin,
      gridSize: 20,
      threshold: 6,
      snapToGrid: false,
      snapToGuides: false,
      ...overrides,
    };
  }

  it('should leave the position untouched when both snapping kinds are off', () => {
    const result = snapping.snap({ x: 103, y: 97, width: 50, height: 50 }, [], options());
    expect(result).toEqual({ x: 103, y: 97, guides: { vertical: [], horizontal: [] } });
  });

  it('should snap to the page centre within the threshold', () => {
    const centred = { x: page.width / 2 - box.width / 2 + 3, y: 300, width: 50, height: 50 };
    const result = snapping.snap(centred, [], options({ snapToGuides: true }));

    expect(result.x).toBe(page.width / 2 - box.width / 2);
    expect(result.guides.vertical).toEqual([page.width / 2]);
  });

  it('should snap to the page margin', () => {
    const nearMargin = { x: margin - 2, y: 300, width: 50, height: 50 };
    const result = snapping.snap(nearMargin, [], options({ snapToGuides: true }));

    expect(result.x).toBe(margin);
    expect(result.guides.vertical).toEqual([margin]);
  });

  it('should snap to another element edge and centre', () => {
    const other: SnapBox = { x: 200, y: 400, width: 100, height: 40 };
    const near = { x: 198, y: 420 - box.height / 2 + 2, width: 50, height: 50 };

    const result = snapping.snap(near, [other], options({ snapToGuides: true }));

    expect(result.x).toBe(200);
    expect(result.y).toBe(420 - box.height / 2);
  });

  it('should not snap once the candidate is outside the threshold', () => {
    const far = { x: margin + 30, y: 300, width: 50, height: 50 };
    const result = snapping.snap(far, [], options({ snapToGuides: true }));

    expect(result.x).toBe(far.x);
    expect(result.guides.vertical).toEqual([]);
  });

  it('should round to the grid when no guide is in range', () => {
    const result = snapping.snap({ x: 111, y: 129, width: 50, height: 50 }, [], options({ snapToGrid: true }));

    expect(result.x).toBe(120);
    expect(result.y).toBe(120);
  });

  it('should let a guide win over the grid on the same axis', () => {
    const nearMargin = { x: margin - 1, y: 111, width: 50, height: 50 };
    const result = snapping.snap(
      nearMargin,
      [],
      options({ snapToGrid: true, snapToGuides: true }),
    );

    // x is claimed by the margin guide, not rounded to the grid.
    expect(result.x).toBe(margin);
    expect(result.guides.vertical).toEqual([margin]);
    // y has no guide in range, so it falls back to the grid.
    expect(result.y).toBe(120);
  });

  it('should pick the closest candidate when several are in range', () => {
    const other: SnapBox = { x: 106, y: 300, width: 10, height: 10 };
    // Page left edge (0) and the other element's left edge (106) both sit
    // within threshold of different box edges; 106 is the nearer match.
    const near = { x: 100, y: 400, width: 50, height: 50 };

    const result = snapping.snap(near, [other], options({ snapToGuides: true, threshold: 6 }));

    expect(result.x).toBe(106);
  });
});
