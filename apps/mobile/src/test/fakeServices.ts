import { HttpNetworkError, type HttpRequest, type HttpResponse } from '@/shared/services/http/HttpClient';
import type { Services } from '@/shared/services';

/**
 * In-memory `services` for tests. Wire them with a factory, so no native module loads:
 *
 *   jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());
 *
 * The state is module-level, so the mocked module and the helpers a test imports share it
 * through Jest's module registry. `givenHttpResponse` queues: each `http.request` takes the next
 * item, rejecting when it is an `HttpNetworkError`.
 */
const secureItems = new Map<string, string>();
const kvItems = new Map<string, string>();
let httpQueue: (HttpResponse | HttpNetworkError)[] = [];
let lastRequest: HttpRequest | undefined;
let secureReadFails = false;
let secureWriteFails = false;

const services: Services = {
  http: {
    request: async (request) => {
      lastRequest = request;
      const next = httpQueue.shift();
      if (next === undefined) throw new Error(`No HTTP response given for ${request.method} ${request.url}`);
      if (next instanceof HttpNetworkError) throw next;
      return next;
    },
  },
  secureStore: {
    get: (key) => {
      if (secureReadFails) {
        secureReadFails = false;
        throw new Error('The value could not be read');
      }
      return secureItems.get(key) ?? null;
    },
    set: (key, value) => {
      if (secureWriteFails) {
        secureWriteFails = false;
        throw new Error('The value could not be stored');
      }
      secureItems.set(key, value);
    },
    delete: async (key) => void secureItems.delete(key),
  },
  kvStore: {
    get: (key) => kvItems.get(key) ?? null,
    set: (key, value) => void kvItems.set(key, value),
    delete: (key) => void kvItems.delete(key),
  },
};

/** `HttpNetworkError` comes along because it is part of the entry point the module stands in for. */
export const fakeServicesModule = () => ({ services, HttpNetworkError });

export const givenHttpResponse = (response: HttpResponse | HttpNetworkError) => void httpQueue.push(response);
export const lastHttpRequest = () => lastRequest;
export const failNextSecureRead = () => {
  secureReadFails = true;
};
export const failNextSecureWrite = () => {
  secureWriteFails = true;
};

export const resetFakeServices = () => {
  secureItems.clear();
  kvItems.clear();
  httpQueue = [];
  lastRequest = undefined;
  secureReadFails = false;
  secureWriteFails = false;
};
