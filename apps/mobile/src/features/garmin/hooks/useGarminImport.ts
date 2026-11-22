import { useMemo, useSyncExternalStore } from 'react';
import { appConfig } from '@/shared/config/appConfig';
import { readBffToken, subscribeBffToken } from '../data/bffAccess.store';
import { bffAccessOf } from '../domain/bffAccess';

/** The BFF URL and the saved token, and the access they make together (`null`: no Garmin import). */
export function useGarminImport() {
  const token = useSyncExternalStore(subscribeBffToken, readBffToken);
  const { bffUrl } = appConfig();
  // One object per URL and token, so a screen can depend on it.
  const access = useMemo(() => bffAccessOf({ bffUrl, token }), [bffUrl, token]);
  return { bffUrl, token, access };
}
