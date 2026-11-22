/** Where the BFF is and the BFF Access Token to call it with: what every Garmin import needs. */
export type BffAccess = { bffUrl: string; token: string };

/**
 * Access to the BFF, once the build points at one and the runner has saved its BFF Access Token;
 * `null` while either is missing, and the Garmin import does not show.
 */
export const bffAccessOf = ({ bffUrl, token }: { bffUrl: string | null; token: string | null }): BffAccess | null =>
  bffUrl && token ? { bffUrl, token } : null;
