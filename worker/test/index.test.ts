import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { MockD1, MockKV } from './mocks.js';
import type { Env } from '../src/types.js';

describe('EdgeLink Cloudflare Worker Backend Tests', () => {
  let env: Env;
  let mockDb: MockD1;
  let mockKv: MockKV;

  beforeEach(() => {
    mockDb = new MockD1();
    mockKv = new MockKV();
    env = {
      DB: mockDb as any,
      KV: mockKv as any,
      BASE_URL: 'https://edgelink.id'
    };

    // Seed test user
    mockDb.tables.users.push({
      id: 'usr_test123',
      email: 'tester@edgelink.id',
      api_key: 'sec_key_456',
      created_at: 1700000000,
      updated_at: 1700000000
    });
  });

  test('GET /health returns 200 ok', async () => {
    const res = await app.fetch(new Request('http://localhost/health'), env);
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.status, 'ok');
  });

  test('Security headers present on all responses', async () => {
    const res = await app.fetch(new Request('http://localhost/health'), env);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /default-src 'self'/);
    // Dashboard CSS (/assets) and Google Fonts must load; inline/3rd-party scripts must not.
    assert.match(csp, /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
    assert.match(csp, /font-src [^;]*https:\/\/fonts\.gstatic\.com/);
    assert.match(csp, /script-src 'self';/);
  });

  test('POST /api/links creates shortlink with validation and SSRF protection', async () => {
    // 1. SSRF block test (localhost / private IP)
    const ssrfRes = await app.fetch(
      new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer usr_test123'
        },
        body: JSON.stringify({
          destination_url: 'http://127.0.0.1:8080/admin',
          slug: 'hack-local'
        })
      }),
      env
    );
    assert.equal(ssrfRes.status, 422);

    // 2. Reserved slug block test
    const reservedRes = await app.fetch(
      new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer usr_test123'
        },
        body: JSON.stringify({
          destination_url: 'https://spixels.id',
          slug: 'admin'
        })
      }),
      env
    );
    assert.equal(reservedRes.status, 400);

    // 3. Valid link creation
    const validRes = await app.fetch(
      new Request('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer usr_test123'
        },
        body: JSON.stringify({
          destination_url: 'https://spixels.id/mastery',
          slug: 'mastery',
          title: 'Mastery Course',
          is_bio_entry: true,
          sort_order: 1
        })
      }),
      env
    );
    assert.equal(validRes.status, 201);
    const data = ((await validRes.json()) as any).data;
    assert.equal(data.slug, 'mastery');
    assert.equal(data.destination_url, 'https://spixels.id/mastery');

    // Verify KV cache was populated
    const cachedKv = await mockKv.get(`slug:mastery`, 'json');
    assert.ok(cachedKv);
    assert.equal(cachedKv.url, 'https://spixels.id/mastery');
  });

  test('GET /:slug redirects with 302 and aggregates analytics', async () => {
    // Seed link in DB
    mockDb.tables.links.push({
      id: 'lnk_123',
      user_id: 'usr_test123',
      slug: 'promo',
      destination_url: 'https://spixels.id/promo',
      title: 'Promo',
      is_bio_entry: 0,
      sort_order: 0,
      is_active: 1,
      created_at: 1700000000
    });

    const waitUntilPromises: Promise<any>[] = [];
    const executionCtx = {
      waitUntil: (p: Promise<any>) => waitUntilPromises.push(p)
    };

    const res = await app.fetch(
      new Request('http://localhost/promo', {
        headers: { 'cf-ipcountry': 'ID' }
      }),
      env,
      executionCtx as any
    );

    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), 'https://spixels.id/promo');

    // Await background execution
    await Promise.all(waitUntilPromises);

    // Verify analytics row created
    const today = new Date().toISOString().slice(0, 10);
    const analytics = mockDb.tables.link_analytics.find(
      (a) => a.link_id === 'lnk_123' && a.country === 'ID' && a.date === today
    );
    assert.ok(analytics);
    assert.equal(analytics.clicks, 1);

    // Call second time -> check KV hit & click increment
    const res2 = await app.fetch(
      new Request('http://localhost/promo', {
        headers: { 'cf-ipcountry': 'ID' }
      }),
      env,
      executionCtx as any
    );
    assert.equal(res2.status, 302);
    await Promise.all(waitUntilPromises);

    assert.equal(analytics.clicks, 2);
  });

  test('PUT /api/bio-profile updates profile and GET /@:handle serves SSR HTML', async () => {
    // Update profile
    const putRes = await app.fetch(
      new Request('http://localhost/api/bio-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'sec_key_456'
        },
        body: JSON.stringify({
          handle: 'spixels',
          display_name: 'Spixels Dev',
          bio: 'Penetration Tester & Architect',
          avatar_url: 'https://spixels.id/avatar.png',
          social_links: {
            github: 'https://github.com/spixels',
            twitter: 'https://x.com/spixels'
          }
        })
      }),
      env
    );
    assert.equal(putRes.status, 200);

    // Seed a bio link entry
    mockDb.tables.links.push({
      id: 'lnk_bio1',
      user_id: 'usr_test123',
      slug: 'portfolio',
      destination_url: 'https://spixels.id',
      title: 'My Portfolio',
      is_bio_entry: 1,
      sort_order: 1,
      is_active: 1,
      created_at: 1700000000
    });

    // Request SSR profile HTML
    const getRes = await app.fetch(new Request('http://localhost/@spixels'), env);
    assert.equal(getRes.status, 200);
    assert.match(getRes.headers.get('content-type') || '', /text\/html/);

    const html = await getRes.text();
    assert.match(html, /Spixels Dev/);
    assert.match(html, /@spixels/);
    assert.match(html, /Penetration Tester &amp; Architect/);
    assert.match(html, /My Portfolio/);
    // Edge must not rewrite HTML (blocks injected analytics beacon).
    assert.match(getRes.headers.get('cache-control') || '', /no-transform/);
    // Payload should be lightweight (< 15KB)
    assert.ok(html.length < 15000);
  });

  test('Adding a bio block invalidates the cached /@handle page before responding', async () => {
    const auth = { 'Content-Type': 'application/json', 'X-API-Key': 'sec_key_456' };
    await app.fetch(
      new Request('http://localhost/api/bio-profile', {
        method: 'PUT',
        headers: auth,
        body: JSON.stringify({ handle: 'cachey', display_name: 'Cache Test' })
      }),
      env
    );

    // First visit caches the empty page in KV.
    await app.fetch(new Request('http://localhost/@cachey'), env);
    assert.ok(await mockKv.get('bio:cachey'), 'bio page should be cached');

    // Slow KV delete (like real KV): a fire-and-forget invalidation would lose the race.
    const realDelete = mockKv.delete.bind(mockKv);
    mockKv.delete = (key: string) =>
      new Promise<void>((resolve) => setTimeout(() => realDelete(key).then(resolve), 5));

    const postRes = await app.fetch(
      new Request('http://localhost/api/links', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          destination_url: 'https://example.com/shop',
          title: 'Fresh Block',
          is_bio_entry: true
        })
      }),
      env
    );
    assert.equal(postRes.status, 201);
    assert.equal(await mockKv.get('bio:cachey'), null, 'cache must be cleared when the response returns');

    const html = await (await app.fetch(new Request('http://localhost/@cachey'), env)).text();
    assert.match(html, /Fresh Block/);
  });

  test('Dashboard theme preset is applied on the public bio page', async () => {
    await app.fetch(
      new Request('http://localhost/api/bio-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sec_key_456' },
        body: JSON.stringify({ handle: 'paper', display_name: 'Paper', theme: 'clean-paper' })
      }),
      env
    );
    const html = await (await app.fetch(new Request('http://localhost/@paper'), env)).text();
    assert.match(html, /--bg: #f4f4f2/);
    assert.match(html, /--text: #111111/);
  });

  test('PATCH /api/links/:id edits a block in place (title, URL, type) with SSRF + tenant checks', async () => {
    const auth = { 'Content-Type': 'application/json', 'X-API-Key': 'sec_key_456' };
    await app.fetch(new Request('http://localhost/api/bio-profile', {
      method: 'PUT', headers: auth, body: JSON.stringify({ handle: 'editor', display_name: 'Editor' }),
    }), env);
    mockDb.tables.links.push({
      id: 'lnk_edit', user_id: 'usr_test123', slug: 'shop', destination_url: 'https://typo.example.com',
      title: 'Tko saya', is_bio_entry: 1, sort_order: 0, is_active: 1, block_type: 'link', created_at: 1700000000,
    });
    mockDb.tables.links.push({
      id: 'lnk_other', user_id: 'usr_someone_else', slug: 'theirs', destination_url: 'https://other.example.com',
      title: 'Not yours', is_bio_entry: 1, sort_order: 0, is_active: 1, block_type: 'link', created_at: 1700000000,
    });
    await app.fetch(new Request('http://localhost/@editor'), env); // warm cache

    const patch = (id: string, body: object) => app.fetch(new Request(`http://localhost/api/links/${id}`, {
      method: 'PATCH', headers: auth, body: JSON.stringify(body),
    }), env);

    const ok = await patch('lnk_edit', { title: 'Toko saya', destination_url: 'https://shop.example.com', block_type: 'featured' });
    assert.equal(ok.status, 200);
    const row = mockDb.tables.links.find((l) => l.id === 'lnk_edit');
    assert.equal(row.title, 'Toko saya');
    assert.equal(row.destination_url, 'https://shop.example.com');
    assert.equal(row.block_type, 'featured');
    assert.equal(((await mockKv.get('slug:shop', 'json')) as any)?.url, 'https://shop.example.com');
    assert.match(await (await app.fetch(new Request('http://localhost/@editor'), env)).text(), /Toko saya/);

    assert.equal((await patch('lnk_edit', { destination_url: 'http://127.0.0.1/admin' })).status, 422);
    assert.equal(row.destination_url, 'https://shop.example.com');
    assert.equal((await patch('lnk_edit', { title: '' })).status, 400);

    assert.equal((await patch('lnk_other', { title: 'hijack' })).status, 404);
    assert.equal(mockDb.tables.links.find((l) => l.id === 'lnk_other').title, 'Not yours');
  });

  test('GET /api/links and GET /api/links/:id/analytics', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockDb.tables.links.push({
      id: 'lnk_analytics_test',
      user_id: 'usr_test123',
      slug: 'stats',
      destination_url: 'https://spixels.id/stats',
      title: 'Stats Link',
      is_bio_entry: 0,
      sort_order: 0,
      is_active: 1,
      created_at: 1700000000
    });
    mockDb.tables.link_analytics.push(
      { link_id: 'lnk_analytics_test', date: today, country: 'ID', clicks: 42 },
      { link_id: 'lnk_analytics_test', date: today, country: 'SG', clicks: 8 }
    );

    // 1. List links
    const listRes = await app.fetch(
      new Request('http://localhost/api/links', {
        headers: { Authorization: 'Bearer usr_test123' }
      }),
      env
    );
    assert.equal(listRes.status, 200);
    const listData = ((await listRes.json()) as any).data;
    assert.ok(listData.length > 0);
    const item = listData.find((l: any) => l.id === 'lnk_analytics_test');
    assert.equal(item.clicks, 50);

    // 2. Link analytics
    const statsRes = await app.fetch(
      new Request('http://localhost/api/links/lnk_analytics_test/analytics?range=7d', {
        headers: { Authorization: 'Bearer usr_test123' }
      }),
      env
    );
    assert.equal(statsRes.status, 200);
    const statsData = ((await statsRes.json()) as any).data;
    assert.equal(statsData.total_clicks, 50);
    assert.equal(statsData.by_country.length, 2);
    assert.equal(statsData.by_country[0].country, 'ID');
    assert.equal(statsData.by_country[0].clicks, 42);
  });
});
