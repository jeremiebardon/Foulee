import { expoKvStore } from '../expoKvStore';

jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));

describe('expoKvStore', () => {
  it('reads back what it stored', () => {
    expoKvStore.set('k', 'v');

    expect(expoKvStore.get('k')).toBe('v');
  });

  it('forgets a deleted key', () => {
    expoKvStore.set('k', 'v');

    expoKvStore.delete('k');

    expect(expoKvStore.get('k')).toBeNull();
  });

  it('returns null for a missing key', () => {
    expect(expoKvStore.get('missing')).toBeNull();
  });
});
