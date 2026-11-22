// Public entry point of the auth feature.
export * from './auth';
export { AuthProvider, saveSession, useAuth } from './AuthProvider';
export { LoginScreen } from './LoginScreen';
// The mock gateway is not exported: callers get the build's gateway, the mock only when dev features
// are on (development and e2e builds).
export { authGateway } from './gateway';
