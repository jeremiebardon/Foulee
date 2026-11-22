import { redirectIncomingLink } from '@/e2e/link';
import { appConfig } from '@/shared/config/appConfig';

// Expo Router hook for incoming links. The logic lives, tested, in src/e2e/link.ts.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return redirectIncomingLink(path, appConfig().e2e);
}
