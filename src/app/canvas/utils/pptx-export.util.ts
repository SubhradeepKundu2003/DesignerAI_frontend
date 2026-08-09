import type PptxGenJS from 'pptxgenjs';

import {
  CanvasElement,
  DividerElement,
  IconElement,
  ImageElement,
  ShapeElement,
  TextElement,
  isDividerElement,
  isFrameElement,
  isIconElement,
  isImageElement,
  isShapeElement,
  isTextElement,
} from '../models/canvas-element.model';
import { Page } from '../models/canvas-document.model';
import { rasterizeIcon } from '../renderers/icon-rasterize.util';

/** The page model's own dpi (see `Page.width`/`height` doc comment) — pptxgenjs works in inches. */
const PX_PER_INCH = 96;
/** 1px @ 96dpi = 0.75pt, for font sizes (canvas: px, pptxgenjs: pt). */
const PX_TO_PT = 0.75;

const LAYOUT_NAME = 'DESIGNERAI_EXPORT';

/** Mirrors `ThumbnailSnapshotService`'s image-load guard: a slow/broken picture skips rather than hangs the export. */
const IMAGE_LOAD_TIMEOUT_MS = 4000;

function inches(px: number): number {
  return px / PX_PER_INCH;
}

function points(px: number): number {
  return px * PX_TO_PT;
}

/** `'#4f46e5'` -> `'4F46E5'`. Anything that isn't a 6-digit hex is dropped rather than sent to pptxgenjs malformed. */
function toPptxColor(css: string | undefined): string | undefined {
  if (!css) {
    return undefined;
  }
  const hex = css.startsWith('#') ? css.slice(1) : css;
  return /^[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : undefined;
}

/**
 * Builds a `.pptx` presentation from `pages`, one slide per page, as native
 * editable shapes rather than a raster of the canvas (see Track F's plan:
 * pptxgenjs's API maps close to 1:1 onto `CanvasElement`, so this is
 * materially better than rasterizing for this one format).
 *
 * Frames are flattened: only a frame's children are emitted, at the absolute
 * `x`/`y` `CanvasStore.layoutFrame` already resolved into them — the frame's
 * own box never becomes a pptx shape, matching the plan's "frame itself
 * doesn't need to exist in the output." Group members need no special
 * handling at all: they are already ordinary `page.elements` entries.
 *
 * v1 limitation: pptxgenjs defines one slide size per presentation, so mixed
 * page sizes in one document all render at the first page's dimensions.
 *
 * `pptxgenjs` is loaded dynamically: it's sizeable and only ever needed once
 * the user actually exports, so it ships as its own lazy chunk rather than
 * inflating the app's initial bundle for a feature most page loads never use.
 */
export async function buildPptx(pages: readonly Page[]): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages to export.');
  }

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: LAYOUT_NAME, width: inches(pages[0].width), height: inches(pages[0].height) });
  pptx.layout = LAYOUT_NAME;

  for (const page of pages) {
    const slide = pptx.addSlide();
    const background = toPptxColor(page.background);
    if (background) {
      slide.background = { color: background };
    }

    for (const element of page.elements) {
      if (!element.visible || isFrameElement(element)) {
        continue;
      }
      await addElement(slide, element);
    }
  }

  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

async function addElement(slide: PptxGenJS.Slide, element: CanvasElement): Promise<void> {
  if (isTextElement(element)) {
    addText(slide, element);
  } else if (isShapeElement(element)) {
    addShape(slide, element);
  } else if (isDividerElement(element)) {
    addDivider(slide, element);
  } else if (isImageElement(element)) {
    await addImage(slide, element);
  } else if (isIconElement(element)) {
    addIcon(slide, element);
  }
}

function addText(slide: PptxGenJS.Slide, element: TextElement): void {
  slide.addText(element.text, {
    x: inches(element.x),
    y: inches(element.y),
    w: inches(element.width),
    h: inches(element.height),
    rotate: element.rotation,
    fontFace: element.fontFamily,
    fontSize: points(element.fontSize),
    color: toPptxColor(element.fill) ?? '000000',
    bold: element.fontStyle.includes('bold'),
    italic: element.fontStyle.includes('italic'),
    align: element.align,
    valign: 'top',
    charSpacing: element.letterSpacing,
    lineSpacingMultiple: element.lineHeight,
    wrap: true,
    margin: 0,
  });
}

function addShape(slide: PptxGenJS.Slide, element: ShapeElement): void {
  const isCircle = element.shape === 'circle';
  const minSide = Math.min(element.width, element.height);
  // pptxgenjs's rectRadius is a 0..1 ratio, not a px radius — approximate against half the shorter side.
  const rectRadius =
    !isCircle && element.cornerRadius > 0 && minSide > 0
      ? Math.min(element.cornerRadius / (minSide / 2), 1)
      : 0;

  slide.addShape(isCircle ? 'ellipse' : rectRadius > 0 ? 'roundRect' : 'rect', {
    x: inches(element.x),
    y: inches(element.y),
    w: inches(element.width),
    h: inches(element.height),
    rotate: element.rotation,
    rectRadius: rectRadius || undefined,
    fill: { color: toPptxColor(element.fill) ?? 'FFFFFF' },
    line:
      element.strokeWidth > 0
        ? { color: toPptxColor(element.stroke) ?? '000000', width: points(element.strokeWidth) }
        : { type: 'none' },
  });
}

function addDivider(slide: PptxGenJS.Slide, element: DividerElement): void {
  slide.addShape('line', {
    x: inches(element.x),
    y: inches(element.y + element.height / 2),
    w: inches(element.width),
    h: 0,
    rotate: element.rotation,
    line: {
      color: toPptxColor(element.stroke) ?? '000000',
      width: points(element.strokeWidth),
      dashType: element.dash.length > 0 ? 'dash' : 'solid',
    },
  });
}

/**
 * Rasterizes `element.src` through a canvas before handing it to pptxgenjs,
 * regardless of its original encoding — a plain base64 PNG/JPEG, a
 * non-base64 `;utf8,` SVG data URL (how today's baked template icons are
 * stored, see `infographic-template.model.ts`), a `blob:` URL from a `.dzn`
 * import, or a remote path. pptxgenjs's `data` option only reliably accepts
 * base64 raster data, so anything else would otherwise silently drop from
 * the exported deck. Resolves `undefined` for an image that fails to decode
 * within {@link IMAGE_LOAD_TIMEOUT_MS} rather than failing the whole export.
 */
function rasterizeImageSrc(src: string, width: number, height: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(undefined);
      return;
    }
    const timer = setTimeout(() => resolve(undefined), IMAGE_LOAD_TIMEOUT_MS);
    const image = new Image();
    image.onload = () => {
      clearTimeout(timer);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(Math.round(width), 1);
      canvas.height = Math.max(Math.round(height), 1);
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(undefined);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        // A cross-origin image without CORS headers taints the canvas — skip it.
        resolve(undefined);
      }
    };
    // A broken/unreachable image is skipped rather than failing the whole export.
    image.onerror = () => {
      clearTimeout(timer);
      resolve(undefined);
    };
    image.src = src;
  });
}

async function addImage(slide: PptxGenJS.Slide, element: ImageElement): Promise<void> {
  const data = await rasterizeImageSrc(element.src, element.width, element.height);
  if (!data) {
    return;
  }
  slide.addImage({
    data,
    x: inches(element.x),
    y: inches(element.y),
    w: inches(element.width),
    h: inches(element.height),
    rotate: element.rotation,
  });
}

function addIcon(slide: PptxGenJS.Slide, element: IconElement): void {
  slide.addImage({
    data: rasterizeIcon(element),
    x: inches(element.x),
    y: inches(element.y),
    w: inches(element.width),
    h: inches(element.height),
    rotate: element.rotation,
  });
}
