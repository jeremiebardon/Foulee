import { appConfig } from '@/shared/config/appConfig';
import type { AuthGateway } from './auth';
import { mockAuthGateway } from './mockAuthGateway';

const unavailable = () => Promise.reject(new Error('No auth provider is configured for this variant.'));

/** Until a real provider exists, store builds keep the port but have no way in: no dev shortcut. */
const noAuthGateway: AuthGateway = { requestCode: unavailable, verifyCode: unavailable };

/** The gateway for this build: the mock sign-in exists only when dev features are on (development and e2e). */
export const authGateway = (): AuthGateway => (appConfig().devFeatures ? mockAuthGateway : noAuthGateway);
