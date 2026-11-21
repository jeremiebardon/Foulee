// Proves the feature-boundary lint rules in eslint.config.js (#15) still bite:
// each case lints a deliberate violation (or an allowed import) at a virtual path.
// Runs as part of `pnpm lint` through `node --test`, outside the app's test runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: path.join(__dirname, '..') });

async function boundaryErrors(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
}

const fails = async (filePath, code) =>
  assert.notDeepEqual(await boundaryErrors(filePath, code), [], `${filePath} should fail: ${code}`);
const passes = async (filePath, code) => assert.deepEqual(await boundaryErrors(filePath, code), []);

test('a feature imports another feature through its entry point, never its internals', async () => {
  await passes('src/features/plans/PlanPicker.tsx', "import { useWorkouts } from '@/features/workouts';");
  await passes('src/features/plans/plan.ts', "import { workoutTotals } from '@/features/workouts/domain';");
  await fails('src/features/plans/plan.ts', "import { workoutTotals } from '@/features/workouts/workout';");
  await fails('src/features/plans/PlanPicker.tsx', "import { useWorkouts } from '../workouts/workout.repository';");
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

test('shared code imports no feature', async () => {
  await fails('src/shared/ui/kit.tsx', "import { useAuth } from '@/features/auth';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '@/features/workouts/workout';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '../../features/workouts';");
});
