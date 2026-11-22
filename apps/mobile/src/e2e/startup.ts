import { Linking } from 'react-native';
import { databaseReady } from '@/db/client';
import { resetDatabase } from '@/db/reset';
import { saveSession } from '@/features/auth';
import { saveBffToken } from '@/features/garmin';
import { appConfig } from '@/shared/config/appConfig';
import { installBffStub } from './bffStub';
import { e2eStateFromLink } from './link';

/**
 * In an e2e build (`enabled`), applies the e2e reset link the app was launched with: wipes and
 * seeds the database, then stores or clears the session, and with `bff=stub` sets up the Garmin
 * import against the in-app BFF stub. Any other build never reads the link.
 */
export async function applyLaunchLink(enabled: boolean): Promise<void> {
  if (!enabled) return;
  const state = e2eStateFromLink(await Linking.getInitialURL(), true);
  if (!state) return;
  await databaseReady;
  resetDatabase(state.seed);
  saveSession(state.signedIn ? { email: 'e2e@foulee.test', signedInAt: Date.now() } : null);
  const { bffUrl } = appConfig();
  if (state.bff === 'stub' && bffUrl) {
    installBffStub(bffUrl);
    // The stub accepts any token; the import only shows once one is saved.
    saveBffToken('e2e-bff-token');
  }
}

/**
 * Awaited by the root layout before the auth provider reads the session. Flows clear the app's
 * state and then open the link, so it is always the link that launched the app.
 */
export const e2eReady: Promise<void> = applyLaunchLink(appConfig().e2e);
