/** Dependency-injection tokens, shared by the composition root and the layers it wires. */
export const ENV = Symbol('Env');
export const ACTIVITY_SOURCE = Symbol('ActivitySource');
/** The `fetch` outbound adapters call: the global one, or a fake in tests so CI never calls Garmin. */
export const HTTP_FETCH = Symbol('HttpFetch');
