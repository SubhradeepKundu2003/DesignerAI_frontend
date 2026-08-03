import { Injectable } from '@angular/core';

import { Size } from '../models/geometry.model';

export interface UploadedImage {
  /** Data URL — this phase has no backend to host the file on. */
  readonly src: string;
  /** Pixel size of the source image, before any fit-to-page scaling. */
  readonly natural: Size;
}

/**
 * Turns a picked file into what the editor needs to place it: a data URL and
 * the image's natural size, so `ElementFactory.createImage` can scale it to
 * fit the page without ever guessing at its proportions.
 */
@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  async load(file: File): Promise<UploadedImage> {
    const src = await readAsDataUrl(file);
    const natural = await probeSize(src);
    return { src, natural };
  }

  /** Same result as {@link load}, for a URL that already exists (e.g. an asset). */
  async loadFromUrl(src: string): Promise<UploadedImage> {
    const natural = await probeSize(src);
    return { src, natural };
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function probeSize(src: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Could not read the image dimensions.'));
    image.src = src;
  });
}
