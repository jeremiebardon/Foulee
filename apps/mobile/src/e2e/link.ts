/**
 * The e2e reset link, `foulee://e2e?seed=demo&signedIn=true`: Maestro flows open it to start
 * from a known state. Pure, so the gating is unit-tested; ./startup applies the state.
 */
export type E2ESeed = 'empty' | 'demo';
export type E2EState = { seed: E2ESeed; signedIn: boolean };

const SEEDS: readonly E2ESeed[] = ['empty', 'demo'];

// Optional scheme and slashes, then the `e2e` path, then an optional query.
const E2E_LINK = /^(?:[a-z][a-z0-9+.-]*:)?\/*e2e\/?(?:\?(.*))?$/i;

/**
 * The state an e2e link asks for, or null when it is not one or this is not an e2e build
 * (`enabled`, from appConfig().e2e). Expo Router may hand over a full URL or just a path.
 */
export function e2eStateFromLink(url: string | null | undefined, enabled: boolean): E2EState | null {
  if (!enabled || !url) return null;
  const match = E2E_LINK.exec(url);
  if (!match) return null;
  const params = new Map(
    (match[1] ?? '')
      .split('&')
      .filter(Boolean)
      .map((pair): [string, string] => {
        const [key, value = ''] = pair.split('=').map(decodeURIComponent);
        return [key, value];
      }),
  );
  const seed = params.get('seed') ?? 'empty';
  if (!SEEDS.includes(seed as E2ESeed)) throw new Error(`Unknown e2e seed "${seed}": use ${SEEDS.join(' or ')}.`);
  return { seed: seed as E2ESeed, signedIn: params.get('signedIn') === 'true' };
}
