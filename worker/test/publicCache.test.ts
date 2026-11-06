import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cachedPublicResponse, ASSET_CACHE } from '../src/publicCache.js';
import app from '../src/index.js';
import { MockD1, MockKV, MockR2 } from './mocks.js';
import type { Env } from '../src/types.js';

class MemoryCache {
  entries = new Map<string, Response>();
  async match(key: Request) { return this.entries.get(key.url)?.clone(); }
  async put(key: Request, response: Response) {
    this.entries.set(key.url, new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers }));
  }
}
describe('Public edge cache', () => {
  let cache: MemoryCache;
  let pending: Promise<unknown>[];
  const oldCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  const oldFetch = globalThis.fetch;
  const waitUntil = (task: Promise<unknown>) => { pending.push(task); };
  const context = { waitUntil, passThroughOnException() {}, props: {} };
  const flush = () => Promise.all(pending);
  const asset = () => new Response('public bytes', { headers: { 'Content-Type': 'application/javascript', ETag: '"v1"' } });
  const env = () => ({ DB: new MockD1(), KV: new MockKV(), BASE_URL: 'https://1stdev.link' }) as unknown as Env;
  beforeEach(() => {
    cache = new MemoryCache(); pending = [];
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: cache } });
  });
  afterEach(() => {
    if (oldCaches) Object.defineProperty(globalThis, 'caches', oldCaches);
    else Reflect.deleteProperty(globalThis, 'caches');
    globalThis.fetch = oldFetch;
  });

  test('HEAD warms full bytes, GET hits and ETag revalidation returns empty 304', async () => {
    const url = 'https://1stdev.link/assets/app.js'; let reads = 0;
    const load = async () => { reads++; return asset(); };
    const head = await cachedPublicResponse(new Request(url, { method: 'HEAD' }), ASSET_CACHE, load, waitUntil);
    assert.equal(head.headers.get('x-edge-cache'), 'MISS'); assert.equal(await head.text(), ''); await flush();
    const get = await cachedPublicResponse(new Request(url), ASSET_CACHE, load, waitUntil);
    assert.equal(get.headers.get('x-edge-cache'), 'HIT'); assert.equal(await get.text(), 'public bytes');
    assert.equal(get.headers.get('cache-control'), 'public, max-age=86400, s-maxage=2592000, immutable');
    assert.equal(get.headers.get('cf-cache-status'), null, 'never manufacture provider status');
    const conditional = await cachedPublicResponse(new Request(url, { headers: { 'If-None-Match': '"other", W/"v1"' } }), ASSET_CACHE, load, waitUntil);
    assert.equal(conditional.status, 304); assert.equal(await conditional.text(), ''); assert.equal(reads, 1);
  });

  test('credentials, ranges and writes bypass a warm cache', async () => {
    const url = 'https://1stdev.link/assets/app.js';
    await cachedPublicResponse(new Request(url), ASSET_CACHE, async () => asset(), waitUntil); await flush();
    for (const init of [{ headers: { Authorization: 'Bearer secret' } }, { headers: { Cookie: 'session=secret' } }, { headers: { Range: 'bytes=0-5' } }, { method: 'POST' }] as RequestInit[]) {
      let reads = 0;
      const response = await cachedPublicResponse(new Request(url, init), ASSET_CACHE, async () => { reads++; return asset(); }, waitUntil);
      assert.equal(response.headers.get('x-edge-cache'), 'BYPASS'); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(reads, 1);
    }
    assert.equal(cache.entries.size, 1);
  });

  test('404/5xx/redirect/partial/private/cookie/vary/HTML responses never enter the cache', async () => {
    const cases = [
      new Response('missing', { status: 404 }), new Response('error', { status: 503 }),
      new Response(null, { status: 302, headers: { Location: '/login' } }),
      new Response('partial', { status: 206, headers: { 'Content-Type': 'application/javascript' } }),
      ...([{ 'Cache-Control': 'private, max-age=600' }, { 'Cache-Control': 'no-store' }, { 'Set-Cookie': 'session=secret' }, { Vary: 'Cookie' }] as Record<string, string>[]).map(headers => new Response('secret', { headers: { 'Content-Type': 'application/javascript', ...headers } })),
      new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
    ];
    for (const response of cases) {
      const result = await cachedPublicResponse(new Request('https://1stdev.link/assets/missing.js'), ASSET_CACHE, async () => response, waitUntil);
      assert.equal(result.headers.get('x-edge-cache'), 'BYPASS'); assert.equal(result.headers.get('cache-control'), 'no-store');
    }
    await flush(); assert.equal(cache.entries.size, 0);
  });

  test('host/query keys stay separate and cache outages do not break origin responses', async () => {
    for (const url of ['https://1stdev.link/assets/app.js?v=1', 'https://1stdev.link/assets/app.js?v=2', 'https://link.1stnear.com/assets/app.js?v=1']) {
      await cachedPublicResponse(new Request(url), ASSET_CACHE, async () => asset(), waitUntil);
    }
    await flush(); assert.equal(cache.entries.size, 3);
    cache.match = async () => { throw new Error('offline'); };
    cache.put = async () => { throw new Error('offline'); };
    assert.equal((await cachedPublicResponse(new Request('https://1stdev.link/assets/new.js'), ASSET_CACHE, async () => asset(), waitUntil)).status, 200);
    await flush();
  });

  test('Pages asset proxy strips credentials/conditions, caches bytes, rejects SPA fallback', async () => {
    let reads = 0;
    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      reads++;
      for (const name of ['authorization', 'cookie', 'if-none-match']) assert.equal(new Headers(init?.headers).get(name), null);
      assert.equal(init?.method, 'GET'); return asset();
    }) as typeof fetch;
    const bindings = env(); const url = 'https://1stdev.link/assets/real.js';
    for (let i = 0; i < 2; i++) {
      const response = await app.fetch(new Request(url), bindings, context);
      assert.equal(response.headers.get('x-edge-cache'), i ? 'HIT' : 'MISS'); await flush();
    }
    assert.equal(reads, 1);
    await app.fetch(new Request(url, { headers: { Authorization: 'Bearer secret', Cookie: 'session=secret' } }), bindings, context);
    assert.equal(reads, 2);
    globalThis.fetch = (async () => new Response('<html>SPA</html>', { headers: { 'Content-Type': 'text/html' } })) as typeof fetch;
    const missing = await app.fetch(new Request('https://1stdev.link/assets/not-real.js'), bindings, context);
    assert.equal(missing.status, 404); assert.equal(missing.headers.get('cache-control'), 'no-store');
  });

  test('R2 cache avoids repeated bucket reads and supports conditional requests', async () => {
    const bindings = env(); const r2 = new MockR2(); bindings.MEDIA = r2 as unknown as R2Bucket;
    const key = 'avatars/user_1/0123456789abcdef.webp';
    await r2.put(key, new Uint8Array([82, 73, 70, 70]).buffer, { httpMetadata: { contentType: 'image/webp' } });
    const original = r2.get.bind(r2); let reads = 0;
    r2.get = async (key) => { reads++; return original(key); };
    const url = 'https://1stdev.link/m/' + key;
    const first = await app.fetch(new Request(url), bindings, context); await flush();
    const second = await app.fetch(new Request(url), bindings, context);
    assert.equal(second.headers.get('x-edge-cache'), 'HIT');
    const conditional = await app.fetch(new Request(url, { headers: { 'If-None-Match': first.headers.get('etag')! } }), bindings, context);
    assert.equal(conditional.status, 304); assert.equal(reads, 1);
  });

  test('sitemap uses correct TTL, DB errors never cache, root/API stay excluded', async () => {
    const bindings = env();
    const sitemap = await app.fetch(new Request('https://1stdev.link/sitemap.xml'), bindings, context); await flush();
    assert.equal(sitemap.headers.get('cache-control'), 'public, max-age=1800, s-maxage=3600');
    assert.equal((await app.fetch(new Request('https://1stdev.link/sitemap.xml'), bindings, context)).headers.get('x-edge-cache'), 'HIT');
    for (const path of ['/api/auth/me', '/api/links', '/api/bio-profile']) {
      const response = await app.fetch(new Request('https://1stdev.link' + path), bindings, context);
      assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('x-edge-cache'), null);
    }
    globalThis.fetch = (async () => new Response('<html>dashboard</html>')) as typeof fetch;
    const root = await app.fetch(new Request('https://1stdev.link/'), bindings, context);
    assert.match(root.headers.get('cache-control') || '', /no-store/); assert.equal(root.headers.get('x-edge-cache'), null);
    cache.entries.clear(); bindings.DB = { prepare() { throw new Error('unavailable'); } } as unknown as D1Database;
    const failure = await app.fetch(new Request('https://1stdev.link/sitemap.xml'), bindings, context);
    assert.equal(failure.status, 503); await flush(); assert.equal(cache.entries.size, 0);
  });
});
