import { Injectable } from '@angular/core';

/**
 * Thin JSON wrapper around `window.localStorage`.
 *
 * The only place in the app that touches the browser API directly, so a full
 * quota, disabled storage (private browsing) or corrupted JSON degrades to
 * "nothing persists" instead of an unhandled exception reaching a command.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up if storage is already unreachable.
    }
  }
}
