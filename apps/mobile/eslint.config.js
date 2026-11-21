const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('@foulee/eslint-config/expo');

/*
 * Feature boundaries (#15). Each folder in src/features is a feature with a flat layout
 * (domain, repository, screens) and a public entry point, its index.ts. A feature whose
 * domain other features' domain code needs also has domain.ts, a pure entry point: index.ts
 * re-exports screens, so importing it would drag React and the database into domain code.
 * The rules:
 * - outside a feature, import it only through an entry point (`@/features/plans`,
 *   `@/features/plans/domain`); domain files use only the domain entry point;
 * - inside a feature, import its own files relatively (`./plan`); `../` would leave it;
 * - dependencies point one way: workouts <- plans <- calendar, dashboard (FEATURE_DEPS);
 * - domain files (the feature's plain .ts files, except repositories and index.ts)
 *   import no React, React Native or database code;
 * - shared code imports no feature.
 * Route files in src/app are not exempt: they re-export screens from the entry points.
 * Checked against deliberate violations by scripts/check-lint-boundaries.js.
 */

// The features each feature may import. A feature missing here fails the lint run.
const FEATURE_DEPS = {
  workouts: [],
  plans: ['workouts'],
  calendar: ['plans', 'workouts'],
  dashboard: ['plans', 'workouts'],
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
const parentImport = {
  regex: '^\\.\\./',
  message: "'../' leaves this feature: import other features through their entry point, e.g. '@/features/plans'.",
};
const impureDomainImport = {
  regex: '^(react|react-native|expo-sqlite|drizzle-orm)(/|$)|^@/db(/|$)',
  message: 'Domain files stay pure: no React, React Native or database. Use a screen or a repository.',
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

// Later config objects replace earlier options for the same rule, so each block lists every pattern it needs.
const featureBlocks = Object.entries(FEATURE_DEPS).flatMap(([feature, allowed]) => {
  const forbidden = Object.keys(FEATURE_DEPS).filter((other) => !allowed.includes(other));
  const reversed = {
    regex: `^@/features/(${forbidden.join('|')})(/domain)?$`,
    message: `${feature} may import ${allowed.length ? `only ${allowed.join(', ')}` : 'no other feature'} (workouts <- plans <- calendar, dashboard); its own files are imported relatively.`,
  };
  return [
    { files: [`src/features/${feature}/**`], rules: restrict(deepImport, parentImport, reversed) },
    {
      files: [`src/features/${feature}/*.ts`],
      ignores: ['**/*.repository.ts', '**/index.ts'],
      rules: restrict(deepImport, parentImport, reversed, impureDomainImport, fullEntryFromDomain),
    },
  ];
});

module.exports = defineConfig([
  expoConfig,
  { ignores: ['src/db/migrations/*'] },
  { files: ['src/**'], rules: restrict(deepImport) },
  ...featureBlocks,
  { files: ['src/shared/**'], rules: restrict(anyFeature) },
]);
