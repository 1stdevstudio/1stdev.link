import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { defaultBusinessData, readBusiness, validateBusinessData, validateBusinessSettings, type BusinessData, type CatalogData } from '../../shared/business.js';
import { BUSINESS_CSS, renderBusinessBlock } from '../../shared/renderBusiness.js';
import { renderBioSeoHead, shouldIndexProfile, SITEMAP_PROFILES_SQL } from '../../shared/publicSeo.js';
import { validateDestinationUrl } from '../src/security.js';
import type { BioProfile, Link } from '../../shared/types.js';

const profile: BioProfile = { user_id: 'owner', handle: 'toko', display_name: 'Toko', updated_at: 1 };
const catalog = (): CatalogData => ({ ...defaultBusinessData('catalog') as CatalogData, items: [{ id: 'product', name: 'Kopi & susu', description: 'Segar', category: '', image_url: '', price: 22000, price_kind: 'fixed', unit: '', status: 'available', duration: null }] });
const block = (data: BusinessData | string, overrides: Partial<Link> = {}): Link => ({ id: 'catalog', user_id: 'owner', slug: 'catalog', title: 'Produk', block_type: typeof data === 'string' ? 'catalog' : data.kind, data_json: typeof data === 'string' ? data : JSON.stringify(data), destination_url: '#', is_bio_entry: 1, is_active: 1, sort_order: 0, created_at: 1, ...overrides });

describe('product contract', () => {
  test('legacy settings and catalogs keep optional fields absent', () => {
    const legacy = { version: 1, mode: 'business', industry: 'retail', skin: 'paper' };
    assert.deepEqual(validateBusinessSettings(legacy), legacy);
    assert.deepEqual(readBusiness(JSON.stringify(legacy)), legacy);
    assert.deepEqual(validateBusinessData('catalog', catalog()), catalog());
    for (const purpose of ['creator', 'business', 'affiliate']) assert.equal(validateBusinessSettings({ ...legacy, purpose }).purpose, purpose);
    assert.throws(() => validateBusinessSettings({ ...legacy, purpose: 'unknown' }));
    assert.throws(() => validateBusinessSettings({ ...legacy, purpose: null }));
  });

  test('catalog actions roundtrip referral spelling without adding tracking', () => {
    const data = catalog();
    const referral = 'https://Shop.Example.com?ref=a%2fb+z&ref=&coupon=%7e#Part';
    data.whatsapp = '+62 (812) 3456-7890'; data.disclosure = 'Tautan afiliasi; pembelian dapat memberi komisi.';
    data.items[0].action_url = referral; data.items[0].action_label = 'Lihat penawaran';
    const checked = validateBusinessData('catalog', JSON.stringify(data), (url) => validateDestinationUrl(url).valid) as CatalogData;
    assert.equal(checked.whatsapp, '6281234567890');
    assert.equal(checked.items[0].action_url, referral);
    assert.equal(checked.items[0].action_label, data.items[0].action_label);
    const html = renderBusinessBlock(block(checked));
    assert.ok(html.includes('href="' + referral.replaceAll('&', '&amp;') + '"'));
    assert.match(html, /rel="noopener noreferrer sponsored"/);
    assert.match(html, /Tautan afiliasi/);
    assert.doesNotMatch(html, /utm_|<script\b|wa\.me/);
    const regular = catalog(); regular.items[0].action_url = 'https://example.com/';
    assert.match(renderBusinessBlock(block(regular)), />Lihat produk<\/a>/);
    assert.doesNotMatch(renderBusinessBlock(block(regular)), /sponsored/);
  });

  test('new optional fields enforce types, limits, country digits and server URL policy', () => {
    for (const extra of [{ whatsapp: '08123456789' }, { whatsapp: '62abc81234567' }, { whatsapp: '+' }, { whatsapp: null }, { disclosure: 'x'.repeat(281) }, { disclosure: false }]) {
      assert.throws(() => validateBusinessData('catalog', { ...catalog(), ...extra }));
    }
    for (const extra of [{ action_label: 'x'.repeat(41) }, { action_label: null }, { action_url: null }]) {
      const data = catalog(); Object.assign(data.items[0], extra);
      assert.throws(() => validateBusinessData('catalog', data));
    }
    const data = catalog(); data.items[0].action_url = 'https://shop.example.com/?ref=1';
    const seen: string[] = [];
    assert.throws(() => validateBusinessData('catalog', data, (url) => { seen.push(url); return false; }));
    assert.deepEqual(seen, [data.items[0].action_url]);
  });

  test('public validation rejects dangerous schemes, credentials and private literal URLs', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', '//example.com/', 'https://a:b@example.com/', 'http://localhost./x', 'http://127.1/', 'http://2130706433/', 'http://10.0.0.1/', 'http://172.16.0.1/', 'http://192.168.1.1/', 'http://169.254.169.254/', 'http://100.64.0.1/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]/', 'https://example.com/\nredirect']) {
      const data = catalog(); data.items[0].action_url = url;
      assert.throws(() => validateBusinessData('catalog', data), url);
      assert.equal(renderBusinessBlock(block(data)), '', url);
      assert.equal(shouldIndexProfile(profile, [block(data)]), false, url);
    }
    const data = catalog(); data.items[0].image_url = 'http://127.0.0.1/image.jpg';
    assert.equal(renderBusinessBlock(block(data)), '');
  });

  test('all new public copy is escaped and only available products get actions', () => {
    const data = catalog();
    data.disclosure = '<img src=x onerror=alert(1)>';
    data.items[0].name = '<script>alert(1)</script>';
    data.items[0].action_url = 'https://example.com/?ref=%22&coupon=%3Cscript%3E';
    data.items[0].action_label = '<b>Pesan</b>';
    data.items.push({ ...data.items[0], id: 'unavailable', name: 'Tidak tersedia', status: 'unavailable' });
    data.items.push({ ...data.items[0], id: 'hidden', name: 'Rahasia', status: 'hidden' });
    const html = renderBusinessBlock(block(data, { title: '<svg onload=alert(1)>' }));
    assert.match(html, /&lt;svg/); assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;b&gt;Pesan&lt;\/b&gt;/);
    assert.match(html, /class="biz-disclosure">&lt;img/);
    assert.equal((html.match(/class="biz-action biz-product-action"/g) || []).length, 1);
    assert.doesNotMatch(html, /<script\b|<svg onload|<img src=x|<b>Pesan|Rahasia/);
  });

  test('WhatsApp action encodes only the product name and hides inactive item actions', () => {
    const data = catalog(); data.whatsapp = '628123456789'; data.items[0].name = 'Kopi & susu / 250ml?';
    data.items.push({ ...data.items[0], id: 'unavailable', status: 'unavailable' });
    const html = renderBusinessBlock(block(data));
    assert.ok(html.includes('https://wa.me/628123456789?text=' + encodeURIComponent(data.items[0].name)));
    assert.equal((html.match(/Tanya produk ini/g) || []).length, 1);
    assert.match(BUSINESS_CSS, /object-fit:contain/);
    assert.match(BUSINESS_CSS, /\.biz-tab\{[^}]*min-height:44px/);
    assert.match(BUSINESS_CSS, /\.biz-action\{[^}]*min-height:44px/);
    assert.doesNotMatch(BUSINESS_CSS, /box-shadow|border:1px/);
  });

  test('valid meaningful business-only profiles qualify, empty hidden malformed and guest profiles do not', () => {
    const meaningful: BusinessData[] = [catalog(), { ...defaultBusinessData('business_info') as any, note: 'Buka sesuai janji' }, { ...defaultBusinessData('business_info') as any, closed: true }, { ...defaultBusinessData('location') as any, address: 'Jakarta' }, { ...defaultBusinessData('contact') as any, whatsapp: '628123456789' }, { ...defaultBusinessData('announcement') as any, text: 'Pesanan dibuka' }];
    const seo = (data: BusinessData) => renderBioSeoHead({ profile, links: [block(data)], baseUrl: 'https://1stdev.link', lang: 'id', themeColor: '#fff', socials: {} });
    for (const data of meaningful) {
      assert.equal(shouldIndexProfile(profile, [block(data)]), true, data.kind);
      assert.match(seo(data), /content="index, follow, max-image-preview:large"/, data.kind);
    }
    for (const kind of ['catalog', 'business_info', 'location', 'contact', 'announcement'] as const) {
      assert.equal(shouldIndexProfile(profile, [block(defaultBusinessData(kind))]), false, kind);
      assert.match(seo(defaultBusinessData(kind)), /content="noindex, follow"/, kind);
    }
    const hidden = catalog(); hidden.items[0].status = 'hidden';
    for (const row of [block(hidden), block('{'), block('null'), block('[]'), block('{"version":1,"kind":"catalog","items":[{}]}'), block(catalog(), { is_active: 0 }), block(catalog(), { is_bio_entry: 0 }), block(catalog(), { block_type: 'contact' }), block(catalog(), { block_type: 'text', destination_url: 'https://example.com/' })]) assert.equal(shouldIndexProfile(profile, [row]), false);
    assert.equal(shouldIndexProfile({ ...profile, handle: 'edge_abc123' }, [block(catalog())]), false);
    assert.equal(shouldIndexProfile({ ...profile, is_guest: 1 } as BioProfile, [block(catalog())]), false);
    assert.equal(shouldIndexProfile(profile, [block(catalog(), { block_type: 'link', destination_url: 'https://example.com/' })]), true);
  });

  test('SQLite sitemap candidates match valid business-only, empty, hidden, malformed and guest eligibility', () => {
    const hidden = catalog(); hidden.items[0].status = 'hidden';
    const fixtures = [
      { name: 'catalog', data: catalog() },
      { name: 'contact', data: { ...defaultBusinessData('contact'), email: 'hello@example.com' } },
      { name: 'hours', data: { ...defaultBusinessData('business_info'), hours: [{ day: 1, open: '09:00', close: '17:00' }] } },
      { name: 'location', data: { ...defaultBusinessData('location'), address: 'Jakarta' } },
      { name: 'announcement', data: { ...defaultBusinessData('announcement'), text: 'Halo' } },
      { name: 'hidden', data: hidden },
      { name: 'empty', data: defaultBusinessData('catalog') },
      { name: 'empty_contact', data: defaultBusinessData('contact') },
      { name: 'empty_info', data: defaultBusinessData('business_info') },
      { name: 'malformed', data: '{' },
      { name: 'primitive', data: '{"version":1,"kind":"catalog","layout":"grid","presentation":"products","categories":[],"items":[1,"x"]}' },
      { name: 'edge_guest123', data: catalog() },
      { name: 'guest', data: catalog(), guest: 1 },
      { name: 'inactive', data: catalog(), active: 0 },
    ];
    const payload = fixtures.map((f) => ({ ...f, link: block(f.data as BusinessData | string, { is_active: f.active ?? 1 }) }));
    const result = spawnSync('python3', ['-c', `import sqlite3,json,sys
rows=json.load(sys.stdin)
c=sqlite3.connect(':memory:')
c.executescript('CREATE TABLE users(id TEXT,is_guest INTEGER); CREATE TABLE bio_profiles(user_id TEXT,handle TEXT,updated_at INTEGER); CREATE TABLE links(user_id TEXT,is_bio_entry INTEGER,is_active INTEGER,block_type TEXT,destination_url TEXT,data_json TEXT);')
for row in rows:
 name=row['name']; link=row['link']
 c.execute('INSERT INTO users VALUES(?,?)',(name,row.get('guest',0)))
 c.execute('INSERT INTO bio_profiles VALUES(?,?,1)',(name,name))
 c.execute('INSERT INTO links VALUES(?,?,?,?,?,?)',(name,link['is_bio_entry'],link['is_active'],link['block_type'],link['destination_url'],link['data_json']))
print(json.dumps(sorted(row[0] for row in c.execute(sys.argv[1]))))`, SITEMAP_PROFILES_SQL], { input: JSON.stringify(payload), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const expected = payload.filter((f) => shouldIndexProfile({ ...profile, handle: f.name, is_guest: f.guest ?? 0 } as BioProfile, [f.link])).map((f) => f.name).sort();
    assert.deepEqual(JSON.parse(result.stdout), expected);
  });
});
