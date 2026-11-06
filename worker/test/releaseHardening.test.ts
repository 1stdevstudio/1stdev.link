import { beforeEach, afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import app from '../src/index.js';
import { MockD1, MockKV, MockR2 } from './mocks.js';
import type { Env } from '../src/types.js';

class CountingKV extends MockKV {
  writes: string[] = []; reads: string[] = [];
  override async put(key: string, value: string, options?: { expirationTtl?: number }) { this.writes.push(key); return super.put(key, value, options); }
  override async get<T = any>(key: string, type?: string): Promise<T | null> { this.reads.push(key); return super.get<T>(key, type); }
}
class MissCache {
  entries = new Map<string, { body: ArrayBuffer; headers: Headers; status: number; expires: number }>();
  async put(key: Request, response: Response) { this.entries.set(key.url, { body: await response.arrayBuffer(), headers: response.headers, status: response.status, expires: Date.now() + 30000 }); }
  async match(key: Request) { const entry = this.entries.get(key.url); return entry && entry.expires > Date.now() ? new Response(entry.body, { status: entry.status, headers: entry.headers }) : undefined; }
  async delete(key: Request) { return this.entries.delete(key.url); }
}

describe('release hardening', () => {
  let db: MockD1, kv: CountingKV, media: MockR2, env: Env, cache: MissCache;
  const previousCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  beforeEach(() => {
    db = new MockD1(); kv = new CountingKV(); media = new MockR2(); cache = new MissCache();
    env = { DB: db as any, KV: kv as any, MEDIA: media as any, BASE_URL: 'https://1stdev.link' };
    db.tables.users.push({ id: 'a', email: 'a@example.com', api_key: 'token-a', is_guest: 0 }, { id: 'b', email: 'b@example.com', api_key: 'token-b', is_guest: 0 });
    db.tables.bio_profiles.push({ user_id: 'a', handle: 'alice', display_name: 'Alice', updated_at: 1 });
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: cache } });
  });
  afterEach(() => { if (previousCaches) Object.defineProperty(globalThis, 'caches', previousCaches); else Reflect.deleteProperty(globalThis, 'caches'); });
  const api = (path: string, method = 'GET', body?: unknown, token = 'token-a') => app.fetch(new Request('https://1stdev.link' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
  const seedLink = (id: string, extra: Record<string, unknown> = {}) => { const row = { id, user_id: 'a', slug: 'slug-' + id, title: 'Link ' + id, destination_url: 'https://example.com/' + id, block_type: 'link', is_active: 1, is_bio_entry: 0, sort_order: 0, created_at: 1, ...extra }; db.tables.links.push(row); return row; };
  const date = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);

  test('tenant summary includes 11 links, precise ranges, content exclusion and four real SQLite aggregates', async () => {
    for (let i = 1; i <= 11; i++) {
      const row = seedLink(String(i), { is_active: i === 1 ? 0 : 1 });
      db.tables.link_analytics.push({ link_id: row.id, date: date(0), country: i % 2 ? 'ID' : 'US', clicks: i });
    }
    seedLink('foreign', { user_id: 'b' }); seedLink('content', { block_type: 'text', destination_url: '#' });
    db.tables.link_analytics.push({ link_id: 'foreign', date: date(0), country: 'XX', clicks: 9000 }, { link_id: 'content', date: date(0), country: 'XX', clicks: 9000 }, { link_id: '11', date: date(7), country: 'ID', clicks: 1000 }, { link_id: '11', date: date(-1), country: 'ID', clicks: 9000 });
    const queries: { query: string; params: unknown[] }[] = [];
    const prepare = db.prepare.bind(db);
    db.prepare = (query: string) => {
      const statement = prepare(query), bind = statement.bind;
      if (query.includes('/* summary_')) statement.bind = function (...params: any[]) { queries.push({ query, params }); return bind.apply(this, params); };
      return statement;
    };
    const response = await api('/api/analytics/summary?range=7d');
    assert.equal(response.status, 200);
    const summary = (await response.json() as any).data;
    assert.equal(summary.total_clicks, 66); assert.equal(summary.by_link.length, 11); assert.equal(summary.by_link[0].id, '11'); assert.equal(summary.active_links, 10);
    assert.deepEqual(summary.by_date, [{ date: date(0), clicks: 66 }]);
    assert.equal(queries.length, 4);
    const sqlite = spawnSync('python3', ['-c', `import sqlite3,json,sys
payload=json.load(sys.stdin); c=sqlite3.connect(':memory:'); c.row_factory=sqlite3.Row
c.executescript('CREATE TABLE links(id TEXT,user_id TEXT,slug TEXT,title TEXT,destination_url TEXT,block_type TEXT,is_active INTEGER); CREATE TABLE link_analytics(link_id TEXT,date TEXT,country TEXT,clicks INTEGER);')
for row in payload['tables']['links']: c.execute('INSERT INTO links VALUES(?,?,?,?,?,?,?)',tuple(row.get(k) for k in ['id','user_id','slug','title','destination_url','block_type','is_active']))
for row in payload['tables']['link_analytics']: c.execute('INSERT INTO link_analytics VALUES(?,?,?,?)',tuple(row[k] for k in ['link_id','date','country','clicks']))
print(json.dumps([[dict(r) for r in c.execute(q['query'],q['params'])] for q in payload['queries']]))`], { input: JSON.stringify({ tables: db.tables, queries }), encoding: 'utf8' });
    assert.equal(sqlite.status, 0, sqlite.stderr);
    const [dates, countries, ranking, active] = JSON.parse(sqlite.stdout);
    assert.deepEqual(dates, summary.by_date); assert.deepEqual(countries, summary.by_country); assert.deepEqual(ranking, summary.by_link); assert.equal(active[0].active_links, 10);
    const thirty = (await (await api('/api/analytics/summary?range=30d')).json() as any).data;
    assert.equal(thirty.total_clicks, 1066);
    const other = (await (await api('/api/analytics/summary?range=7d', 'GET', undefined, 'token-b')).json() as any).data;
    assert.equal(other.total_clicks, 9000); assert.equal(other.by_link.length, 1);
    assert.equal((await api('/api/analytics/summary?range=all')).status, 400);
    assert.equal((await api('/api/analytics/summary', 'GET', undefined, '')).status, 401);
  });

  test('summary query failure returns a controlled retryable error', async () => {
    const prepare = db.prepare.bind(db);
    db.prepare = (query) => { if (query.includes('/* summary_')) throw new Error('private database details'); return prepare(query); };
    const response = await api('/api/analytics/summary');
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private database details/);
  });

  test('detaching preserves redirect, record and analytics while invalidating public bio', async () => {
    const link = seedLink('keep', { is_bio_entry: 1 });
    db.tables.link_analytics.push({ link_id: link.id, date: date(0), country: 'ID', clicks: 5 });
    await app.fetch(new Request('https://1stdev.link/@alice'), env);
    assert.ok(await kv.get('bio:alice'));
    assert.equal((await api('/api/links/keep', 'PATCH', { is_bio_entry: false })).status, 200);
    assert.equal(db.tables.links.length, 1); assert.equal(db.tables.links[0].is_bio_entry, 0); assert.equal(db.tables.link_analytics[0].clicks, 5);
    assert.equal(await kv.get('bio:alice'), null);
    assert.equal((await app.fetch(new Request('https://1stdev.link/' + link.slug), env)).status, 302);
    assert.equal((await api('/api/links/keep', 'PATCH', { is_bio_entry: 1 }, 'token-b')).status, 404);
    for (const invalid of [null, 2, '0', []]) assert.equal((await api('/api/links/keep', 'PATCH', { is_bio_entry: invalid })).status, 400);
    assert.equal((await api('/api/links/keep', 'PATCH', { is_bio_entry: true })).status, 200);
    assert.equal(db.tables.links[0].is_bio_entry, 1);
  });

  test('streamed upload cancels at avatar and general-media limits without waiting for producer cancellation', { timeout: 2000 }, async () => {
    for (const [kind, max] of [['avatar', 512 * 1024], ['cover', 1024 * 1024]] as const) {
      let chunks = 0, cancelled = false;
      const body = new ReadableStream<Uint8Array>({ pull(controller) { chunks++; controller.enqueue(new Uint8Array(65536)); }, cancel() { cancelled = true; return new Promise<void>(() => {}); } }, { highWaterMark: 0 });
      const request = new Request('https://1stdev.link/api/media/' + kind, { method: 'POST', headers: { Authorization: 'Bearer token-a', 'Content-Type': 'image/png' }, body, duplex: 'half' } as any);
      const response = await app.fetch(request, env);
      assert.equal(response.status, 413); assert.equal(cancelled, true); assert.ok(chunks <= max / 65536 + 1, `${kind} consumed ${chunks} chunks`);
    }
    assert.equal(media.objects.size, 0);
  });

  test('misses use 30-second edge cache and no KV writes; malformed and credentialed paths bypass it', async () => {
    let lookups = 0;
    const prepare = db.prepare.bind(db);
    db.prepare = (query) => { if (query.includes('FROM links WHERE slug = ?')) lookups++; return prepare(query); };
    assert.equal((await app.fetch(new Request('https://1stdev.link/missing'), env)).status, 404);
    assert.equal((await app.fetch(new Request('https://1stdev.link/missing'), env)).status, 404);
    assert.equal(lookups, 1); assert.equal(cache.entries.size, 1);
    assert.equal([...cache.entries.values()][0].headers.get('cache-control'), 'public, max-age=30');
    assert.deepEqual(kv.writes, []); assert.ok(kv.reads.every((key) => !key.startsWith('slug:nf:')));
    for (const headers of [{ Authorization: 'Bearer private' }, { Cookie: 'session=private' }] as Record<string, string>[]) await app.fetch(new Request('https://1stdev.link/missing', { headers }), env);
    assert.equal(lookups, 3);
    const reads = kv.reads.length;
    for (const path of ['.bad', 'x'.repeat(101), '%3Cscript%3E']) assert.equal((await app.fetch(new Request('https://1stdev.link/' + path), env)).status, 404);
    assert.equal(lookups, 3); assert.equal(kv.reads.length, reads);
  });

  test('legacy one and two character slugs still redirect', async () => {
    seedLink('legacy-gh', { slug: 'gh' });
    seedLink('legacy-x', { slug: 'x' });
    assert.equal((await app.fetch(new Request('https://1stdev.link/gh'), env)).status, 302);
    assert.equal((await app.fetch(new Request('https://1stdev.link/x'), env)).status, 302);
  });

  test('creating and reactivating a previously missing slug await edge-miss invalidation', async () => {
    await app.fetch(new Request('https://1stdev.link/new-shop'), env);
    assert.equal(cache.entries.size, 1);
    assert.equal((await api('/api/links', 'POST', { slug: 'new-shop', destination_url: 'https://example.com/' })).status, 201);
    assert.equal(cache.entries.size, 0);
    assert.equal((await app.fetch(new Request('https://1stdev.link/new-shop'), env)).status, 302);
    const link = seedLink('inactive', { is_active: 0 });
    await app.fetch(new Request('https://1stdev.link/' + link.slug), env);
    assert.equal(cache.entries.size, 1);
    assert.equal((await api('/api/links/inactive', 'PATCH', { is_active: 1 })).status, 200);
    assert.equal(cache.entries.size, 0);
    assert.equal((await app.fetch(new Request('https://1stdev.link/' + link.slug), env)).status, 302);
  });

  test('all link types share the quota and parallel creation cannot exceed 100', async () => {
    for (let i = 0; i < 99; i++) seedLink('existing-' + i);
    const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => api('/api/links', 'POST', { slug: 'new-' + i, destination_url: 'https://example.com/' })));
    assert.equal(responses.filter((r) => r.status === 201).length, 1);
    assert.ok(responses.every((r) => r.status === 201 || r.status === 400)); assert.equal(db.tables.links.filter((l) => l.user_id === 'a').length, 100);
    const extra = await api('/api/links', 'POST', { block_type: 'header', title: 'Extra', destination_url: '#' });
    assert.equal(extra.status, 400); assert.match(await extra.text(), /LINK_QUOTA_EXCEEDED/);
    assert.equal((await api('/api/links', 'POST', { slug: 'other-account', destination_url: 'https://example.com/' }, 'token-b')).status, 201);
  });

  test('preset trigger failures roll back the entire batch after a racing insert', async () => {
    for (let i = 0; i < 96; i++) seedLink('existing-' + i);
    const batch = db.batch.bind(db);
    db.batch = async (statements) => { for (let i = 0; i < 3; i++) seedLink('race-' + i); return batch(statements); };
    const response = await api('/api/business/preset', 'POST', { industry: 'retail' });
    assert.equal(response.status, 400); assert.equal(db.tables.links.length, 99); assert.ok(db.tables.links.every((l) => l.block_type === 'link'));
  });

  test('every rate-limited route uses D1 and returns structured 503 when enforcement is unavailable', async () => {
    const prepare = db.prepare.bind(db);
    db.prepare = (query) => { if (query.includes('INSERT INTO rate_limits')) throw new Error('limiter unavailable'); return prepare(query); };
    const cases: [string, unknown][] = [['/api/auth/guest', {}], ['/api/auth/login', { credential: 'token-a' }], ['/api/auth/send-otp', { email: 'a@example.com', purpose: 'login' }], ['/api/auth/verify-otp', { email: 'a@example.com', purpose: 'login', code: '123456' }], ['/api/auth/handoff', {}], ['/api/auth/handoff/claim', { code: 'code' }], ['/api/business/preset', { industry: 'retail' }], ['/api/links', { destination_url: 'https://example.com/' }], ['/api/media/avatar', {}]];
    for (const [path, body] of cases) {
      const response = await api(path, 'POST', body);
      assert.equal(response.status, 503, path); assert.equal((await response.json() as any).status, 'error', path);
    }
  });

  test('named guest profiles rehydrate legacy cache without guest flag and remain noindex', async () => {
    db.tables.users[0].is_guest = 1;
    const row = seedLink('guest-bio', { is_bio_entry: 1 });
    await kv.put('bio:alice', JSON.stringify({ profile: db.tables.bio_profiles[0], links: [row] }));
    const html = await (await app.fetch(new Request('https://1stdev.link/@alice'), env)).text();
    assert.match(html, /content="noindex, follow"/);
    assert.equal((await kv.get<any>('bio:alice', 'json'))?.profile.is_guest, 1);
    const xml = await (await app.fetch(new Request('https://1stdev.link/sitemap.xml'), env)).text();
    assert.doesNotMatch(xml, /@alice/);
    const now = Math.floor(Date.now() / 1000);
    db.tables.auth_challenges.push({ id: 'claim-once', user_id: 'a', expires_at: now + 600, attempts: 0, consumed: 0 });
    await kv.put('otp:a@example.com', JSON.stringify({ challenge_id: 'claim-once', user_id: 'a', purpose: 'claim', code: '123456', created_at: now, attempts: 0 }));
    assert.equal((await api('/api/auth/verify-otp', 'POST', { email: 'a@example.com', code: '123456', purpose: 'claim' })).status, 200);
    assert.equal(await kv.get('bio:alice'), null, 'claim invalidates trusted guest cache');
    const claimed = await (await app.fetch(new Request('https://1stdev.link/@alice'), env)).text();
    assert.match(claimed, /content="index, follow, max-image-preview:large"/);
  });
});
