import { HttpNetworkError, type HttpClient, type HttpRequest, type HttpResponse } from './HttpClient';

/** `HttpClient` over the platform `fetch`, read at call time so a test can swap it. */
export const fetchHttpClient = (): HttpClient => ({
  async request({ method, url, headers, body, timeoutMs }: HttpRequest): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await globalThis.fetch(url, {
        method,
        headers: body === undefined ? { ...headers } : { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
    } catch {
      throw new HttpNetworkError('The request got no response');
    } finally {
      clearTimeout(timer);
    }
  },
});
