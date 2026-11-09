import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { MockD1, MockKV } from './mocks.js';
import { looksLikeMarkupAttack, unsafePlainTextReason } from '../src/contentSafety.js';
import { validateProfilePatch } from '../src/profileValidation.js';
import { renderBioPage } from '../../shared/renderBioPage.js';
import type { Env } from '../src/types.js';

describe('XSS and anti-abuse regression tests', () => {
  let db: MockD1, kv: MockKV, env: Env;
  beforeEach(() => {
    db = new MockD1(); kv = new MockKV();
    env = { DB: db as unknown as D1Database, KV: kv as unknown as KVNamespace, BASE_URL: 'https://1stdev.link' };
    db.tables.users.push({ id:'usr_test', email:'creator@example.com', api_key:'secret-for-tests', is_guest:0, created_at:1000, updated_at:1000 });
    db.tables.bio_profiles.push({ user_id:'usr_test', handle:'creator', display_name:'Creator', bio:'Halo dunia', updated_at:1000 });
  });

  const api = (path: string, body: object, method: string) => app.fetch(new Request('https://1stdev.link'+path, {
    method,
    headers: { Authorization:'Bearer secret-for-tests', 'Content-Type':'application/json' },
    body: JSON.stringify(body),
  }), env);

  test('detects executable markup (raw, encoded, and zero-width obfuscation)', () => {
    const cases = [
      '<script>alert(1)</script>',
      'Hacker <script>alert(1)</script><img src=x onerror=alert(2)>',
      '<img src=x onerror=alert(2)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '&amp;lt;img src=x onerror=alert(1)&amp;gt;',
      '&#x3c;svg onload=alert(1)&#x3e;',
      '<scr\u200bipt>alert(1)</scr\u200bipt>',
    ];
    for (const sample of cases) {
      assert.equal(looksLikeMarkupAttack(sample), true, sample);
      assert.ok(unsafePlainTextReason(sample, 2000), sample);
    }
    for (const safe of ['Yogi Iskandar', 'Kopi & Kue', 'A < B', '<3', '100% Aman', 'Developer (HTML/CSS)', 'Paket < 50K']) {
      assert.equal(looksLikeMarkupAttack(safe), false, safe);
      assert.equal(unsafePlainTextReason(safe, 100), null, safe);
    }
    for (const spoof of ['A\u202eB', 'A\u0000B', 'A\u001bB']) assert.ok(unsafePlainTextReason(spoof,100));
  });

  test('profile API rejects markup in name and bio without overwriting existing fields', async () => {
    const payloads = [
      { display_name: 'Hacker <script>alert(1)</script>' },
      { display_name: 'Hacker <img src=x onerror=alert(2)>' },
      { display_name: '&amp;lt;script&amp;gt;' },
      { bio: '<svg/onload=alert(1)>' },
      { display_name: 'A\u202eB' }
    ];
    for (const p of payloads) {
      const res = await api('/api/bio-profile', p, 'PUT');
      assert.equal(res.status, 400, JSON.stringify(p));
      assert.equal(db.tables.bio_profiles[0].display_name, 'Creator');
    }
    assert.equal((await api('/api/bio-profile', { display_name: 'A < B', bio: 'Kopi & Kue' }, 'PUT')).status, 200);
  });

  test('creating and editing link titles cannot persist markup', async () => {
    const response = await api('/api/links', { destination_url:'https://example.com/', title:'<img src=x onerror=alert(2)>' }, 'POST');
    assert.equal(response.status,400);
    assert.equal(db.tables.links.length,0);
    const good = await api('/api/links', { destination_url:'https://example.com/', title:'A < B' }, 'POST');
    assert.equal(good.status,201);
    const linkId = (await good.json() as any).data.id as string;
    assert.equal((await api('/api/links/'+encodeURIComponent(linkId), { title:'<svg onload=alert(1)>' }, 'PATCH')).status,400);
    assert.equal(db.tables.links[0].title,'A < B');
    assert.equal((await api('/api/links/'+encodeURIComponent(linkId), { title:'A'.repeat(281) }, 'PATCH')).status,400);
  });

  test('public SSR escapes old unsafe name and ignores malformed CSS and media values', () => {
    const html = renderBioPage({
      user_id:'usr_test',
      handle:'creator',
      display_name:'Hacker <script>alert(1)</script><img src=x onerror=alert(2)>',
      avatar_url:'javascript:alert(2)',
      avatar_shape:'circle" onmouseover="alert(4)' as any,
      style:JSON.stringify({
        btn:'soft" onclick="alert(3)', hover:'none" onmouseover="alert(4)',
        bg_image:'https://example.com/test.jpg");body{background:red',
        cover_url:'data:text/html,<script>alert(1)</script>'
      }),
    } as any, [], 'https://1stdev.link');
    assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html,/&lt;img src=x onerror=alert\(2\)&gt;/);
    assert.doesNotMatch(html,/<script>alert\(1\)<\/script>|<img src=x onerror|onclick="alert\(3\)"|onmouseover="alert\(4\)"/);
    assert.doesNotMatch(html,/javascript:alert\(2\)|data:text\/html|body\{background:red/);
    assert.match(html,/btn-soft hover-none/);
  });

  test('browser security headers have an additional CSP object ban', async () => {
    const response = await app.fetch(new Request('https://1stdev.link/health'),env);
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-security-policy')||'',/object-src 'none'/);
    assert.match(response.headers.get('permissions-policy')||'',/geolocation=\(\)/);
  });

  test('guest registration generates long IDs and creates user/profile together', async () => {
    const res = await app.fetch(new Request('https://1stdev.link/api/auth/guest',{ method:'POST' }),env);
    assert.equal(res.status,201);
    const body=(await res.json() as any).data;
    assert.match(body.user_id,/^usr_gst_[a-f0-9]{12}$/);
    assert.match(body.handle,/^edge_[a-f0-9]{12}$/);
    assert.equal(db.tables.bio_profiles.filter(p=>p.user_id===body.user_id).length,1);
  });
});
