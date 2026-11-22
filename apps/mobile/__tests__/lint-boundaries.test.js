// Proves the feature-boundary and test-location lint rules (eslint.config.js, #15) still bite:
// each case lints a deliberate violation (or an allowed import) at a virtual path.
// Runs as part of `pnpm lint` through `node --test`, outside the app's test runner.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { lintMessages } = require('./lint-messages');

const boundaryErrors = (filePath, code) => lintMessages('no-restricted-imports', filePath, code);

const fails = async (filePath, code) =>
  assert.notDeepEqual(await boundaryErrors(filePath, code), [], `${filePath} should fail: ${code}`);
const passes = async (filePath, code) => assert.deepEqual(await boundaryErrors(filePath, code), []);

test('a feature imports another feature through its entry point, never its internals', async () => {
  await passes('src/features/plans/PlanPicker.tsx', "import { useWorkouts } from '@/features/workouts';");
  await passes('src/features/plans/plan.ts', "import { workoutTotals } from '@/features/workouts/domain';");
  await fails('src/features/plans/plan.ts', "import { workoutTotals } from '@/features/workouts/workout';");
  await fails('src/features/plans/PlanPicker.tsx', "import { useWorkouts } from '../workouts/workout.repository';");
});

test("a feature's tests import its files from one level up, never another feature's", async () => {
  await passes('src/features/plans/__tests__/plan.test.ts', "import { planEnd } from '../plan';");
  await fails('src/features/plans/__tests__/plan.test.ts', "import { workoutTotals } from '../../workouts/workout';");
  await fails('src/features/plans/__tests__/plan.test.ts', "import { workoutTotals } from '@/features/workouts/workout';");
});

test('test files live in a __tests__ folder', async () => {
  const locationErrors = (filePath) => lintMessages('no-restricted-syntax', filePath, 'export {};');
  assert.notDeepEqual(await locationErrors('src/features/plans/plan.test.ts'), []);
  assert.notDeepEqual(await locationErrors('src/shared/ui/kit.test.tsx'), []);
  assert.notDeepEqual(await locationErrors('app-config.test.js'), []);
  assert.deepEqual(await locationErrors('src/features/plans/__tests__/plan.test.ts'), []);
  assert.deepEqual(await locationErrors('__tests__/app-config.test.js'), []);
});

test('route files and the database layer import features through their entry points', async () => {
  await passes('src/app/(tabs)/calendar.tsx', "export { CalendarScreen as default } from '@/features/calendar';");
  await fails('src/app/(tabs)/calendar.tsx', "export { CalendarScreen as default } from '@/features/calendar/CalendarScreen';");
  await fails('src/db/seed.ts', "import { sessionDate } from '@/features/plans/plan';");
});

test('domain files stay pure: no React, React Native or database', async () => {
  for (const specifier of ['react', 'react-native', '@/db/client', 'expo-sqlite', 'drizzle-orm']) {
    await fails('src/features/workouts/workout.ts', `import x from '${specifier}';`);
  }
  // index.ts re-exports screens, so domain files use the pure `domain` entry point instead.
  await fails('src/features/plans/plan.ts', "import { workoutTotals } from '@/features/workouts';");
  await passes('src/features/workouts/workout.repository.ts', "import { db } from '@/db/client';");
  await passes('src/features/workouts/WorkoutSummary.tsx', "import { View } from 'react-native';");
});

test('dependencies point one way: workouts <- plans <- calendar, dashboard', async () => {
  await passes('src/features/calendar/CalendarScreen.tsx', "import { PlanPicker } from '@/features/plans';");
  await passes('src/features/dashboard/DashboardScreen.tsx', "import { WorkoutSummary } from '@/features/workouts';");
  await fails('src/features/workouts/workout.ts', "import { planEnd } from '@/features/plans/domain';");
  await fails('src/features/workouts/WorkoutListScreen.tsx', "import { PlanPicker } from '@/features/plans';");
  await fails('src/features/plans/plan.ts', "import { computeStats } from '@/features/dashboard';");
  await fails('src/features/plans/PlanPicker.tsx', "import { LogRunSheet } from '@/features/calendar';");
  await fails('src/features/calendar/CalendarScreen.tsx', "import { computeStats } from '@/features/dashboard';");
  await fails('src/features/workouts/WorkoutListScreen.tsx', "import { useAuth } from '@/features/auth';");
});

test('app code reads its environment only through the config accessor', async () => {
  const envErrors = (filePath, code) => lintMessages('no-restricted-properties', filePath, code);
  const read = 'export const dev = process.env.EXPO_PUBLIC_APP_VARIANT;';
  assert.notDeepEqual(await envErrors('src/features/dashboard/DashboardScreen.tsx', read), []);
  assert.notDeepEqual(await envErrors('src/db/client.ts', read), []);
  assert.deepEqual(await envErrors('src/shared/config/appConfig.ts', read), []);
  assert.deepEqual(await envErrors('src/features/auth/__tests__/LoginScreen.test.tsx', read), []);
});

test('shared code imports no feature', async () => {
  await fails('src/shared/ui/kit.tsx', "import { useAuth } from '@/features/auth';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '@/features/workouts/workout';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '../../features/workouts';");
});
