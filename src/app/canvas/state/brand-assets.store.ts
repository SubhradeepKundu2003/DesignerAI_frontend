import { Injectable, computed, inject, signal } from '@angular/core';

import { LocalStorageService } from '../../core/services/local-storage.service';
import { ImageUploadService } from '../services/image-upload.service';

export type BrandLogoSlot = 'tcsBlack' | 'tcsWhite' | 'tataBlack' | 'tataWhite';

export interface BrandLogoAsset {
  readonly src: string;
  /** width / height, computed once (at upload or on the default) so every
   * downstream consumer (`utils/branding.util.ts`) can size a logo without
   * an async image load. */
  readonly aspectRatio: number;
}

export type BrandAssets = Record<BrandLogoSlot, BrandLogoAsset>;

const STORAGE_KEY = 'designerai.brandAssets';

/** Simple text wordmarks shipped as placeholders until real logo files are
 * uploaded — see `public/assets/logos/`. Aspect ratios match each SVG's own
 * `viewBox` exactly, so the default already renders at its true proportions. */
const DEFAULT_ASSETS: BrandAssets = {
  tcsBlack: { src: '/assets/logos/tcs-black.svg', aspectRatio: 200 / 64 },
  tcsWhite: { src: '/assets/logos/tcs-white.svg', aspectRatio: 200 / 64 },
  tataBlack: { src: '/assets/logos/tata-black.svg', aspectRatio: 220 / 64 },
  tataWhite: { src: '/assets/logos/tata-white.svg', aspectRatio: 220 / 64 },
};

/**
 * The four brand logo slots TCS/TATA branded mode draws from (`utils/branding.util.ts`).
 *
 * App-level, not per-project: these are the same four files regardless of
 * which newsletter is open, so — unlike a page's own image assets, which
 * live on the backend keyed by project — they persist to `localStorage`
 * rather than going through `ProjectApiService`.
 */
@Injectable({ providedIn: 'root' })
export class BrandAssetsStore {
  private readonly storage = inject(LocalStorageService);
  private readonly imageUploads = inject(ImageUploadService);

  private readonly state = signal<BrandAssets>(this.storage.get<BrandAssets>(STORAGE_KEY) ?? { ...DEFAULT_ASSETS });

  readonly assets = this.state.asReadonly();
  readonly tcsBlack = computed(() => this.state().tcsBlack);
  readonly tcsWhite = computed(() => this.state().tcsWhite);
  readonly tataBlack = computed(() => this.state().tataBlack);
  readonly tataWhite = computed(() => this.state().tataWhite);

  async upload(slot: BrandLogoSlot, file: File): Promise<void> {
    const { src, natural } = await this.imageUploads.load(file);
    if (natural.width <= 0 || natural.height <= 0) {
      return;
    }
    this.patch(slot, { src, aspectRatio: natural.width / natural.height });
  }

  reset(slot: BrandLogoSlot): void {
    this.patch(slot, DEFAULT_ASSETS[slot]);
  }

  private patch(slot: BrandLogoSlot, asset: BrandLogoAsset): void {
    const next = { ...this.state(), [slot]: asset };
    this.state.set(next);
    this.storage.set(STORAGE_KEY, next);
  }
}
