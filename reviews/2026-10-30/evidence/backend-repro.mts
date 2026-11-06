import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import app from '/Users/spixelsdev/edgelink/worker/src/index.ts';
import { checkRateLimit } from '/Users/spixelsdev/edgelink/worker/src/security.ts';
import { MockKV, MockD1, MockR2 } from '/Users/spixelsdev/edgelink/worker/test/mocks.ts';

// Only isolated in-memory bindings; fail immediately if any code attempts network IO.
globalThis.fetch = async () => { throw new Error('Network disabled for this review reproduction'); };

const fixtureToken = 'review_fixture_not_a_real_credential';
const fixtureUser = { id: 'usr_review', api_key: fixtureToken, email: 'review@example.com', is_guest: 0 };
const headers = { Authorization: `Bearer ${fixtureToken}`, 'Content-Type': 'application/json' };
const makeEnv = (kv: MockKV = new MockKV()) => {
  const db = new MockD1();
  db.tables.users.push({ ...fixtureUser });
  return { DB: db, KV: kv, MEDIA: new MockR2() };
};

const limiterKv = new MockKV();
const concurrentResults = await Promise.all(Array.from({ length: 40 }, () => checkRateLimit(limiterKv, 'review-parallel', 5, 3600)));
const parallelRate = { requests: 40, configuredLimit: 5, allowed: concurrentResults.filter((r) => r.allowed).length, storedCount: Number(await limiterKv.get('review-parallel')) };
assert.equal(parallelRate.allowed, 40);
assert.equal(parallelRate.storedCount, 1);

const linkEnv = makeEnv();
for (let i = 0; i < 100; i++) linkEnv.DB.tables.links.push({ id: `lnk_review_${i}`, user_id: fixtureUser.id, slug: `review_${i}`, destination_url: 'https://example.com', is_active: 1, is_bio_entry: 1, block_type: 'link', sort_order: i });
const linkResponse = await app.request('https://example.test/api/links', { method: 'POST', headers, body: JSON.stringify({ title: '101st block', slug: 'review_101', destination_url: 'https://example.com', is_bio_entry: 1, block_type: 'link' }) }, linkEnv as any);
await linkResponse.arrayBuffer();
const ordinaryLinkCap = { existingBlocks: 100, blockType: 'link', status: linkResponse.status, resultingBlocks: linkEnv.DB.tables.links.length };
assert.equal(ordinaryLinkCap.status, 201);
assert.equal(ordinaryLinkCap.resultingBlocks, 101);

const uploadEnv = makeEnv();
let chunksRead = 0;
const chunkBytes = 32768;
const stream = new ReadableStream<Uint8Array>({ pull(controller) { if (chunksRead === 64) { controller.close(); return; } chunksRead++; controller.enqueue(new Uint8Array(chunkBytes)); } });
const uploadResponse = await app.request('https://example.test/api/media/avatar', { method: 'POST', headers: { Authorization: headers.Authorization }, body: stream, duplex: 'half' } as any, uploadEnv as any);
await uploadResponse.arrayBuffer();
const streamedUpload = { declaredContentLength: null, status: uploadResponse.status, chunksRead, totalBytesRead: chunksRead * chunkBytes, allowedBytes: 512 * 1024, storedObjects: uploadEnv.MEDIA.objects.size };
assert.equal(streamedUpload.status, 413);
assert.equal(streamedUpload.totalBytesRead, 2 * 1024 * 1024);
assert.equal(streamedUpload.storedObjects, 0);

class RejectingMockKV extends MockKV { async put(): Promise<void> { throw new Error('Synthetic KV put failure'); } }
const previousConsoleError = console.error;
let kvFailureResponse: Response;
try {
  console.error = () => {};
  kvFailureResponse = await app.request('https://example.test/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: 'invalid_review_fixture' }) }, makeEnv(new RejectingMockKV()) as any);
} finally { console.error = previousConsoleError; }
const kvWriteFailure = { route: '/api/auth/login', status: kvFailureResponse!.status, response: await kvFailureResponse!.text() };
assert.equal(kvWriteFailure.status, 500);

const result = { scope: 'Local memory-only reproduction, no network, production credentials, or production bindings', cwd: process.cwd(), parallelRate, ordinaryLinkCap, streamedUpload, kvWriteFailure };
const json = JSON.stringify(result, null, 2) + '\n';
await writeFile(new URL('./backend-repro.json', import.meta.url), json);
process.stdout.write(json);
