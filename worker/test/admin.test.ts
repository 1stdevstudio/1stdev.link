import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { MockD1, MockKV, MockR2 } from './mocks.js';
import type { Env } from '../src/types.js';

describe('Admin Dashboard v1 — authorization and email step-up', () => {
  let env: Env;
  let db: MockD1;
  let kv: MockKV;
  const adminId = 'usr_owner1';
  const outsiderId = 'usr_outsider';
  const guestId = 'usr_gst_guest1';

  beforeEach(() => {
    db = new MockD1();
    kv = new MockKV();
    env = {
      DB: db as unknown as D1Database,
      KV: kv as unknown as KVNamespace,
      MEDIA: new MockR2() as unknown as R2Bucket,
      ENVIRONMENT: 'development'
    };
    db.tables.users.push(
      { id: adminId, email: 'owner@example.test', api_key: 'owner-secret', is_guest: 0, created_at: 100, updated_at: 100 },
      { id: outsiderId, email: 'outsider@example.test', api_key: 'outsider-secret', is_guest: 0, created_at: 100, updated_at: 100 },
      { id: guestId, email: 'guest@edgelink.local', api_key: 'guest-secret', is_guest: 1, created_at: 100, updated_at: 100 }
    );
    db.tables.admin_memberships.push({ user_id: adminId, role: 'owner', granted_at: 100 });
    // This must never elevate an unclaimed workspace even if a role row appears by mistake.
    db.tables.admin_memberships.push({ user_id: guestId, role: 'admin', granted_at: 100 });
  });

  const call = (path: string, secret?: string, options?: { method?: string; adminToken?: string; body?: object }) => {
    return app.fetch(new Request('https://1stdev.link' + path, {
      method: options?.method || 'GET',
      headers: {
        ...(secret ? { Authorization: 'Bearer ' + secret } : {}),
        ...(options?.adminToken ? { 'X-Admin-Session': options.adminToken } : {}),
        ...(options?.body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {})
    }), env);
  };

  test('role lookup requires a valid secret and ignores guest role rows', async () => {
    assert.equal((await call('/api/admin/status')).status, 401);
    const regular = await call('/api/admin/status', 'outsider-secret');
    assert.equal(regular.status, 200);
    assert.equal(((await regular.json()) as any).data.is_admin, false);
    const guest = await call('/api/admin/status', 'guest-secret');
    assert.equal(guest.status, 200);
    assert.equal(((await guest.json()) as any).data.is_admin, false);
    const owner = await call('/api/admin/status', 'owner-secret');
    assert.equal(owner.status, 200);
    assert.equal(((await owner.json()) as any).data.is_admin, true);
  });

  test('nonowners cannot request OTP or enumerate users even with admin token', async () => {
    assert.equal((await call('/api/admin/otp', 'outsider-secret', { method: 'POST' })).status, 403);
    assert.equal((await call('/api/admin/otp', 'guest-secret', { method: 'POST' })).status, 403);
    assert.equal((await call('/api/admin/overview', 'owner-secret')).status, 401);
    assert.equal((await call('/api/admin/users', 'owner-secret')).status, 401);
    assert.equal((await call('/api/admin/overview', 'outsider-secret', { adminToken: 'a'.repeat(64) })).status, 403);
    assert.equal((await call('/api/admin/otp/verify', 'outsider-secret', { method: 'POST', body: { code: '000000' } })).status, 403);
  });

  test('a fresh single-use email OTP unlocks a 30-minute, role-bound admin session', async () => {
    const sent = await call('/api/admin/otp', 'owner-secret', { method: 'POST' });
    assert.equal(sent.status, 200);
    const sentJson = (await sent.json()) as any;
    assert.equal(sentJson.status, 'success');
    assert.equal(sentJson.dev_code, undefined, 'verification code must not be returned to the browser');
    const entry = await kv.get<{ code: string; challenge_id: string }>('admin:otp:' + adminId, 'json');
    assert.match(entry?.code || '', /^\d{6}$/);

    const wrong = await call('/api/admin/otp/verify', 'owner-secret', { method: 'POST', body: { code: 'abcdef' } });
    assert.equal(wrong.status, 400);
    const valid = await call('/api/admin/otp/verify', 'owner-secret', { method: 'POST', body: { code: entry!.code } });
    assert.equal(valid.status, 200);
    const { admin_token: token, expires_at: expires } = ((await valid.json()) as any).data;
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.ok(expires >= Math.floor(Date.now() / 1000) + 1700);
    assert.equal((await kv.get('admin:session:' + token)), null, 'KV stores a token hash, not the raw token');
    assert.equal((await call('/api/admin/overview', 'owner-secret', { adminToken: token })).status, 200);
    assert.equal((await call('/api/admin/users', 'owner-secret', { adminToken: token })).status, 200);
    assert.equal((await call('/api/admin/overview', 'outsider-secret', { adminToken: token })).status, 403);
    assert.equal((await call('/api/admin/overview', 'guest-secret', { adminToken: token })).status, 403);
    assert.equal((await call('/api/admin/otp/verify', 'owner-secret', { method: 'POST', body: { code: entry!.code } })).status, 401, 'OTP cannot be replayed');

    // Revoking the membership instantly blocks every admin route.
    db.tables.admin_memberships = [];
    assert.equal((await call('/api/admin/overview', 'owner-secret', { adminToken: token })).status, 403);
  });

  test('admin directory and account detail never exposes secrets to unauthenticated clients', async () => {
    const requests = [
      '/api/admin/users?q=owner',
      '/api/admin/users/usr_owner1/links',
      '/api/admin/overview'
    ];
    for (const path of requests) {
      const response = await call(path);
      assert.equal(response.status, 403, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(await response.text(), /owner@example.test|owner-secret|admin_token/);
    }
  });
});
