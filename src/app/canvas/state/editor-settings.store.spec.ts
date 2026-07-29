import { TestBed } from '@angular/core/testing';

import { EditorSettingsStore } from './editor-settings.store';

describe('EditorSettingsStore', () => {
  let service: EditorSettingsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditorSettingsStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
