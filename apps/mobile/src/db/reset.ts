import type { E2ESeed } from '@/e2e/link';
import { db } from './client';
import { plans, sessions, workouts } from './schema';
import { seedDemo } from './seed';

/** E2E builds only (src/e2e/startup.ts): wipes every table, then loads the requested seed. */
export function resetDatabase(seed: E2ESeed) {
  db.transaction((tx) => {
    tx.delete(sessions).run();
    tx.delete(plans).run();
    tx.delete(workouts).run();
  });
  if (seed === 'demo') seedDemo();
}
