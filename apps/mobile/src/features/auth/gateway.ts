import { appConfig } from '@/shared/config/appConfig';
import type { AuthGateway } from './auth';
import { mockAuthGateway } from './mockAuthGateway';

const unavailable = () => Promise.reject(new Error('No auth provider is configured for this variant.'));

/** Until a real provider exists, production keeps the port but has no way in: no dev shortcut. */
const noAuthGateway: AuthGateway = { requestCode: unavailable, verifyCode: unavailable };

/** The gateway for this variant: the mock sign-in exists only when dev features are on. */
export const authGateway = (): AuthGateway => (appConfig().devFeatures ? mockAuthGateway : noAuthGateway);
