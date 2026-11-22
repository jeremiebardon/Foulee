import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { readSession, saveSession } from '../data/session.store';
import type { AuthGateway, AuthSession } from '../domain/auth';

type Auth = { gateway: AuthGateway; session: AuthSession | null; signIn(s: AuthSession): void; signOut(): void };
const AuthContext = createContext<Auth | null>(null);

/** The gateway is injected by the composition root (src/app/_layout.tsx). */
export function AuthProvider({ gateway, children }: PropsWithChildren<{ gateway: AuthGateway }>) {
  // Read synchronously so the first render already knows where to route.
  const [session, setSession] = useState<AuthSession | null>(readSession);
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
