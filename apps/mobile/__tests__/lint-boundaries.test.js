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
  await passes('src/features/plans/components/PlanPicker.tsx', "import { useWorkouts } from '@/features/workouts';");
  await passes('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts/domain';");
  await fails('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts/domain/workout';");
  await fails('src/features/plans/components/PlanPicker.tsx', "import { useWorkouts } from '@/features/workouts/data/workout.repository';");
  await fails('src/features/plans/components/PlanPicker.tsx', "import { useWorkouts } from '../../workouts/data/workout.repository';");
});

test("a feature's tests import its files from one level up, never another feature's", async () => {
  await passes('src/features/plans/domain/__tests__/plan.test.ts', "import { planEnd } from '../plan';");
  await fails('src/features/plans/domain/__tests__/plan.test.ts', "import { workoutTotals } from '../../../workouts/domain/workout';");
  await fails('src/features/plans/domain/__tests__/plan.test.ts', "import { workoutTotals } from '@/features/workouts/domain/workout';");
});

test('inside a feature, folders import only the folders before them', async () => {
  await passes('src/features/garmin/screens/ActivityImportScreen.tsx', "import { ActivityCard } from '../components/ActivityCard';");
  await passes('src/features/garmin/hooks/useLinking.ts', "import { linkActivity } from '../data/activity.repository';");
  await passes('src/features/garmin/data/activity.repository.ts', "import type { Activity } from '../domain/activity';");
  await fails('src/features/garmin/domain/link.ts', "import { linkActivity } from '../data/activity.repository';");
  await fails('src/features/garmin/data/bff.api.ts', "import { useLinking } from '../hooks/useLinking';");
  await fails('src/features/garmin/hooks/useLinking.ts', "import { ActivityCard } from '../components/ActivityCard';");
  await fails('src/features/garmin/components/ActivityCard.tsx', "import { SettingsScreen } from '../screens/SettingsScreen';");
});

test('no relative import leaves the feature, at any depth', async () => {
  await fails('src/features/plans/screens/PlanListScreen.tsx', "import { useWorkouts } from '../../workouts';");
  await fails('src/features/plans/domain/__tests__/plan.test.ts', "import { workoutTotals } from '../../../workouts/domain';");
  await passes('src/features/plans/domain/__tests__/plan.test.ts', "import { planEnd } from '../plan';");
  await passes('src/features/plans/screens/__tests__/PlanListScreen.test.tsx', "import { givenData } from '@/test/fakeRepositories';");
  await fails('src/features/plans/index.ts', "import { useWorkouts } from '../workouts';");
});

test('test files live in a __tests__ folder', async () => {
  const locationErrors = (filePath) => lintMessages('no-restricted-syntax', filePath, 'export {};');
  assert.notDeepEqual(await locationErrors('src/features/plans/domain/plan.test.ts'), []);
  assert.notDeepEqual(await locationErrors('src/shared/ui/kit.test.tsx'), []);
  assert.notDeepEqual(await locationErrors('app-config.test.js'), []);
  assert.deepEqual(await locationErrors('src/features/plans/domain/__tests__/plan.test.ts'), []);
  assert.deepEqual(await locationErrors('__tests__/app-config.test.js'), []);
});

test('route files and the database layer import features through their entry points', async () => {
  await passes('src/app/(tabs)/calendar.tsx', "export { CalendarScreen as default } from '@/features/calendar';");
  await fails('src/app/(tabs)/calendar.tsx', "export { CalendarScreen as default } from '@/features/calendar/screens/CalendarScreen';");
  await fails('src/db/seed.ts', "import { sessionDate } from '@/features/plans/domain/plan';");
});

test('files outside the role folders keep the feature checks', async () => {
  await fails('src/features/workouts/Foo.tsx', "import { PlanPicker } from '@/features/plans';");
  await fails('src/features/workouts/utils/x.ts', "import { PlanPicker } from '@/features/plans';");
  await fails('src/features/workouts/__tests__/x.test.ts', "import { PlanPicker } from '@/features/plans';");
  await fails('src/features/workouts/utils/x.ts', "import { planEnd } from '@/features/plans/plan';");
  await fails('src/features/workouts/__tests__/x.test.ts', "import { planEnd } from '../../plans/domain';");
  await passes('src/features/workouts/__tests__/x.test.ts', "import { totals } from '../domain/workout';");
  // A file at the root, other than index.ts, is linted as a domain file: pure, and no way out of the feature.
  await fails('src/features/workouts/workout2.ts', "import x from 'react';");
  await fails('src/features/workouts/Foo.tsx', "import { View } from 'react-native';");
  await fails('src/features/workouts/workout2.ts', "import { planEnd } from '../plans/domain';");
  await passes('src/features/workouts/index.ts', "export { Foo } from './screens/Foo';");
});

test('domain folders stay pure', async () => {
  for (const specifier of ['react', 'react-native', '@/db/client', 'expo-sqlite', 'drizzle-orm', 'expo-secure-store']) {
    await fails('src/features/workouts/domain/workout.ts', `import x from '${specifier}';`);
  }
  // index.ts re-exports screens, so domain files use the pure `domain` entry point instead.
  await fails('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts';");
  await passes('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts/domain';");
  await passes('src/features/workouts/data/workout.repository.ts', "import { db } from '@/db/client';");
  await passes('src/features/workouts/components/WorkoutSummary.tsx', "import { View } from 'react-native';");
});

test('domain files reach nothing outside the app; data reaches it through the services, hooks use React', async () => {
  const globalErrors = (filePath, code) => lintMessages('no-restricted-globals', filePath, code);
  const callsNetwork = "export const get = () => fetch('/v1/activities');";
  await fails('src/features/garmin/domain/activity.ts', "import * as SecureStore from 'expo-secure-store';");
  assert.notDeepEqual(await globalErrors('src/features/garmin/domain/activity.ts', callsNetwork), []);
  // The data folder talks to what lies outside the app: the database, and the BFF and the secure store through the services.
  assert.notDeepEqual(await globalErrors('src/features/garmin/data/bff.api.ts', callsNetwork), []);
  await fails('src/features/garmin/data/bffAccess.store.ts', "import * as SecureStore from 'expo-secure-store';");
  await passes('src/features/garmin/data/bffAccess.store.ts', "import { services } from '@/shared/services';");
  await passes('src/features/garmin/data/bffAccess.store.ts', "import { useSyncExternalStore } from 'react';");
  // A hook module composes React hooks over the data folder, with no JSX.
  await passes('src/features/garmin/hooks/useLinking.ts', "import { useMemo } from 'react';");
  await fails('src/features/garmin/hooks/useLinking.ts', "import { PlanPicker } from '@/features/plans/components/PlanPicker';");
});

test('only service adapters reach the service libraries', async () => {
  const globalErrors = (filePath, code) => lintMessages('no-restricted-globals', filePath, code);
  const secure = "import * as SecureStore from 'expo-secure-store';";
  const kv = "import Storage from 'expo-sqlite/kv-store';";
  const callsFetch = "export const get = () => fetch('/v1/activities');";
  const usesXhr = 'export const get = () => new XMLHttpRequest();';
  const propertyErrors = (filePath, code) => lintMessages('no-restricted-properties', filePath, code);
  const viaGlobalObject = [
    "export const get = () => globalThis.fetch('/v1/activities');",
    "export const get = () => window.fetch('/v1/activities');",
    "export const get = () => self.fetch('/v1/activities');",
    'export const get = () => new globalThis.XMLHttpRequest();',
  ];

  // Every kind of file in a feature, and the rest of the app, reaches the libraries only through the services.
  const everyone = [
    'src/features/garmin/domain/activity.ts',
    'src/features/garmin/data/bffAccess.store.ts',
    'src/features/auth/data/session.store.ts',
    'src/features/garmin/hooks/useGarminImport.ts',
    'src/features/auth/components/AuthProvider.tsx',
    'src/features/garmin/screens/SettingsScreen.tsx',
    'src/features/garmin/index.ts',
    'src/features/garmin/domain/index.ts',
    'src/features/garmin/activity2.ts',
    'src/features/garmin/utils/x.ts',
    'src/shared/lib/format.ts',
    'src/shared/ui/kit.tsx',
    'src/shared/config/appConfig.ts',
    'src/app/(tabs)/settings.tsx',
    'src/db/client.ts',
  ];
  for (const filePath of everyone) {
    await fails(filePath, secure);
    await fails(filePath, kv);
    assert.notDeepEqual(await globalErrors(filePath, callsFetch), [], `${filePath} should not call fetch`);
    assert.notDeepEqual(await globalErrors(filePath, usesXhr), [], `${filePath} should not use XMLHttpRequest`);
  }
  // Reaching the network through the global object is no way round: it fails too, wherever a bare call does.
  for (const filePath of everyone) {
    for (const code of viaGlobalObject) assert.notDeepEqual(await propertyErrors(filePath, code), [], `${filePath} should fail: ${code}`);
  }
  // ... and the environment stays behind appConfig() in those same files.
  const readsEnv = 'export const url = process.env.EXPO_PUBLIC_BFF_URL;';
  for (const filePath of everyone.filter((p) => p !== 'src/shared/config/appConfig.ts')) {
    assert.notDeepEqual(await propertyErrors(filePath, readsEnv), [], `${filePath} should not read process.env`);
  }
  assert.deepEqual(await propertyErrors('src/shared/config/appConfig.ts', readsEnv), []);
  assert.notDeepEqual(await propertyErrors('src/shared/config/appConfig.ts', viaGlobalObject[0]), []);

  // Only the service adapters import them, and only they call the network.
  await passes('src/shared/services/secureStore/expoSecureStore.ts', secure);
  await passes('src/shared/services/kvStore/expoKvStore.ts', kv);
  assert.deepEqual(await globalErrors('src/shared/services/http/fetchHttpClient.ts', callsFetch), []);
  for (const code of viaGlobalObject) {
    assert.deepEqual(await propertyErrors('src/shared/services/http/fetchHttpClient.ts', code), []);
    assert.deepEqual(await propertyErrors('src/e2e/bffStub.ts', code), []);
  }
  // The exempt code still reads the environment through appConfig() only, as before.
  assert.notDeepEqual(await propertyErrors('src/e2e/bffStub.ts', readsEnv), []);
  assert.notDeepEqual(await propertyErrors('src/shared/services/http/fetchHttpClient.ts', readsEnv), []);
  // The adapters stay shared code: no feature.
  await fails('src/shared/services/http/fetchHttpClient.ts', "import { useAuth } from '@/features/auth';");
  await fails('src/shared/services/kvStore/expoKvStore.ts', "import { useAuth } from '@/features/auth';");

  // Exempt: the e2e wiring (it patches fetch and seeds the stores), the dev tools, and test code.
  assert.deepEqual(await globalErrors('src/e2e/bffStub.ts', callsFetch), []);
  await passes('src/e2e/startup.ts', secure);
  await passes('src/e2e/startup.ts', kv);
  await passes('src/devtools/useDevTools.ts', kv);
  assert.deepEqual(await globalErrors('src/devtools/useDevTools.ts', callsFetch), []);
  await passes('src/test/memorySecureStore.ts', secure);
  assert.deepEqual(await globalErrors('src/test/fakeServices.ts', callsFetch), []);
  const tests = [
    'src/features/garmin/data/__tests__/bffAccess.store.test.ts',
    'src/features/garmin/screens/__tests__/SettingsScreen.test.tsx',
    'src/features/workouts/__tests__/x.test.ts',
    'src/shared/ui/__tests__/kit.test.tsx',
    'src/shared/services/http/__tests__/fetchHttpClient.test.ts',
    'src/e2e/__tests__/startup.test.tsx',
  ];
  for (const filePath of tests) {
    await passes(filePath, secure);
    await passes(filePath, kv);
    assert.deepEqual(await globalErrors(filePath, callsFetch), [], `${filePath} may call fetch`);
    for (const code of viaGlobalObject) assert.deepEqual(await propertyErrors(filePath, code), [], `${filePath} may call ${code}`);
  }

  // The rest of each file's restrictions stay: no other feature's internals, no way out of the feature.
  await fails('src/features/garmin/data/bffAccess.store.ts', "import { x } from '@/features/plans/data/plan.repository';");
  await fails('src/features/garmin/hooks/useGarminImport.ts', "import { ActivityCard } from '../components/ActivityCard';");
  await fails('src/shared/lib/format.ts', "import { useAuth } from '@/features/auth';");
  await fails('src/features/workouts/__tests__/x.test.ts', "import { PlanPicker } from '@/features/plans';");
  // Other libraries are not the services' concern: the data folder still reaches the database.
  await passes('src/features/plans/data/plan.repository.ts', "import { openDatabaseSync } from 'expo-sqlite';");
});

test('dependencies point one way: workouts <- plans <- garmin <- calendar, dashboard', async () => {
  await passes('src/features/calendar/screens/CalendarScreen.tsx', "import { PlanPicker } from '@/features/plans';");
  await passes('src/features/dashboard/screens/DashboardScreen.tsx', "import { WorkoutSummary } from '@/features/workouts';");
  await passes('src/features/garmin/screens/ActivityImportScreen.tsx', "import { PlanPicker } from '@/features/plans';");
  await passes('src/features/garmin/domain/activity.ts', "import { sessionDate } from '@/features/plans/domain';");
  await passes('src/features/garmin/domain/activity.ts', "import { workoutTotals } from '@/features/workouts/domain';");
  await passes('src/features/dashboard/screens/DashboardScreen.tsx', "import { GarminImportLink } from '@/features/garmin';");
  await passes('src/features/calendar/screens/CalendarScreen.tsx', "import { activityDate } from '@/features/garmin/domain';");
  await fails('src/features/plans/domain/plan.ts', "import { activityDate } from '@/features/garmin/domain';");
  await fails('src/features/workouts/screens/WorkoutListScreen.tsx', "import { GarminImportLink } from '@/features/garmin';");
  await fails('src/features/garmin/screens/ActivityImportScreen.tsx', "import { computeStats } from '@/features/dashboard';");
  await fails('src/features/garmin/screens/ActivityImportScreen.tsx', "import { LogRunSheet } from '@/features/calendar';");
  await fails('src/features/workouts/domain/workout.ts', "import { planEnd } from '@/features/plans/domain';");
  await fails('src/features/workouts/screens/WorkoutListScreen.tsx', "import { PlanPicker } from '@/features/plans';");
  await fails('src/features/plans/domain/plan.ts', "import { computeStats } from '@/features/dashboard';");
  await fails('src/features/plans/components/PlanPicker.tsx', "import { LogRunSheet } from '@/features/calendar';");
  await fails('src/features/calendar/screens/CalendarScreen.tsx', "import { computeStats } from '@/features/dashboard';");
  await fails('src/features/workouts/screens/WorkoutListScreen.tsx', "import { useAuth } from '@/features/auth';");
});

test('app code reads its environment only through the config accessor', async () => {
  const envErrors = (filePath, code) => lintMessages('no-restricted-properties', filePath, code);
  const read = 'export const dev = process.env.EXPO_PUBLIC_APP_VARIANT;';
  assert.notDeepEqual(await envErrors('src/features/dashboard/screens/DashboardScreen.tsx', read), []);
  assert.notDeepEqual(await envErrors('src/db/client.ts', read), []);
  assert.deepEqual(await envErrors('src/shared/config/appConfig.ts', read), []);
  assert.deepEqual(await envErrors('src/features/auth/screens/__tests__/LoginScreen.test.tsx', read), []);
});

test('shared code imports no feature', async () => {
  await fails('src/shared/ui/kit.tsx', "import { useAuth } from '@/features/auth';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '@/features/workouts/workout';");
  await fails('src/shared/lib/format.ts', "import { workoutTotals } from '../../features/workouts';");
});
