import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { MockD1, MockKV, MockR2 } from './mocks.js';
import { pruneAvatars, sniffImage } from '../src/media.js';
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
        headers: { 'cf-ipcountry': 'ID', 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' }
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
        headers: { 'cf-ipcountry': 'ID', 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' }
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

    // Profile without a known theme (old 'minimal-dark' rows) gets the 1stNear default.
    await app.fetch(new Request('http://localhost/api/bio-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'sec_key_456' },
      body: JSON.stringify({ handle: 'paper', theme: 'minimal-dark' }),
    }), env);
    await mockKv.delete('bio:paper');
    const def = await (await app.fetch(new Request('http://localhost/@paper'), env)).text();
    assert.match(def, /--bg: #0e1f1b/);
    assert.match(def, /--accent: #e9be54/);
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

  // ---------- SEO & GEO ----------
  const seedProfile = (handle: string, user_id: string, opts: { guest?: boolean; links?: number; social?: string; bio?: string } = {}) => {
    if (user_id !== 'usr_test123') {
      mockDb.tables.users.push({ id: user_id, email: `${user_id}@x.id`, is_guest: opts.guest ? 1 : 0, created_at: 1, updated_at: 1 });
    }
    mockDb.tables.bio_profiles.push({
      user_id, handle, display_name: 'Sari <Toko>', bio: opts.bio ?? 'Kue rumahan & hampers', avatar_url: 'https://cdn.example.com/a.png',
      social_links: opts.social ?? JSON.stringify({ instagram: 'https://instagram.com/sari', bad: 'javascript:alert(1)' }),
      theme: '1stnear', updated_at: 1761580800
    });
    for (let i = 0; i < (opts.links ?? 1); i++) {
      mockDb.tables.links.push({ id: `l_${handle}_${i}`, user_id, slug: `${handle}${i}`, destination_url: `https://shop.example.com/${i}`, title: `Menu ${i}`, is_bio_entry: 1, sort_order: i, is_active: 1, block_type: 'link', created_at: 1 });
    }
  };

  test('robots.txt allows search + AI answer engines, blocks /api, points to sitemap', async () => {
    const res = await app.fetch(new Request('http://localhost/robots.txt'), env);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/plain/);
    const txt = await res.text();
    assert.match(txt, /User-agent: \*\nAllow: \/\nDisallow: \/api\//);
    for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot']) assert.ok(txt.includes(`User-agent: ${bot}`), bot);
    assert.ok(txt.includes('Sitemap: https://edgelink.id/sitemap.xml'));
  });

  test('sitemap.xml lists home, docs and only indexable public profiles', async () => {
    seedProfile('sari', 'usr_sari');
    seedProfile('edge_abc123', 'usr_guest', { guest: true });
    seedProfile('kosong', 'usr_empty', { links: 0 });
    const res = await app.fetch(new Request('http://localhost/sitemap.xml'), env);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/xml/);
    const xml = await res.text();
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<loc>https://edgelink.id/</loc>'));
    assert.ok(xml.includes('<loc>https://edgelink.id/docs</loc>'));
    assert.ok(xml.includes('<loc>https://edgelink.id/@sari</loc>'));
    assert.ok(xml.includes('<lastmod>2025-10-27</lastmod>'));
    assert.ok(!xml.includes('edge_abc123'), 'guest excluded');
    assert.ok(!xml.includes('@kosong'), 'empty profile excluded');
  });

  test('bio page ships canonical, Open Graph, Twitter and ProfilePage JSON-LD', async () => {
    seedProfile('sari', 'usr_sari');
    const html = await (await app.fetch(new Request('http://localhost/@sari'), env)).text();
    assert.ok(html.includes('<link rel="canonical" href="https://edgelink.id/@sari">'));
    assert.ok(html.includes('<meta name="robots" content="index, follow, max-image-preview:large">'));
    assert.ok(html.includes('<meta property="og:type" content="profile">'));
    assert.ok(html.includes('<meta property="og:image" content="https://cdn.example.com/a.png">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary">'));
    assert.ok(html.includes('<meta property="og:title" content="Sari &lt;Toko&gt; (@sari)">'));
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, 'JSON-LD present');
    assert.ok(!m![1].includes('<'), 'JSON-LD has no raw <');
    const ld = JSON.parse(m![1]);
    assert.equal(ld['@type'], 'ProfilePage');
    assert.equal(ld.mainEntity['@type'], 'Person');
    assert.equal(ld.mainEntity.name, 'Sari <Toko>');
    assert.equal(ld.mainEntity.alternateName, '@sari');
    assert.deepEqual(ld.mainEntity.sameAs, ['https://instagram.com/sari']);
    assert.deepEqual(ld.significantLink, ['https://shop.example.com/0']);
    assert.equal(ld.dateModified, '2025-10-27T16:00:00.000Z');
  });

  test('bio page of default guest handle or without links is noindex', async () => {
    seedProfile('edge_abc123', 'usr_guest', { guest: true });
    seedProfile('kosong', 'usr_empty', { links: 0, bio: '' });
    const guest = await (await app.fetch(new Request('http://localhost/@edge_abc123'), env)).text();
    assert.ok(guest.includes('<meta name="robots" content="noindex, follow">'));
    const empty = await (await app.fetch(new Request('http://localhost/@kosong', { headers: { 'accept-language': 'id-ID,id;q=0.9' } }), env)).text();
    assert.ok(empty.includes('<meta name="robots" content="noindex, follow">'));
    assert.ok(empty.includes('<meta name="description" content="Semua link Sari &lt;Toko&gt; di satu halaman.'), 'fallback description');
  });

  test('API responses carry X-Robots-Tag noindex', async () => {
    const res = await app.fetch(new Request('http://localhost/api/links', { headers: { Authorization: 'Bearer usr_test123' } }), env);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  });

  test('crawler and link-preview hits on short links are not counted as clicks', async () => {
    seedProfile('sari', 'usr_sari');
    const hit = (ua: string) => app.fetch(new Request('http://localhost/sari0', { headers: { 'user-agent': ua, 'cf-ipcountry': 'ID' } }), env);
    assert.equal((await hit('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).status, 302);
    await hit('WhatsApp/2.23.20.0 A');
    await hit('facebookexternalhit/1.1');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(mockDb.tables.link_analytics.length, 0, 'bots not counted');
    await hit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(mockDb.tables.link_analytics[0]?.clicks, 1, 'human counted');
  });

  describe('media upload (R2)', () => {
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3]);
    const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 8, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 9, 9]);
    const upload = (body: BodyInit, headers: Record<string, string> = { Authorization: 'Bearer usr_test123' }) =>
      app.fetch(new Request('http://localhost/api/media/avatar', { method: 'POST', body, headers }), env);
    let r2: MockR2;
    beforeEach(() => {
      r2 = new MockR2();
      env.MEDIA = r2 as any;
    });

    test('rejects missing auth and guest accounts', async () => {
      assert.equal((await upload(PNG, {})).status, 401);
      mockDb.tables.users.push({ id: 'usr_guest', email: 'g@x', api_key: 'k_guest', is_guest: 1, created_at: 1, updated_at: 1 });
      assert.equal((await upload(PNG, { Authorization: 'Bearer usr_guest' })).status, 403);
      assert.equal(r2.objects.size, 0);
    });

    test('rejects SVG, HTML and oversized bodies by content, not header', async () => {
      const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      assert.equal((await upload(svg, { Authorization: 'Bearer usr_test123', 'Content-Type': 'image/png' })).status, 415);
      const big = new Uint8Array(512 * 1024 + 1);
      big.set(PNG);
      assert.equal((await upload(big)).status, 413);
      assert.equal(r2.objects.size, 0);
    });

    test('stores image under content-hash key and serves it immutable', async () => {
      const res = await upload(WEBP);
      assert.equal(res.status, 200);
      const url = ((await res.json()) as any).data.url as string;
      assert.match(url, /^https:\/\/edgelink\.id\/m\/avatars\/usr_test123\/[a-f0-9]{16}\.webp$/);
      const served = await app.fetch(new Request(url.replace('https://edgelink.id', 'http://localhost')), env);
      assert.equal(served.status, 200);
      assert.equal(served.headers.get('content-type'), 'image/webp');
      assert.match(served.headers.get('cache-control') || '', /immutable/);
      assert.deepEqual(new Uint8Array(await served.arrayBuffer()), WEBP);
    });

    test('media route rejects traversal and unknown keys', async () => {
      for (const p of ['/m/avatars/usr_test123/..%2Fsecret.webp', '/m/avatars/a/b.svg', '/m/avatars/usr_test123/0123456789abcdef.webp']) {
        assert.equal((await app.fetch(new Request('http://localhost' + p), env)).status, 404, p);
      }
    });

    test('pruneAvatars keeps current photo only within own prefix', async () => {
      await r2.put('avatars/usr_test123/aaaaaaaaaaaaaaaa.webp', new ArrayBuffer(1));
      await r2.put('avatars/usr_test123/bbbbbbbbbbbbbbbb.webp', new ArrayBuffer(1));
      await r2.put('avatars/usr_other/cccccccccccccccc.webp', new ArrayBuffer(1));
      assert.equal(await pruneAvatars(r2 as any, 'usr_test123', 'avatars/usr_test123/bbbbbbbbbbbbbbbb.webp'), 1);
      assert.deepEqual([...r2.objects.keys()].sort(), ['avatars/usr_other/cccccccccccccccc.webp', 'avatars/usr_test123/bbbbbbbbbbbbbbbb.webp']);
      assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff]))?.ext, 'jpg');
    });
  });
});
