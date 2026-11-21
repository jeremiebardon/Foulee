import { e2eStateFromLink } from '@/e2e/link';
import { appConfig } from '@/shared/config/appConfig';

/**
 * Expo Router hook for incoming links. In e2e builds the reset link is applied at startup
 * (src/e2e/startup.ts) and then opens the home screen; every other link, and the reset link in
 * every other build, goes to the router unchanged.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return e2eStateFromLink(path, appConfig().e2e) ? '/' : path;
  } catch {
    // An unknown seed: startup fails loudly on it, the router just opens the home screen.
    return '/';
  }
}
