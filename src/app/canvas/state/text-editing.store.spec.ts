import { TestBed } from '@angular/core/testing';

import { TextEditingStore } from './text-editing.store';

describe('TextEditingStore', () => {
  let store: TextEditingStore;

  beforeEach(() => {
    store = TestBed.inject(TextEditingStore);
  });

  it('should start with nothing being edited', () => {
    expect(store.editingId()).toBeNull();
  });

  it('should track the element begin was called with', () => {
    store.begin('text-1');
    expect(store.editingId()).toBe('text-1');
  });

  it('should clear on end', () => {
    store.begin('text-1');
    store.end();
    expect(store.editingId()).toBeNull();
  });
});
