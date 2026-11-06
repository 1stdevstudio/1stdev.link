import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { checkRateLimit, hashRateLimitKey, RATE_LIMIT_SQL } from '../src/security.js';
import { CLAIM_MEDIA_CLEANUP_SQL } from '../src/media.js';

test('atomic limiter and quota trigger hold under concurrent SQLite connections', () => {
  const schema = readFileSync(new URL('../schema.sql', import.meta.url).pathname, 'utf8');
  const migration = readFileSync(new URL('../migrations/0003_release_hardening.sql', import.meta.url).pathname, 'utf8');
  const python = `import sqlite3, tempfile, concurrent.futures, sys
with tempfile.TemporaryDirectory() as tmp:
 path=tmp+'/audit.db'
 c=sqlite3.connect(path,isolation_level=None)
 c.executescript(sys.argv[1]); c.executescript(sys.argv[3]); c.executescript(sys.argv[3])
 q=sys.argv[2]
 def attempt(i):
  db=sqlite3.connect(path,timeout=10,isolation_level=None)
  row=db.execute(q,('hashed-key',200,100,100,100,5)).fetchone()
  db.close(); return row is not None
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  assert sum(pool.map(attempt,range(40))) == 5
 assert c.execute('SELECT count FROM rate_limits WHERE key_hash=?',('hashed-key',)).fetchone()==(5,)
 assert c.execute(q,('hashed-key',301,201,201,201,5)).fetchone()==(1,301)
 c.execute("INSERT INTO users(id,email) VALUES('owner','owner@example.test')")
 def claim(_):
  db=sqlite3.connect(path,timeout=10,isolation_level=None)
  result=db.execute(sys.argv[4],('owner',100000,13600)).fetchone()
  db.close(); return result is not None
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  assert sum(pool.map(claim,range(20)))==1
 c.execute("UPDATE media_cleanup_runs SET cursors_json=? WHERE user_id='owner'",('{"covers/owner/":"cursor-2"}',))
 assert c.execute(sys.argv[4],('owner',186400,100000)).fetchone()==('{"covers/owner/":"cursor-2"}',)
 for i in range(99): c.execute("INSERT INTO links(id,user_id,slug,destination_url) VALUES(?,?,?,?)",(str(i),'owner',str(i),'https://example.com'))
 def create(i):
  db=sqlite3.connect(path,timeout=10,isolation_level=None)
  try:
   db.execute("INSERT INTO links(id,user_id,slug,destination_url) VALUES(?,?,?,?)",('new'+str(i),'owner','new'+str(i),'https://example.com'))
   return True
  except sqlite3.IntegrityError as e:
   assert 'QUOTA_EXCEEDED' in str(e); return False
  finally: db.close()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  assert sum(pool.map(create,range(8)))==1
 assert c.execute("SELECT COUNT(*) FROM links WHERE user_id='owner'").fetchone()==(100,)
`;
  const result = spawnSync('python3', ['-c', python, schema, RATE_LIMIT_SQL, migration, CLAIM_MEDIA_CLEANUP_SQL], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('unavailable D1 fails closed and limiter keys never store raw identities', async () => {
  assert.deepEqual(await checkRateLimit(undefined, 'email:private@example.test', 1), {
    allowed: false, remaining: 0, serviceUnavailable: true,
  });
  const hashed = await hashRateLimitKey('email:private@example.test');
  assert.match(hashed, /^[a-f0-9]{64}$/);
  assert.equal(hashed.includes('private'), false);
});

test('KV outages cannot bypass D1 and expired deny markers do not extend a window', async () => {
  const bindings: unknown[][] = [];
  let count = 0;
  const db = {
    prepare: (sql: string) => ({ bind: (...args: unknown[]) => {
      bindings.push(args);
      return {
        first: async () => {
          if (sql.startsWith('SELECT reset_at')) return { reset_at: Math.floor(Date.now() / 1000) + 1 };
          if (count >= 1) return null;
          count++;
          return { count, reset_at: Math.floor(Date.now() / 1000) + 1 };
        },
        run: async () => ({ success: true }),
      };
    } }),
  } as unknown as D1Database;
  const kv = { get: async () => { throw new Error('KV offline'); }, put: async () => { throw new Error('KV offline'); } } as unknown as KVNamespace;
  assert.equal((await checkRateLimit(kv, 'sensitive-identity', 1, 1, db)).allowed, true);
  assert.equal((await checkRateLimit(kv, 'sensitive-identity', 1, 1, db)).allowed, false);
  assert.equal(bindings.some((row) => row.includes('sensitive-identity')), false);
  count = 0;
  const expiredMarker = { get: async () => String(Math.floor(Date.now() / 1000) - 1), put: async () => {} } as unknown as KVNamespace;
  assert.equal((await checkRateLimit(expiredMarker, 'sensitive-identity', 1, 1, db)).allowed, true);
});
