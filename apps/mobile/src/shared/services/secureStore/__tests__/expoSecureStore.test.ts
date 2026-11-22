import { failNextWrite } from '@/test/memorySecureStore';
import { expoSecureStore } from '../expoSecureStore';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

describe('expoSecureStore', () => {
  it('reads back what it stored', () => {
    expoSecureStore.set('k', 'v');

    expect(expoSecureStore.get('k')).toBe('v');
  });

  it('forgets a deleted key', async () => {
    expoSecureStore.set('k', 'v');

    await expoSecureStore.delete('k');

    expect(expoSecureStore.get('k')).toBeNull();
  });

  it('throws when the phone cannot store the value', () => {
    failNextWrite();

    expect(() => expoSecureStore.set('k', 'v')).toThrow('could not be stored');
  });
});
