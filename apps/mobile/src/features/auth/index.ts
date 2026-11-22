// Public entry point of the auth feature.
export * from './domain/auth';
export { AuthProvider, saveSession, useAuth } from './components/AuthProvider';
export { LoginScreen } from './screens/LoginScreen';
// The mock gateway is not exported: callers get the build's gateway, the mock only when dev features
// are on (development and e2e builds).
export { authGateway } from './data/gateway';
