import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import app from '../src/index.js';
import { MockD1, MockKV } from './mocks.js';
import { validateDestinationUrl, sendOtpEmail } from '../src/security.js';
import { renderBioPage } from '../src/bio.js';
import { ATTEMPT_CHALLENGE_SQL } from '../src/authChallenges.js';
import type { Env } from '../src/types.js';

describe('security regressions', () => {
  let db: MockD1;
  let env: Env;
  beforeEach(() => {
    db = new MockD1();
    db.tables.users.push({ id: 'a', api_key: 'secret-a', email: 'a@example.com' }, { id: 'b', api_key: 'secret-b', email: 'b@example.com' });
    env = { DB: db as any, KV: new MockKV() as any, ENVIRONMENT: 'development' };
  });
  const request = (path: string, body: unknown, token = 'secret-a', method = 'POST') => app.fetch(new Request(`https://1stdev.link${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  }), env);

  test('rejects malformed profile data before writing', async () => {
    for (const body of [null, [], { handle: 42 }, { display_name: {} }, { social_links: 'null' }, { social_links: '[]' }, { social_links: '{' }, { social_links: { github: 'javascript:alert(1)' } }, { avatar_url: 'http://localhost.' }, { style: { cover_url: {} } }]) {
      const res = await request('/api/bio-profile', body, 'secret-a', 'PUT');
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(db.tables.bio_profiles.length, 0);
    }
  });
  test('SSR survives legacy null, array and malformed social/style JSON', () => {
    for (const raw of ['null', '[]', '{', '42']) {
      const html = renderBioPage({ user_id: 'a', handle: 'a', display_name: '<script>alert(1)</script>', social_links: raw, style: raw, updated_at: 0 }, []);
      assert.match(html, /&lt;script&gt;/);
      assert.doesNotMatch(html, /<script>alert/);
    }
  });
  test('oversized JSON and invalid login field types return client errors', async () => {
    assert.equal((await request('/api/bio-profile', { bio: 'a'.repeat(70000) }, 'secret-a', 'PUT')).status, 413);
    assert.equal((await request('/api/auth/login', { credential: {} })).status, 400);
    assert.equal((await request('/api/auth/send-otp', { email: {} })).status, 400);
  });
  test('empty streamed POST bodies remain valid for guest onboarding', async () => {
    const body = new ReadableStream({ start(controller) { controller.close(); } });
    const request = new Request('https://1stdev.link/api/auth/guest', { method: 'POST', body, duplex: 'half' } as any);
    const response = await app.fetch(request, env);
    assert.equal(response.status, 201);
  });
  test('rejects private URL encodings but keeps public destinations', () => {
    for (const url of ['http://localhost.', 'http://sub.localhost.', 'http://127.1', 'http://2130706433', 'http://0x7f000001', 'http://[::ffff:127.0.0.1]', 'http://[fe90::1]', 'http://[::]', 'http://user:pass@example.com', 'file:///etc/passwd']) {
      assert.equal(validateDestinationUrl(url).valid, false, url);
    }
    assert.equal(validateDestinationUrl('https://example.com/path?q=1').valid, true);
    assert.equal(validateDestinationUrl('https://[2606:4700:4700::1111]/').valid, true);
  });
  test('profiles cannot grant their own platform verification badge', async () => {
    const res = await request('/api/bio-profile', { handle: 'alice', verified_badge: true }, 'secret-a', 'PUT');
    assert.equal(res.status, 200);
    assert.equal((await res.json() as any).data.verified_badge, false);
  });
  test('another tenant cannot read, edit or delete a link', async () => {
    db.tables.links.push({ id: 'private-link', user_id: 'a', slug: 'alice', destination_url: 'https://example.com', is_active: 1 });
    assert.equal((await request('/api/links/private-link', { title: 'stolen' }, 'secret-b', 'PATCH')).status, 404);
    assert.equal((await request('/api/links/private-link', {}, 'secret-b', 'DELETE')).status, 404);
    const analytics = await app.fetch(new Request('https://1stdev.link/api/links/private-link/analytics', { headers: { Authorization: 'Bearer secret-b' } }), env);
    assert.equal(analytics.status, 404);
    assert.equal(db.tables.links.length, 1);
  });
  test('production never previews OTP when delivery is unavailable', async () => {
    env.ENVIRONMENT = 'production';
    const res = await request('/api/auth/send-otp', { email: 'a@example.com', purpose: 'login' });
    assert.equal(res.status, 503);
    assert.doesNotMatch(await res.text(), /dev_code|preview/);
    assert.equal(await env.KV.get('otp:a@example.com'), null);
    assert.deepEqual(await sendOtpEmail(undefined, 'a@example.com', '123456', 'login'), { success: false, error: 'Email delivery unavailable' });
  });
  test('provider rejection cannot return a production OTP preview', async () => {
    const original = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      return new Response('{"message":"denied"}', { status: 403 });
    };
    try {
      const result = await sendOtpEmail('test', 'a@example.com', '123456', 'login');
      assert.equal(result.success, false);
      assert.equal(result.preview, undefined);
      assert.equal(attempts, 1, 'do not retry customer emails through the testing sender');
    } finally { globalThis.fetch = original; }
  });
  test('production OTP uses the configured verified sender and never exposes the code', async () => {
    const original = globalThis.fetch;
    let sent: any;
    env.ENVIRONMENT = 'production';
    env.RESEND_API_KEY = 'test-provider-key';
    env.EMAIL_FROM = '1stdev.link Security <no-reply@otp.1stdev.link>';
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://api.resend.com/emails');
      sent = JSON.parse(init!.body as string);
      return new Response('{"id":"email-accepted"}', { status: 200 });
    };
    try {
      const response = await request('/api/auth/send-otp', { email: 'recipient@example.com', purpose: 'login' });
      assert.equal(response.status, 200);
      assert.equal(sent.from, env.EMAIL_FROM);
      assert.deepEqual(sent.to, ['recipient@example.com']);
      const body = await response.text();
      assert.doesNotMatch(body, /dev_code|preview/);
      const otp = JSON.parse((await env.KV.get('otp:recipient@example.com'))!);
      assert.equal(otp.purpose, 'login');
      assert.match(sent.subject, new RegExp(otp.code));
      assert.ok(!body.includes(otp.code));
    } finally { globalThis.fetch = original; }
  });
  test('legacy claim requires verified email', async () => {
    assert.equal((await request('/api/auth/claim', { email: 'victim@example.com' })).status, 403);
    assert.equal(db.tables.users[0].email, 'a@example.com');
  });
  test('OTP binds purpose and claim session and succeeds only once in parallel', async () => {
    const sent = await request('/api/auth/send-otp', { email: 'alice@example.com', purpose: 'claim' });
    const code = (await sent.json() as any).dev_code;
    assert.match(code, /^\d{6}$/);
    assert.equal((await request('/api/auth/verify-otp', { email: 'alice@example.com', code, purpose: 'login' })).status, 400);
    assert.equal((await request('/api/auth/verify-otp', { email: 'alice@example.com', code, purpose: 'claim' }, 'secret-b')).status, 403);
    // Login flow uses the same consumption gate without a claim UPDATE in the mock.
    const sentLogin = await request('/api/auth/send-otp', { email: 'a@example.com', purpose: 'login' });
    const loginCode = (await sentLogin.json() as any).dev_code;
    const results = await Promise.all(Array.from({ length: 6 }, () => request('/api/auth/verify-otp', { email: 'a@example.com', code: loginCode, purpose: 'login' })));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
  });
  test('three wrong OTP attempts invalidate the code', async () => {
    const sent = await request('/api/auth/send-otp', { email: 'a@example.com', purpose: 'login' });
    const code = (await sent.json() as any).dev_code;
    for (let i = 0; i < 3; i++) assert.equal((await request('/api/auth/verify-otp', { email: 'a@example.com', code: '000000', purpose: 'login' })).status, 401);
    assert.equal((await request('/api/auth/verify-otp', { email: 'a@example.com', code, purpose: 'login' })).status, 401);
  });
  test('parallel handoff claims return the access key exactly once', async () => {
    const sent = await request('/api/auth/handoff', {});
    const { code } = (await sent.json() as any).data;
    const results = await Promise.all(Array.from({ length: 8 }, () => request('/api/auth/handoff/claim', { code }, '')));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    for (const res of results) assert.equal(res.headers.get('cache-control'), 'no-store');
  });
  test('challenge migration and atomic attempt SQL execute on SQLite', () => {
    const migration = readFileSync(new URL('../migrations/0001_auth_challenges.sql', import.meta.url).pathname, 'utf8');
    const script = `import sqlite3, sys
c = sqlite3.connect(':memory:')
c.executescript(sys.argv[3])
assert {'style','avatar_shape','verified_badge'}.issubset({r[1] for r in c.execute('PRAGMA table_info(bio_profiles)')})
assert {'style','block_type'}.issubset({r[1] for r in c.execute('PRAGMA table_info(links)')})
c.executescript(sys.argv[1])
c.executescript(sys.argv[1])
c.execute("INSERT INTO auth_challenges(id,user_id,expires_at) VALUES('once','a',200)")
q = sys.argv[2]
assert c.execute(q,(1,'once','b',100)).fetchone() is None
assert c.execute(q,(1,'once','a',100)).fetchone() == (1,)
assert c.execute(q,(1,'once','a',100)).fetchone() is None
c.execute("INSERT INTO auth_challenges(id,user_id,expires_at) VALUES('attempts',NULL,200)")
for i in range(3): assert c.execute(q,(0,'attempts',None,100)).fetchone() == (0,)
assert c.execute(q,(1,'attempts',None,100)).fetchone() is None
c.execute("INSERT INTO auth_challenges(id,user_id,expires_at) VALUES('expired','a',50)")
assert c.execute(q,(1,'expired','a',100)).fetchone() is None
`;
    const schema = readFileSync(new URL('../schema.sql', import.meta.url).pathname, 'utf8');
    const result = spawnSync('python3', ['-c', script, migration, ATTEMPT_CHALLENGE_SQL, schema], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
});
