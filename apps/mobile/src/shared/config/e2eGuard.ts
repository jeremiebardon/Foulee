/**
 * Keeps e2e builds out of the stores and out of over-the-air updates. An e2e build honours the
 * reset link (src/e2e), which wipes the database and signs in with the mock, so EXPO_PUBLIC_E2E
 * must never reach a `production` (or `development`) build. Pure: app.config.ts calls it with
 * the build's environment, so it runs on every config evaluation, the EAS build workers' included
 * (they set EAS_BUILD_PROFILE). `eas update` runs outside any build profile; the release workflow
 * (.eas/workflows/release.yml) evaluates the config as the `production` profile before it updates.
 * Local builds and the fingerprint job have no build profile and are left alone.
 */
const E2E_PROFILE = 'e2e';

export function assertE2EOnlyInE2EProfile({ e2e, buildProfile }: { e2e: string | undefined; buildProfile: string | undefined }): void {
  if (e2e === 'true' && buildProfile && buildProfile !== E2E_PROFILE) {
    throw new Error(`EXPO_PUBLIC_E2E=true is only allowed in the ${E2E_PROFILE} build profile, not "${buildProfile}".`);
  }
}
