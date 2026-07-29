import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    localStorage.clear();
    service = new LocalStorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should round-trip a value through JSON', () => {
    expect(service.set('key', { a: 1 })).toBe(true);
    expect(service.get<{ a: number }>('key')).toEqual({ a: 1 });
    expect(service.has('key')).toBe(true);
  });

  it('should return null for a missing key', () => {
    expect(service.get('missing')).toBeNull();
    expect(service.has('missing')).toBe(false);
  });

  it('should return null instead of throwing when the stored value is not valid JSON', () => {
    localStorage.setItem('corrupt', '{not json');
    expect(service.get('corrupt')).toBeNull();
  });

  it('should remove a stored value', () => {
    service.set('key', 'value');
    service.remove('key');
    expect(service.has('key')).toBe(false);
  });

  it('should report a failed write instead of throwing when storage rejects it', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(service.set('key', 'value')).toBe(false);

    setItem.mockRestore();
  });
});
