# Mobile Feature Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split each `apps/mobile` feature into role folders, enforced by lint, and move HTTP, secure storage and key-value storage behind swappable service adapters.

**Architecture:** Features get `domain/ data/ hooks/ components/ screens/` with a one-way folder order, checked by `eslint.config.js`. `src/shared/services/` holds one interface and one adapter per service, wired once in `src/shared/services/index.ts` as `services`. Repositories stay the database seam; nothing changes in behaviour.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, Drizzle (expo-sqlite), Jest + RNTL (jest-expo), ESLint flat config, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-11-22-mobile-feature-layout-design.md`

## Global Constraints

- Starts only after PR #24 (`feat/01-garmin-import-bff`) is merged into `main`; branch `refactor/25-mobile-feature-layout` from an up-to-date `main`, where `<NN>` is the GitHub issue created in Task 0.
- pnpm only. No new dependencies.
- `pnpm turbo run lint typecheck test` passes at every commit (docs/agents/branching.md). Conventional Commits, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Mobile coverage stays at 100% on every metric. The only coverage exclusion that changes is `!**/*.repository.ts` → `!src/features/*/data/*.repository.ts`.
- No behaviour change: same routes in `src/app/`, same screens, same stored keys (`garmin.bffAccessToken`, `auth.session`).
- No lint rule loosened: domain purity, `FEATURE_DEPS`, entry-point-only imports, shared code importing no feature, env only through `appConfig()`, no coverage-ignore comments.
- Tests keep checking the same behaviour; only checks tied to `fetch` move to the fetch adapter's tests.
- Every test file sits in a `__tests__` folder next to the code it tests (AGENTS.md).
- Changes under `apps/mobile` need a changeset: add an empty one (`.changeset/*.md` with only `---\n---`), since nothing ships that users notice.

## Review Focus

1. **The phone invalidated the stored BFF Access Token** (a restored backup): reading it throws, and the app must treat it as no token (import hidden), not crash. Test in Task 4.
2. **The e2e BFF stub replaces `globalThis.fetch` after `services` was created**: the fetch adapter must use the replaced `fetch`. Test in Task 2.
3. **The BFF answers with a non-JSON body** (a proxy's HTML error page): the response body is `null` and the import shows the generic failure, not a crash. Tests in Task 2 and Task 4.
4. **A request that succeeds before the timeout** must not leave a timer running, and one that times out must surface as a network failure. Test in Task 2.
5. **A saved session is read synchronously on the first render**, so a signed-in runner never sees the login screen flash. Test in Task 4.

---

### Task 0: Issue, branch, design doc

**Files:**
- Create: `docs/superpowers/specs/2026-11-22-mobile-feature-layout-design.md` (already written, untracked in the main checkout)
- Create: `docs/superpowers/plans/2026-11-22-mobile-feature-layout.md` (this file)

- [ ] **Step 1:** Confirm PR #24 is merged: `gh pr view 24 --json state --jq .state` prints `MERGED`. If not, stop.
- [ ] **Step 2:** Create the issue: `gh issue create --title "Mobile feature layout by role, with swappable services" --label ready-for-agent --body "<goal, link to the design doc path, the three commit groups>"`. Note its number `<NN>`.
- [ ] **Step 3:** `git switch main && git pull --ff-only && git switch -c refactor/25-mobile-feature-layout`.
- [ ] **Step 4:** Commit the design doc and this plan: `docs: design and plan for the mobile feature layout`.

### Task 1: Role folders and their lint rules (one commit)

**Files:**
- Modify: `apps/mobile/eslint.config.js`
- Modify: `apps/mobile/__tests__/lint-boundaries.test.js`
- Modify: `apps/mobile/jest.config.js` (the `*.repository.ts` exclusion)
- Move: every file under `apps/mobile/src/features/*` per the table below, with `git mv`, its test into the role folder's `__tests__/`
- Modify: every `jest.mock('@/features/<f>/<file>', …)` path in tests, `src/test/fakeRepositories.ts` comment, each feature's `index.ts`
- Delete: each `src/features/<f>/domain.ts`, replaced by `src/features/<f>/domain/index.ts`

| Feature | domain/ | data/ | hooks/ | components/ | screens/ |
|---|---|---|---|---|---|
| workouts | workout.ts | workout.repository.ts | | WorkoutSummary.tsx | WorkoutDetailScreen, WorkoutEditorScreen, WorkoutListScreen |
| plans | plan.ts | plan.repository.ts | | PlanPicker.tsx, SessionRow.tsx | PlanDetailScreen, PlanEditorScreen, PlanListScreen |
| garmin | activity.ts, link.ts, bffAccess.ts | activity.repository.ts, bff.client.ts → bff.api.ts, bffAccess.client.ts → bffAccess.store.ts | useLinking.ts | ActivityCard.tsx, GarminImportLink.tsx | ActivityImportScreen, SettingsScreen |
| calendar | | | | LogRunSheet.tsx | CalendarScreen |
| dashboard | stats.ts | | | | DashboardScreen |
| auth | auth.ts | gateway.ts, mockAuthGateway.ts | | AuthProvider.tsx | LoginScreen |

`bffAccess.store.ts` keeps `useGarminImport` in this task (it moves to `hooks/` in Task 4). `saveSession` stays in `AuthProvider.tsx` until Task 4.

**Interfaces:**
- Produces: import paths `@/features/<f>` (from `index.ts`) and `@/features/<f>/domain` (from `domain/index.ts`), unchanged for callers outside the feature.
- Produces: role order `domain < data < hooks < components < screens`, used by later tasks' new files.

- [ ] **Step 1: Write the failing lint self-tests.** In `lint-boundaries.test.js`, move every existing case to the new paths (for example `src/features/plans/plan.ts` → `src/features/plans/domain/plan.ts`, `src/features/garmin/bff.client.ts` → `src/features/garmin/data/bff.api.ts`) and add:

```js
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

test('domain folders stay pure', async () => {
  for (const specifier of ['react', 'react-native', '@/db/client', 'expo-sqlite', 'drizzle-orm', 'expo-secure-store']) {
    await fails('src/features/workouts/domain/workout.ts', `import x from '${specifier}';`);
  }
  await fails('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts';");
  await passes('src/features/plans/domain/plan.ts', "import { workoutTotals } from '@/features/workouts/domain';");
});
```

- [ ] **Step 2:** Run `pnpm --filter mobile lint`. Expected: FAIL (the new paths match none of today's per-path blocks, and `../components/` is flagged by `parentImport`).
- [ ] **Step 3: Rewrite the feature blocks in `eslint.config.js`.** Per feature, generate one block per role folder (`src/features/<f>/<role>/**`, ignoring `**/__tests__/**`) whose `no-restricted-imports` patterns include `deepImport`, the feature's `forbiddenFeatures`, a "leaves the feature" pattern `^\.\./\.\./`, and a "later folder" pattern `^\.\./(<roles after this one>)/` (none for `screens`). `domain/**` also gets `impureDomainImport`, `fullEntryFromDomain` and `noNetworkInDomain`. Tests (`src/features/<f>/<role>/__tests__/**`) get the same with `^\.\./\.\./\.\./` and `^\.\./\.\./(<later roles>)/`. The feature root (`src/features/<f>/*.ts`, i.e. `index.ts`) gets `^\.\./`. Delete `parentImport`, `testParentImport` and the `*.repository.ts / *.client.ts / use*.ts` ignore list. Update the comment block at the top to describe roles instead of suffixes. Keep every other block as it is.
- [ ] **Step 4:** Move the files with `git mv` per the table, create each `domain/index.ts` with today's `domain.ts` exports (paths adjusted), fix relative imports, and update each `index.ts`. Rename `bff.client.ts` → `bff.api.ts` and `bffAccess.client.ts` → `bffAccess.store.ts` (and their tests). Update `jest.mock` paths in tests, such as `'@/features/plans/plan.repository'` → `'@/features/plans/data/plan.repository'`.
- [ ] **Step 5:** In `jest.config.js`, replace `'!**/*.repository.ts'` with `'!src/features/*/data/*.repository.ts'` and update its comment.
- [ ] **Step 6:** Run `pnpm turbo run lint typecheck test --filter mobile --force`. Expected: PASS, mobile coverage 100%, same test count as before the move (242 on PR #24's tip; check `main` before starting).
- [ ] **Step 7:** Add the empty changeset and commit: `refactor(mobile): organise features by role, enforced by lint`.

### Task 2: HTTP client interface and fetch adapter

**Files:**
- Create: `apps/mobile/src/shared/services/http/HttpClient.ts`
- Create: `apps/mobile/src/shared/services/http/fetchHttpClient.ts`
- Test: `apps/mobile/src/shared/services/http/__tests__/fetchHttpClient.test.ts`

**Interfaces:**
- Produces:

```ts
// HttpClient.ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type HttpRequest = { method: HttpMethod; url: string; headers?: Record<string, string>; body?: unknown; timeoutMs?: number };
/** `body` is the parsed JSON, or `null` when the response has none or it isn't JSON. */
export type HttpResponse = { status: number; ok: boolean; body: unknown };
/** The request never got a response: offline, DNS, refused, or past `timeoutMs`. */
export class HttpNetworkError extends Error {}
export interface HttpClient { request(request: HttpRequest): Promise<HttpResponse> }

// fetchHttpClient.ts
export const fetchHttpClient = (): HttpClient
```

- [ ] **Step 1: Write the failing tests** (stub `globalThis.fetch` with `jest.fn()`, fake timers where noted):
  - `sends the method, URL and headers, and JSON-encodes a body`: a `POST` with `body: { a: 1 }` calls `fetch(url, expect.objectContaining({ method: 'POST', body: '{"a":1}', headers: expect.objectContaining({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }) }))`.
  - `returns status, ok and the parsed JSON body`: `{ status: 200, ok: true, body: { x: 1 } }`.
  - `returns a null body when the response is not JSON`: `json()` rejects → `body: null`, `status: 502`.
  - `turns a fetch rejection into HttpNetworkError`.
  - `aborts past timeoutMs and reports HttpNetworkError`: fake timers, `timeoutMs: 20_000`, fetch never resolves until its signal aborts; advance 20 000 ms → rejects with `HttpNetworkError`.
  - `leaves no timer behind once a response arrives`: after a resolved request, `jest.getTimerCount()` is `0`.
  - `uses the fetch in place at call time`: create the client, then assign a new `globalThis.fetch`; the request goes to the new one.
- [ ] **Step 2:** Run `pnpm --filter mobile test -- fetchHttpClient`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `HttpClient.ts` and `fetchHttpClient.ts`. Read `globalThis.fetch` inside `request`. Use an `AbortController` with `setTimeout` when `timeoutMs` is set, and clear it in `finally`. Set `Content-Type: application/json` only when `body` is given.
- [ ] **Step 4:** Run the same command. Expected: PASS; coverage of both files 100%.
- [ ] **Step 5:** Commit: `feat(mobile): an HttpClient interface with a fetch adapter`.

### Task 3: Store interfaces, expo adapters, composition root, fakes

**Files:**
- Create: `apps/mobile/src/shared/services/secureStore/SecureStore.ts`, `.../secureStore/expoSecureStore.ts`
- Create: `apps/mobile/src/shared/services/kvStore/KvStore.ts`, `.../kvStore/expoKvStore.ts`
- Create: `apps/mobile/src/shared/services/index.ts`
- Create: `apps/mobile/src/test/fakeServices.ts`
- Test: `apps/mobile/src/shared/services/secureStore/__tests__/expoSecureStore.test.ts`, `.../kvStore/__tests__/expoKvStore.test.ts`, `apps/mobile/src/shared/services/__tests__/services.test.ts`

**Interfaces:**
- Consumes: `HttpClient`, `fetchHttpClient` (Task 2).
- Produces:

```ts
// SecureStore.ts
export interface SecureStore {
  get(key: string): string | null;        // may throw when the OS invalidated the entry
  set(key: string, value: string): void;  // throws when the phone cannot store it
  delete(key: string): Promise<void>;
}
// KvStore.ts: synchronous, so a first render can read it
export interface KvStore { get(key: string): string | null; set(key: string, value: string): void; delete(key: string): void }
// expoSecureStore.ts / expoKvStore.ts
export const expoSecureStore: SecureStore;
export const expoKvStore: KvStore;
// index.ts
export type Services = { http: HttpClient; secureStore: SecureStore; kvStore: KvStore };
export const services: Services; // { http: fetchHttpClient(), secureStore: expoSecureStore, kvStore: expoKvStore }
// src/test/fakeServices.ts: wired with
//   jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());
export const fakeServicesModule: () => { services: Services };
export const givenHttpResponse: (response: HttpResponse | HttpNetworkError) => void; // next http.request resolves/rejects with it
export const lastHttpRequest: () => HttpRequest | undefined;
export const failNextSecureRead: () => void;   // next secureStore.get throws
export const failNextSecureWrite: () => void;  // next secureStore.set throws
export const resetFakeServices: () => void;    // empties both stores and the http queue
```

- [ ] **Step 1: Write the failing tests.**
  - `expoSecureStore` (with `jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'))`): `set` then `get` returns the value; `delete` then `get` is `null`; `set` after `failNextWrite()` throws.
  - `expoKvStore` (with the `memoryKvStore` mock): `set`, `get`, `delete` round-trip; `get` of a missing key is `null`.
  - `services`: `services.secureStore` is `expoSecureStore`, `services.kvStore` is `expoKvStore`, and `services.http.request` is a function.
- [ ] **Step 2:** Run `pnpm --filter mobile test -- services`. Expected: FAIL (modules not found).
- [ ] **Step 3:** Implement the interfaces, the two adapters (thin calls to `SecureStore.getItem / setItem / deleteItemAsync` and `Storage.getItemSync / setItemSync / removeItemSync`), `index.ts` and `src/test/fakeServices.ts`.
- [ ] **Step 4:** Run the same command. Expected: PASS; coverage 100%.
- [ ] **Step 5:** Commit: `feat(mobile): secure and key-value store adapters behind one services module`.

### Task 4: Features use the services; only adapters reach the libraries

**Files:**
- Modify: `apps/mobile/src/features/garmin/data/bff.api.ts` (use `services.http`)
- Modify: `apps/mobile/src/features/garmin/data/bffAccess.store.ts` (use `services.secureStore`; keep `storedToken`, `saveBffToken`, `forgetBffToken`)
- Create: `apps/mobile/src/features/garmin/hooks/useGarminImport.ts` (moved out of `bffAccess.store.ts`)
- Create: `apps/mobile/src/features/auth/data/session.store.ts` (`saveSession`, `readSession`, using `services.kvStore`)
- Modify: `apps/mobile/src/features/auth/components/AuthProvider.tsx` (read and write through `session.store.ts`)
- Modify: `apps/mobile/src/features/garmin/index.ts`, `apps/mobile/src/features/auth/index.ts`
- Modify: `apps/mobile/eslint.config.js`, `apps/mobile/__tests__/lint-boundaries.test.js`
- Test: `garmin/data/__tests__/bff.api.test.ts`, `garmin/data/__tests__/bffAccess.store.test.ts`, `garmin/hooks/__tests__/useGarminImport.test.ts`, `auth/data/__tests__/session.store.test.ts`; feature screen tests that mock `expo-secure-store` or `expo-sqlite/kv-store` switch to `fakeServicesModule()`

**Interfaces:**
- Consumes: `services`, `HttpNetworkError`, the fakes (Tasks 2–3).
- Produces: `fetchActivitiesSince(access: BffAccess, since: string | null): Promise<ActivitiesPage>` (unchanged signature); `useGarminImport(): { bffUrl: string | null; token: string | null; access: BffAccess | null }` (unchanged); `saveSession(s: AuthSession | null): void`, `readSession(): AuthSession | null`. `src/e2e` keeps importing `saveSession` and `saveBffToken` from the feature entry points.

- [ ] **Step 1: Write the failing tests.**
  - `bff.api.test.ts`, rewritten onto `fakeServicesModule()`: `lastHttpRequest()` equals `{ method: 'GET', url: 'https://bff.test/v1/activities?since=c1', headers: { Accept: 'application/json', Authorization: 'Bearer tok' }, timeoutMs: 20_000 }`; a `givenHttpResponse(new HttpNetworkError())` rejects with `BffError` reason `'network'`; `{ status: 401, ok: false, body: { code: 'unauthorized', … } }` → `'unauthorized'`; the same with `garmin_access_expired`; `{ status: 502, ok: false, body: null }` → `'unexpected'`; a 200 with a body that breaks the contract → `'unexpected'`. Keep today's success-mapping cases.
  - `bffAccess.store.test.ts`: after `failNextSecureRead()`, `useGarminImport()` (rendered with `renderHook`) returns `token: null, access: null`; `saveBffToken` after `failNextSecureWrite()` throws and leaves the token unchanged.
  - `session.store.test.ts`: `saveSession(s)` then `readSession()` returns `s`; `saveSession(null)` then `readSession()` is `null`.
  - `AuthProvider.test.tsx`: with a session saved through the fake `kvStore` before rendering, the first render already has `session` set, so no login screen flash.
  - `lint-boundaries.test.js`, new case `only service adapters reach the service libraries`: `expo-secure-store` import fails in `src/features/garmin/data/bffAccess.store.ts` and passes in `src/shared/services/secureStore/expoSecureStore.ts`; `expo-sqlite/kv-store` fails in `src/features/auth/data/session.store.ts` and passes in `src/shared/services/kvStore/expoKvStore.ts`; calling `fetch` fails in `src/features/garmin/data/bff.api.ts` and passes in `src/shared/services/http/fetchHttpClient.ts` and `src/e2e/bffStub.ts`.
- [ ] **Step 2:** Run `pnpm --filter mobile test` and `pnpm --filter mobile lint`. Expected: FAIL on the new cases.
- [ ] **Step 3:** Switch `bff.api.ts`, `bffAccess.store.ts` and `AuthProvider.tsx` to the services, keeping `BffError`, `ImportFailure` and the failure mapping as they are. Move `useGarminImport` into `hooks/`. Then add a `serviceLibraries` pattern (`^expo-secure-store$|^expo-sqlite/kv-store$`) to every `restrict(...)` call that covers `src/**`, except the blocks for `src/shared/services/**`, `src/e2e/**`, `src/devtools/**`, `src/test/**` and `**/__tests__/**`. Each block must list every pattern it needs, because later blocks replace earlier ones. Restrict the `fetch`/`XMLHttpRequest` globals the same way.
- [ ] **Step 4:** Switch the remaining feature tests that mock `expo-secure-store` or `expo-sqlite/kv-store` to `fakeServicesModule()`, replacing `setItem`/`failNextWrite`/`Storage.clearSync()` with the fake's helpers. Leave `src/e2e/__tests__/startup.test.tsx` as it is: it runs the real adapters over the mocked expo modules.
- [ ] **Step 5:** Run `pnpm turbo run lint typecheck test --force`. Expected: PASS, coverage 100%.
- [ ] **Step 6:** Commit: `refactor(mobile): features reach HTTP and storage through service adapters`.

### Task 5: Docs

**Files:**
- Create: `docs/adr/0008-mobile-feature-layout-by-role.md`
- Modify: `docs/adr/0003-test-layers.md` (repository path `src/features/*/data/*.repository.ts`)
- Modify: `AGENTS.md` (Tests example becomes `src/features/plans/domain/__tests__/plan.test.ts` tests `src/features/plans/domain/plan.ts`; new short "Mobile layout" section pointing at ADR 0008)

- [ ] **Step 1:** Write ADR 0008 in the style of 0004–0007. Cover: the decision (role folders and their order; services behind interfaces wired in `src/shared/services/index.ts`; repositories as the database seam), the rejected options (BFF-style layers, type-only folders, a React provider, a generic database service) and the consequences (lint enforces the order; a library swap is a new adapter plus one line).
- [ ] **Step 2:** Update ADR 0003 and AGENTS.md as listed.
- [ ] **Step 3:** Run `pnpm turbo run lint typecheck test`. Expected: PASS.
- [ ] **Step 4:** Commit: `docs: record the mobile feature layout (ADR 0008)`.

### Task 6: Open the PR

- [ ] **Step 1:** `git push -u origin refactor/25-mobile-feature-layout`.
- [ ] **Step 2:** Open the PR to `main` with `Closes #25` (body per the `mattpocock-skills:pr` skill; note that Maestro flows were not run locally if no emulator is available).
