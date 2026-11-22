import type { ISODate } from '@/shared/lib/dates';

/**
 * Freezes « today » for screens that read the date. Only `Date` is faked: timers stay real,
 * so React, the router and RNTL's userEvent run as usual. Pair with `jest.useRealTimers()`.
 */
export function freezeToday(iso: ISODate) {
  jest.useFakeTimers({
    now: new Date(`${iso}T12:00:00`),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}
