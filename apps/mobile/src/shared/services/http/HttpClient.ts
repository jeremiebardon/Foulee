export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequest = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

/** `body` is the parsed JSON, or `null` when the response has none or it isn't JSON. */
export type HttpResponse = { status: number; ok: boolean; body: unknown };

/** The request never got a response: offline, DNS, refused, or past `timeoutMs`. */
export class HttpNetworkError extends Error {}

export interface HttpClient {
  request(request: HttpRequest): Promise<HttpResponse>;
}
