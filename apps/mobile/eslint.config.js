const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('@foulee/eslint-config/expo');

/*
 * Feature boundaries (#15, #25). Each folder in src/features is a feature, split by role into
 * folders, in dependency order, and has a public entry point, its index.ts:
 *   domain/      pure code: types, rules, calculations; its index.ts is a pure entry point, since the
 *                feature's index.ts re-exports screens and importing it would drag React and the
 *                database into other features' domain code
 *   data/        what reaches outside the app: the database (*.repository.ts), the BFF, the secure store
 *   hooks/       React hooks over data, with no JSX
 *   components/  views a feature shares with others, or screens compose
 *   screens/     the screens routes render
 * The rules:
 * - outside a feature, import it only through an entry point (`@/features/plans`,
 *   `@/features/plans/domain`); domain files use only the domain entry point;
 * - inside a feature, a file imports its own folder (`./plan`) and the folders before it in the order
 *   above (`../domain/plan`), never a later one; no relative import leaves the feature, at any depth;
 *   index.ts may import any folder;
 * - dependencies point one way: workouts <- plans <- garmin <- calendar, dashboard (FEATURE_DEPS);
 * - domain files import no React, React Native, Expo module or database code, and call no network;
 * - shared code imports no feature.
 * Route files in src/app are not exempt: they re-export screens from the entry points.
 * Checked against deliberate violations by __tests__/lint-boundaries.test.js.
 */

// The features each feature may import. A feature missing here fails the lint run.
const FEATURE_DEPS = {
  workouts: [],
  plans: ['workouts'],
  garmin: ['plans', 'workouts'],
  calendar: ['garmin', 'plans', 'workouts'],
  dashboard: ['garmin', 'plans', 'workouts'],
  auth: [],
};

const featureDirs = fs
  .readdirSync(path.join(__dirname, 'src/features'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const undeclared = featureDirs.filter((name) => !(name in FEATURE_DEPS));
if (undeclared.length > 0) {
  throw new Error(`Declare the dependencies of src/features/${undeclared.join(', ')} in FEATURE_DEPS (eslint.config.js).`);
}

const deepImport = {
  regex: '^@/features/[^/]+/(?!domain$)',
  message: "Import another feature only through its entry point, e.g. '@/features/plans'.",
};
const impureDomainImport = {
  regex: '^(react|react-native|expo(-[a-z0-9-]+)?|drizzle-orm)(/|$)|^@/db(/|$)',
  message: 'Domain files stay pure: no React, React Native, Expo module or database. Use a screen, a hook or the data folder.',
};
const noNetworkInDomain = {
  'no-restricted-globals': [
    'error',
    { name: 'fetch', message: 'Domain files stay pure: the network goes through the data folder.' },
    { name: 'XMLHttpRequest', message: 'Domain files stay pure: the network goes through the data folder.' },
  ],
};
const fullEntryFromDomain = {
  regex: '^@/features/[^/]+$',
  message: "Domain files import another feature's pure entry point, e.g. '@/features/plans/domain'.",
};
const anyFeature = {
  regex: '(^|/)features(/|$)',
  message: 'Shared code is used by features and imports none of them.',
};

const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

// Folders of a feature, in dependency order: a file imports its own folder and those before it.
const ROLES = ['domain', 'data', 'hooks', 'components', 'screens'];

// Later config objects replace earlier options for the same rule, so each block lists every pattern it needs.
const featureBlocks = Object.entries(FEATURE_DEPS).flatMap(([feature, allowed]) => {
  const forbidden = Object.keys(FEATURE_DEPS).filter((other) => !allowed.includes(other));
  const forbiddenFeatures = {
    regex: `^@/features/(${forbidden.join('|')})(/domain)?$`,
    message: `${feature} may import ${allowed.length ? `only ${allowed.join(', ')}` : 'no other feature'} (workouts <- plans <- garmin <- calendar, dashboard); its own files are imported relatively.`,
  };
  // `../` repeated `levels` times: from a role folder `../` is a sibling folder, `../../` is outside the feature.
  const up = (levels) => `^(\\.\\./){${levels}}`;
  const leavesFeature = (levels) => ({
    regex: up(levels),
    message: "This import leaves the feature: import other features through their entry point, e.g. '@/features/plans'.",
  });
  const laterFolder = (levels, later) => ({
    regex: `${up(levels)}(${later.join('|')})/`,
    message: `Folders of a feature import only the folders before them (${ROLES.join(' < ')}).`,
  });
  return [
    // The feature's own files at its root: index.ts, the entry point, may import any folder.
    {
      files: [`src/features/${feature}/*.ts`],
      rules: restrict(deepImport, forbiddenFeatures, leavesFeature(1)),
    },
    ...ROLES.flatMap((role, index) => {
      const later = ROLES.slice(index + 1);
      // `levels`: how many `../` reach the role folder's parent, i.e. the feature's other folders.
      const own = (levels) => [
        deepImport,
        forbiddenFeatures,
        leavesFeature(levels + 1),
        ...(later.length > 0 ? [laterFolder(levels, later)] : []),
      ];
      const domainOnly = role === 'domain' ? [impureDomainImport, fullEntryFromDomain] : [];
      return [
        {
          files: [`src/features/${feature}/${role}/**`],
          ignores: ['**/__tests__/**'],
          rules: {
            ...restrict(...own(1), ...domainOnly),
            ...(role === 'domain' ? noNetworkInDomain : {}),
          },
        },
        // Tests sit one level down, in the folder's __tests__ folder: `../` stays in the folder.
        { files: [`src/features/${feature}/${role}/__tests__/**`], rules: restrict(...own(2)) },
      ];
    }),
  ];
});

// App variants (#13): app code reads its environment only through the config accessor.
// Tests may set the variable the accessor reads, to switch variants.
const envOnlyThroughAppConfig = {
  files: ['src/**'],
  ignores: ['src/shared/config/appConfig.ts', '**/__tests__/**'],
  rules: {
    'no-restricted-properties': [
      'error',
      { object: 'process', property: 'env', message: "Read variant values through appConfig() from '@/shared/config/appConfig'." },
    ],
  },
};

// Coverage (#17, ADR 0003): jest.config.js enforces 100% and lists every exclusion. A hint that
// opts code out of coverage inline would dodge that list, so every such comment is a lint error.
// Matches what the coverage tools honour: a comment that opens with `<tool> ignore` for
// istanbul (Jest's babel coverage), c8, v8 and node:coverage, with any spacing or JSDoc `*`.
// Checked by __tests__/lint-coverage-ignores.test.js.
const COVERAGE_IGNORE = /^[\s*]*(istanbul|c8|v8|node:coverage)\s+ignore\b/i;
const coveragePlugin = {
  rules: {
    'no-ignore-comments': {
      meta: {
        type: 'problem',
        messages: {
          ignore: 'Coverage-ignore comments are not allowed: test the code, or add a justified exclusion to jest.config.js (ADR 0003).',
        },
        schema: [],
      },
      create: (context) => ({
        Program() {
          for (const comment of context.sourceCode.getAllComments()) {
            if (COVERAGE_IGNORE.test(comment.value)) context.report({ loc: comment.loc, messageId: 'ignore' });
          }
        },
      }),
    },
  },
};

module.exports = defineConfig([
  expoConfig,
  { plugins: { coverage: coveragePlugin }, rules: { 'coverage/no-ignore-comments': 'error' } },
  { ignores: ['src/db/migrations/*'] },
  { files: ['src/**'], rules: restrict(deepImport) },
  ...featureBlocks,
  { files: ['src/shared/**'], rules: restrict(anyFeature) },
  envOnlyThroughAppConfig,
]);
