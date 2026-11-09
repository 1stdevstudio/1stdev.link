import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_CLEANUP_BATCH, GUEST_EXPIRY_SECONDS, guestExpired, expireGuestWorkspaces } from '../src/guestCleanup.js';

const day = 86400;
const now = 2_000_000_000;

describe('unclaimed guest expiry safety', () => {
  test('guests have seven days; migration day gives old workspaces a fresh grace window', () => {
    assert.equal(GUEST_EXPIRY_SECONDS, 7 * day);
    assert.ok(GUEST_CLEANUP_BATCH <= 5);
    assert.equal(guestExpired(now - 8*day, now - 8*day, now - 8*day, now, now), false);
    assert.equal(guestExpired(now - 8*day, now - 8*day, now - 8*day, now - 7*day, now), true);
    assert.equal(guestExpired(now - 8*day, now - 8*day, now - 1*day, now - 20*day, now), false);
    assert.equal(guestExpired(now - 8*day, now - 8*day, now - 8*day, now - 20*day, now), true);
  });

  test('no migration marker means no deletion or media cleanup', async () => {
    let touched = 0;
    const db = {
      prepare(query: string) {
        if (!query.includes('guest_expiration_policy')) throw Error('Unexpected SQL');
        return { first: async () => null };
      },
      batch: async () => { touched++; return []; },
    };
    const env = { DB: db, KV: { delete: async () => { touched++; } }, MEDIA: { delete: async () => { touched++; } } };
    assert.deepEqual(await expireGuestWorkspaces(env as any, now), { deleted: 0, cleaned: 0, pending: 0 });
    assert.equal(touched, 0);
  });

  test('missing bindings fail closed before deletion', async () => {
    await assert.rejects(() => expireGuestWorkspaces({ DB: {} } as any, now), /requires DB, KV, and MEDIA/);
  });

  test('deletes only due guests; invalidates KV and all media prefixes', async () => {
    const policyEnabled = now - 9*day;
    const users = [
      { id: 'guest', is_guest: 1, created_at: now - 15*day, updated_at: now - 15*day },
      { id: 'claimed', is_guest: 0, created_at: now - 15*day, updated_at: now - 15*day },
      { id: 'recent', is_guest: 1, created_at: now - 2*day, updated_at: now - 2*day },
      { id: 'edited', is_guest: 1, created_at: now - 15*day, updated_at: now - 15*day },
    ];
    const profiles = [
      { user_id: 'guest', handle: 'old_guest', updated_at: now - 15*day },
      { user_id: 'claimed', handle: 'verified', updated_at: now - 15*day },
      { user_id: 'recent', handle: 'new_guest', updated_at: now - 2*day },
      { user_id: 'edited', handle: 'working_guest', updated_at: now - day },
    ];
    const links = [{ user_id: 'guest', slug: 'guest-short', created_at: now - 13*day }];
    const jobs = new Map<string, { user_id:string; handle:string; slugs_json:string; kv_done:number; created_at:number }>();
    const storage = new Set(['avatars/guest/a.webp', 'covers/guest/b.webp', 'backgrounds/guest/c.webp', 'avatars/claimed/avatar.webp']);
    const deletes: string[] = [];
    const eligible = (u: typeof users[number], cutoff: number) =>
      u.is_guest === 1 && u.created_at <= cutoff && u.updated_at <= cutoff &&
      (profiles.find(p => p.user_id === u.id)?.updated_at || u.created_at) <= cutoff &&
      !links.some(l => l.user_id === u.id && l.created_at > cutoff);
    function prepare(sql: string) {
      let args: any[] = [];
      const statement = {
        bind(...values: any[]) { args = values; return statement; },
        async first() {
          if (sql.includes('guest_expiration_policy')) return { enabled_at: policyEnabled };
          if (sql.startsWith('SELECT id FROM users WHERE id')) return users.find(u => u.id === args[0]) || null;
          return null;
        },
        async all() {
          if (sql.startsWith('SELECT u.id, p.handle')) return { results: users.filter(u => eligible(u, args[0])).slice(0, args[4]).map(u => ({ id: u.id, handle: profiles.find(p => p.user_id === u.id)?.handle || null })) };
          if (sql.startsWith('SELECT slug FROM links')) return { results: links.filter(l => l.user_id === args[0]).map(l => ({ slug: l.slug })) };
          if (sql.startsWith('SELECT user_id, handle, slugs_json, kv_done')) return { results: [...jobs.values()].sort((a,b)=>a.created_at-b.created_at).slice(0,args[0]) };
          throw Error('Unexpected all SQL: ' + sql);
        },
        async run() {
          if (sql.startsWith('DELETE FROM guest_cleanup_jobs')) jobs.delete(args[0]);
          else if (sql.startsWith('UPDATE guest_cleanup_jobs SET kv_done')) { const j=jobs.get(args[0]); if(j) j.kv_done=1; }
          else if (!sql.startsWith('DELETE FROM auth_challenges')) throw Error('Unexpected run SQL: ' + sql);
          return { success: true };
        },
        _args: () => args,
        _sql: sql,
      };
      return statement;
    }
    const db = {
      prepare,
      async batch(statements: any[]) {
        const [insert, deletion] = statements;
        const [id, handle, slugs, createdAt] = insert._args();
        if (!jobs.has(id)) jobs.set(id,{user_id:id,handle,slugs_json:slugs,kv_done:0,created_at:createdAt});
        const [userId, cutoff] = deletion._args();
        const index=users.findIndex(u=>u.id===userId && eligible(u,cutoff));
        if(index<0) return [{success:true},{results:[]}];
        users.splice(index,1);
        for (let i=profiles.length-1;i>=0;i--) if(profiles[i].user_id===userId)profiles.splice(i,1);
        for (let i=links.length-1;i>=0;i--) if(links[i].user_id===userId)links.splice(i,1);
        return [{success:true},{results:[{id:userId}]}];
      },
    };
    const kv={delete:async(k:string)=>{deletes.push(k);}};
    const media={
      async list({prefix,limit}:{prefix:string;limit:number}) {
        const found=[...storage].filter(k=>k.startsWith(prefix));
        return {objects:found.slice(0,limit).map(key=>({key})),truncated:found.length>limit};
      },
      async delete(keys:string[]) {for(const key of keys) storage.delete(key);},
    };
    const result=await expireGuestWorkspaces({DB:db,KV:kv,MEDIA:media} as any,now);
    assert.equal(result.deleted,1);
    assert.equal(result.cleaned,1);
    assert.equal(users.length,3);
    assert.deepEqual(deletes,['bio:old_guest','slug:guest-short']);
    assert.deepEqual([...storage],['avatars/claimed/avatar.webp']);
    assert.equal(jobs.size,0);
    assert.equal((await expireGuestWorkspaces({DB:db,KV:kv,MEDIA:media} as any,now)).deleted,0);
  });
});
