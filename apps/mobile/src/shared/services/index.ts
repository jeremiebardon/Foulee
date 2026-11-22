import type { HttpClient } from './http/HttpClient';
import { fetchHttpClient } from './http/fetchHttpClient';
import { expoKvStore } from './kvStore/expoKvStore';
import type { KvStore } from './kvStore/KvStore';
import { expoSecureStore } from './secureStore/expoSecureStore';
import type { SecureStore } from './secureStore/SecureStore';

export type Services = { http: HttpClient; secureStore: SecureStore; kvStore: KvStore };

/** The composition root: the one place the app's outside-world adapters are chosen. */
export const services: Services = { http: fetchHttpClient(), secureStore: expoSecureStore, kvStore: expoKvStore };
