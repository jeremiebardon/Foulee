import { Stack } from 'expo-router';
import { Suspense, use } from 'react';
import { ActivityIndicator } from 'react-native';
import { databaseReady } from '@/db/client';
import { e2eReady } from '@/e2e/startup';
import { AuthProvider, authGateway, useAuth } from '@/features/auth';
import { headerOptions } from '@/shared/ui/kit';

// A failed database open or migration lands in Expo Router's error screen, with a retry.
export { ErrorBoundary } from 'expo-router';

// Rozenite and Drizzle Studio, development only. Metro inlines `__DEV__` as false in production
// bundles and drops this branch with its require, so none of their code ships.
const useDevTools: () => void = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would always be bundled
    require('@/devtools/useDevTools').useDevTools
  : () => {};

/** Composition root: wait for the database, then auth (adapter chosen here), then routes. */
export default function RootLayout() {
  return (
    <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
      <App />
    </Suspense>
  );
}

function App() {
  use(databaseReady);
  // E2E builds only: the reset link the app was launched with, applied before auth reads the session.
  use(e2eReady);
  useDevTools();
  return (
    <AuthProvider gateway={authGateway()}>
      <Routes />
    </AuthProvider>
  );
}

function Routes() {
  const signedIn = !!useAuth().session;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ ...headerOptions, headerShown: true, title: 'Réglages' }} />
        <Stack.Screen name="garmin" options={{ ...headerOptions, headerShown: true, title: 'Activités Garmin' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
