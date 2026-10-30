import { vi } from "vitest";

type Handler = (url: string, init?: RequestInit) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>;

/** Replaces global fetch. The handler returns { status, body } for each request. */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status = 200, body = { ok: true } } = await handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** The JSON body that was sent in the n-th fetch call. */
export const sentBody = (fn: ReturnType<typeof mockFetch>, n = 0) => JSON.parse(String(fn.mock.calls[n][1]?.body));
export const sentMethod = (fn: ReturnType<typeof mockFetch>, n = 0) => fn.mock.calls[n][1]?.method;

type Route = (init?: RequestInit, url?: string) => { status?: number; body?: unknown };
/** Fetch mock keyed by "METHOD /path" (query string ignored). Unlisted calls return 404 so missing mocks are obvious. */
export function routeFetch(routes: Record<string, Route>) {
  return mockFetch((url, init) => {
    const key = `${(init?.method ?? "GET").toUpperCase()} ${url.split("?")[0]}`;
    const route = routes[key];
    return route ? route(init, url) : { status: 404, body: { error: `no mock for ${key}` } };
  });
}
