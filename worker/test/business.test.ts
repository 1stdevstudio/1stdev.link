import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import app from '../src/index.js';
import { MockD1, MockKV } from './mocks.js';
import type { Env } from '../src/types.js';
import { defaultBusinessData, validateBusinessData, businessOpenStatus, readBusiness, type CatalogData, type InfoData } from '../../shared/business.js';
import { renderBusinessBlock } from '../../shared/renderBusiness.js';
import { renderBioPage } from '../src/bio.js';

const catalog = (): CatalogData => ({ ...defaultBusinessData('catalog') as CatalogData, categories: ['Minuman'], items: [{ id: 'coffee', name: 'Kopi susu', description: 'Susu segar', category: 'Minuman', image_url: '', price: 22000, price_kind: 'fixed', unit: 'gelas', status: 'available', duration: null }] });
describe('business mode', () => {
  let db: MockD1, env: Env;
  beforeEach(() => {
    db = new MockD1(); env = { DB: db as any, KV: new MockKV() as any };
    db.tables.users.push({ id: 'a', email: 'a@example.com', api_key: 'token-a' }, { id: 'b', email: 'b@example.com', api_key: 'token-b' });
  });
  const api = (path: string, method = 'GET', body?: unknown, token = 'token-a') => app.fetch(new Request('https://1stdev.link' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
  const create = async (data = catalog()) => {
    const res = await api('/api/links', 'POST', { title: 'Menu', block_type: 'catalog', data_json: data, destination_url: '#', slug: 'menu' });
    assert.equal(res.status, 201, await res.clone().text()); return (await res.json() as any).data;
  };
  test('business settings persist and old profiles default to personal', async () => {
    assert.equal(readBusiness(undefined).mode, 'personal');
    const business = { version: 1, mode: 'business', industry: 'services', skin: 'paper' };
    assert.equal((await api('/api/bio-profile', 'PUT', { handle: 'studio', business })).status, 200);
    const profile = (await (await api('/api/bio-profile')).json() as any).data;
    assert.deepEqual(profile.business, business);
    const html = await (await app.fetch(new Request('https://1stdev.link/@studio'), env)).text();
    assert.match(html, /class="business-page business-paper"/);
    assert.equal((await api('/api/bio-profile', 'PUT', { business: { ...business, industry: 'arbitrary' } })).status, 400);
  });
  test('catalog data roundtrips through create, list, edit and SSR', async () => {
    const link = await create();
    assert.equal(JSON.parse(link.data_json).items[0].price, 22000);
    const listed = (await (await api('/api/links')).json() as any).data;
    assert.equal(JSON.parse(listed[0].data_json).items[0].name, 'Kopi susu');
    const data = catalog(); data.items[0].price = 25000; data.layout = 'grid';
    assert.equal((await api('/api/links/' + link.id, 'PATCH', { data_json: data })).status, 200);
    const row = db.tables.links[0];
    const html = renderBusinessBlock(row);
    assert.match(html, /25.000/); assert.match(html, /biz-grid/);
    assert.equal((await app.fetch(new Request('https://1stdev.link/menu'), env)).status, 404);
    assert.equal(await env.KV.get('slug:menu'), null);
    assert.equal((await api('/api/links/' + link.id, 'PATCH', { destination_url: 'https://example.com' })).status, 400);
    assert.equal((await app.fetch(new Request('https://1stdev.link/menu'), env)).status, 404);
  });
  test('business blocks remain tenant scoped on edit and delete', async () => {
    const link = await create();
    assert.equal((await api('/api/links/' + link.id, 'PATCH', { data_json: catalog() }, 'token-b')).status, 404);
    assert.equal((await api('/api/links/' + link.id, 'DELETE', undefined, 'token-b')).status, 404);
    assert.equal(db.tables.links[0].user_id, 'a');
  });
  test('preset is idempotent and preserves existing business data and other tenants', async () => {
    const existing = await create();
    assert.equal((await api('/api/business/preset', 'POST', { industry: 'retail' })).status, 200);
    assert.equal((await api('/api/business/preset', 'POST', { industry: 'retail' })).status, 200);
    assert.equal(db.tables.links.filter((l) => l.user_id === 'a').length, 4);
    assert.equal(JSON.parse(db.tables.links.find((l) => l.id === existing.id)!.data_json).items.length, 1);
    assert.equal(db.tables.links.filter((l) => l.user_id === 'b').length, 0);
    assert.equal((await api('/api/business/preset', 'POST', { industry: 'invalid' })).status, 400);
    assert.equal((await api('/api/business/preset', 'POST', { industry: 'fnb' }, '')).status, 401);
  });
  test('invalid prices, duplicate IDs, missing categories and invalid schemas reject before writes', async () => {
    for (const mutate of [(d: CatalogData) => { d.items[0].price = -1; }, (d: CatalogData) => { d.items[0].price = 1.5; }, (d: CatalogData) => { d.items.push({ ...d.items[0] }); }, (d: CatalogData) => { d.categories = []; }]) {
      const data = catalog(); mutate(data);
      assert.equal((await api('/api/links', 'POST', { title: 'Menu', block_type: 'catalog', data_json: data })).status, 400);
    }
    assert.equal((await api('/api/links', 'POST', { title: 'Menu', block_type: 'catalog', data_json: 'null' })).status, 400);
    assert.equal(db.tables.links.length, 0);
  });
  test('private image, map and website URLs reject at API boundary', async () => {
    const data = catalog(); data.items[0].image_url = 'http://127.0.0.1/image.jpg';
    assert.equal((await api('/api/links', 'POST', { title: 'Menu', block_type: 'catalog', data_json: data })).status, 400);
    for (const kind of ['location', 'contact'] as const) {
      const value = defaultBusinessData(kind) as any; value[kind === 'location' ? 'map_url' : 'website'] = 'http://[::ffff:127.0.0.1]';
      assert.equal((await api('/api/links', 'POST', { title: 'Info', block_type: kind, data_json: value })).status, 400);
    }
  });
  test('SSR escapes catalog and announcement text, hides draft and hidden items', () => {
    const data = catalog(); data.items[0].name = '<script>alert(1)</script>';
    const row = { id: 'safe', title: '<img onerror=alert(1)>', block_type: 'catalog', data_json: JSON.stringify(data) } as any;
    const html = renderBusinessBlock(row);
    assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
    data.items[0].status = 'hidden'; row.data_json = JSON.stringify(data);
    assert.equal(renderBusinessBlock(row), '');
    for (const kind of ['catalog', 'business_info', 'location', 'contact', 'announcement'] as const) assert.equal(renderBusinessBlock({ ...row, block_type: kind, data_json: JSON.stringify(defaultBusinessData(kind)) }), '');
    const note = renderBusinessBlock({ ...row, block_type: 'announcement', data_json: JSON.stringify({ version: 1, kind: 'announcement', text: '</style><script>alert(1)</script>' }) });
    assert.doesNotMatch(note, /<script>/);
  });
  test('catalog limits bytes, counts and malformed structured data', () => {
    const data = catalog(); data.items = Array.from({ length: 51 }, (_, i) => ({ ...data.items[0], id: String(i) }));
    assert.throws(() => validateBusinessData('catalog', data));
    const utf8 = catalog(); utf8.items = Array.from({ length: 49 }, (_, i) => ({ ...utf8.items[0], id: String(i), description: '界'.repeat(240) }));
    assert.throws(() => validateBusinessData('catalog', utf8), /32 KiB/);
    assert.throws(() => validateBusinessData('catalog', { ...catalog(), version: 2 }));
    assert.throws(() => validateBusinessData('catalog', { ...catalog(), layout: 'malicious' }));
  });
  test('hours handle overnight, close boundary, timezone and temporary closure', () => {
    const data: InfoData = { ...defaultBusinessData('business_info') as InfoData, hours: [{ day: 1, open: '20:00', close: '02:00' }] };
    assert.equal(businessOpenStatus(data, new Date('2026-10-26T14:00:00Z')), 'open'); // Monday 21:00 WIB
    assert.equal(businessOpenStatus(data, new Date('2026-10-26T18:00:00Z')), 'open'); // Tuesday 01:00 WIB
    assert.equal(businessOpenStatus(data, new Date('2026-10-26T19:00:00Z')), 'closed');
    assert.equal(businessOpenStatus({ ...data, closed: true }, new Date('2026-10-26T14:00:00Z')), 'closed');
    assert.equal(businessOpenStatus({ ...data, hours: [] }), 'unknown');
    assert.equal(businessOpenStatus({ ...data, timezone: 'Asia/Jayapura' }, new Date('2026-10-26T18:00:00Z')), 'closed');
    assert.throws(() => validateBusinessData('business_info', { ...data, hours: [{ day: 1, open: '24:00', close: '01:00' }] }));
  });
  test('additive migration preserves old data and accepts structured JSON', () => {
    const migration = readFileSync(new URL('../migrations/0002_business_blocks.sql', import.meta.url).pathname, 'utf8');
    const result = spawnSync('python3', ['-c', `import sqlite3,sys
c=sqlite3.connect(':memory:')
c.executescript("CREATE TABLE bio_profiles(user_id TEXT PRIMARY KEY,handle TEXT); CREATE TABLE links(id TEXT PRIMARY KEY,user_id TEXT,title TEXT);")
c.execute("INSERT INTO bio_profiles VALUES('a','alice')")
c.execute("INSERT INTO links VALUES('link','a','Old link')")
c.executescript(sys.argv[1])
assert c.execute("SELECT handle,business_json FROM bio_profiles").fetchone()==('alice',None)
assert c.execute("SELECT title,data_json FROM links").fetchone()==('Old link',None)
c.execute("UPDATE links SET data_json=? WHERE id=? AND user_id=?", ('{"version":1}', 'link','a'))
try: c.execute("UPDATE links SET data_json='broken'"); raise AssertionError('invalid JSON accepted')
except sqlite3.IntegrityError: pass
`, migration], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
});
