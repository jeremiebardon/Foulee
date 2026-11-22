import Storage from 'expo-sqlite/kv-store';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { AuthGateway, AuthSession } from '../domain/auth';

const KEY = 'auth.session';

type Auth = { gateway: AuthGateway; session: AuthSession | null; signIn(s: AuthSession): void; signOut(): void };
const AuthContext = createContext<Auth | null>(null);

/** Stores the session that the next AuthProvider starts with; the e2e reset link (src/e2e) signs in this way. */
export function saveSession(s: AuthSession | null) {
  if (s) Storage.setItemSync(KEY, JSON.stringify(s));
  else Storage.removeItemSync(KEY);
}

/** The gateway is injected by the composition root (src/app/_layout.tsx). */
export function AuthProvider({ gateway, children }: PropsWithChildren<{ gateway: AuthGateway }>) {
  // Read synchronously so the first render already knows where to route.
  const [session, setSession] = useState<AuthSession | null>(() => JSON.parse(Storage.getItemSync(KEY) ?? 'null'));
  const persist = (s: AuthSession | null) => {
    saveSession(s);
    setSession(s);
  };
  return <AuthContext value={{ gateway, session, signIn: persist, signOut: () => persist(null) }}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
