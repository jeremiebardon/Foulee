// Public entry point of the auth feature.
export * from './auth';
export { AuthProvider, saveSession, useAuth } from './AuthProvider';
export { LoginScreen } from './LoginScreen';
// The mock gateway is not exported: callers get the variant's gateway, mock only in development.
export { authGateway } from './gateway';
