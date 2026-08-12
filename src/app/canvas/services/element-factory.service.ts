import { Injectable, inject } from '@angular/core';

import {
  BaseElement,
  CanvasElement,
  DividerElement,
  IconElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  TextElement,
} from '../models/canvas-element.model';
import { PAGE_MARGIN } from '../models/editor-config';
import { Size } from '../models/geometry.model';
import { CanvasStore } from '../state/canvas.store';
import { generateId } from '../utils/id.util';
import { IconName } from '../../shared/icons/icon-registry';

/** What the sidebar's Insert section can create without further input. */
export type InsertKind = 'text' | 'rectangle' | 'circle' | 'divider' | 'icon';

/**
 * Style and size an element starts life with. Kept here rather than in
 * `editor-config` because these are the factory's opinions about a good default
 * newsletter object, not editor-wide constants other code has to agree on.
 */
const DEFAULTS = {
  text: {
    text: 'Add your text',
    fontFamily: 'Inter',
    fontSize: 24,
    fill: '#1c1f24',
    lineHeight: 1.4,
    width: 420,
  },
  shape: {
    fill: '#c7d2fe',
    stroke: '#4f46e5',
    cornerRadius: 8,
    rectangle: { width: 260, height: 160 },
    circle: { width: 200, height: 200 },
  },
  divider: {
    stroke: '#cbcfd6',
    strokeWidth: 2,
  },
  image: {
    /** Largest an uploaded image may be placed at, as a share of the safe area. */
    maxScale: 1,
  },
  icon: {
    iconId: 'star' as IconName,
    size: 48,
  },
} as const;

/** Each new element is nudged this far from the last, so they never hide. */
const CASCADE_STEP = 16;
const CASCADE_LENGTH = 6;

/**
 * Builds ready-to-place elements with sensible defaults.
 *
 * Creating is separate from adding: the factory returns a plain element and the
 * caller wraps it in an `AddElementCommand`. That keeps the only write path to
 * the document going through the command bus.
 */
@Injectable({ providedIn: 'root' })
export class ElementFactory {
  private readonly canvas = inject(CanvasStore);

  create(kind: InsertKind): CanvasElement {
    switch (kind) {
      case 'text':
        return this.createText();
      case 'rectangle':
        return this.createShape('rectangle');
      case 'circle':
        return this.createShape('circle');
      case 'divider':
        return this.createDivider();
      case 'icon':
        return this.createIcon();
    }
  }

  createText(): TextElement {
    const { text, fontFamily, fontSize, fill, lineHeight, width } = DEFAULTS.text;
    const size = {
      width: Math.min(width, this.contentWidth()),
      height: Math.round(fontSize * lineHeight),
    };

    return {
      ...this.base('Text', size),
      type: 'text',
      text,
      fontFamily,
      fontSize,
      fill,
      fontStyle: 'normal',
      align: 'left',
      letterSpacing: 0,
      lineHeight,
    };
  }

  // `semicircle` is programmatic-only for now (templates + page decoration,
  // see `template-kit.ts`'s `halfCircle()`) — no toolbar insert kind for it,
  // so this only ever needs to build the two kinds a user can pick by hand.
  createShape(shape: Extract<ShapeKind, 'rectangle' | 'circle'>): ShapeElement {
    const { fill, stroke, cornerRadius } = DEFAULTS.shape;
    const name = shape === 'circle' ? 'Circle' : 'Rectangle';

    return {
      ...this.base(name, { ...DEFAULTS.shape[shape] }),
      type: 'shape',
      shape,
      fill,
      stroke,
      // Shapes start filled, not outlined; the stroke colour is there for the
      // properties panel to switch on without having to invent one.
      strokeWidth: 0,
      cornerRadius,
    };
  }

  createDivider(): DividerElement {
    const { stroke, strokeWidth } = DEFAULTS.divider;

    return {
      // A divider's box is exactly the rule it draws — there is no second
      // dimension to it, so its height tracks the stroke.
      ...this.base('Divider', { width: this.contentWidth(), height: strokeWidth }),
      type: 'divider',
      stroke,
      strokeWidth,
      dash: [],
    };
  }

  /** New icons pick up the theme's first accent by default, like a template would. */
  createIcon(): IconElement {
    const { iconId, size } = DEFAULTS.icon;
    const accent = this.canvas.theme().colors.accents[0];

    return {
      ...this.base('Icon', { width: size, height: size }),
      type: 'icon',
      iconId,
      fill: accent?.solid ?? '#1c1f24',
      fillRef: accent ? 'accent-0-solid' : undefined,
    };
  }

  /** Places an uploaded image, scaled down to fit the safe area if oversized. */
  createImage(src: string, natural: Size): ImageElement {
    return {
      ...this.base('Image', this.fitToContent(natural)),
      type: 'image',
      src,
    };
  }

  /**
   * Copies `element`: a new id, the next free name for its base ("Text 2"
   * duplicated becomes "Text 3", not "Text 2 1"), and nudged off the original
   * so the copy is never hidden directly underneath it.
   */
  duplicate(element: CanvasElement): CanvasElement {
    const copy = structuredClone(element) as CanvasElement;
    const base = copy.name.replace(/ \d+$/, '');

    if (copy.type === 'frame') {
      // A duplicated frame does not duplicate its children — those were not
      // part of this selection, so cloning `childIds` verbatim would make the
      // copy claim ownership of the *original* frame's children instead of
      // starting empty. `ElementActions.duplicateSelection` has no frame-aware
      // remapping today (unlike its group handling); this is the safe default
      // until it does.
      copy.childIds = [];
    }

    return {
      ...copy,
      id: generateId(),
      name: this.nextName(base),
      x: copy.x + CASCADE_STEP,
      y: copy.y + CASCADE_STEP,
    };
  }

  /** The properties every new element shares: identity, name and placement. */
  private base(baseName: string, size: Size): BaseElement {
    const { width, height } = size;
    return {
      id: generateId(),
      name: this.nextName(baseName),
      ...this.place(size),
      width,
      height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
    };
  }

  /**
   * Centres the element on the page, cascading each addition slightly so a run
   * of identical shapes does not stack into what looks like a single one.
   */
  private place(size: Size): { x: number; y: number } {
    const page = this.canvas.activePage();
    const offset = CASCADE_STEP * (this.canvas.elementCount() % CASCADE_LENGTH);

    return {
      x: Math.round((page.width - size.width) / 2 + offset),
      y: Math.round((page.height - size.height) / 2 + offset),
    };
  }

  /** Scales `natural` down to sit inside the safe area, never up. */
  private fitToContent(natural: Size): Size {
    const page = this.canvas.activePage();
    const available = {
      width: this.contentWidth(),
      height: Math.max(page.height - PAGE_MARGIN * 2, 1),
    };
    const scale = Math.min(
      DEFAULTS.image.maxScale,
      available.width / Math.max(natural.width, 1),
      available.height / Math.max(natural.height, 1),
    );

    return {
      width: Math.round(natural.width * scale),
      height: Math.round(natural.height * scale),
    };
  }

  private contentWidth(): number {
    return Math.max(this.canvas.activePage().width - PAGE_MARGIN * 2, 1);
  }

  /**
   * "Rectangle 3" — the next free number for this kind. Numbering by the
   * highest in use rather than by the count keeps names unique after deletions.
   */
  private nextName(baseName: string): string {
    const pattern = new RegExp(`^${baseName} (\\d+)$`);
    const highest = this.canvas.elements().reduce((max, element) => {
      const match = pattern.exec(element.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return `${baseName} ${highest + 1}`;
  }
}
