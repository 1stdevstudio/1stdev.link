import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollectionRevision, MutationQueue } from '../../shared/mutationQueue.js';

test('a slow first save cannot overwrite a later change', async () => {
  const queue = new MutationQueue();
  let release!: () => void;
  const slowRequest = new Promise<void>((resolve) => { release = resolve; });
  const writes: string[] = [];
  let persisted = '';
  const first = queue.run(async () => { writes.push('first'); await slowRequest; persisted = 'old'; });
  const second = queue.run(async () => { writes.push('second'); persisted = 'latest'; });
  await Promise.resolve();
  assert.deepEqual(writes, ['first']);
  release();
  await Promise.all([first, second]);
  assert.equal(persisted, 'latest');
});

test('a failed save does not block retry and queued old-session work is skipped', async () => {
  const queue = new MutationQueue();
  const first = queue.run(async () => { throw new Error('network unavailable'); });
  await assert.rejects(first, /network unavailable/);
  let generation = 1;
  const startedGeneration = generation;
  let writes = 0;
  const oldSession = queue.run(async () => { if (generation === startedGeneration) writes++; });
  generation++;
  const retry = queue.run(async () => { writes++; });
  await Promise.all([oldSession, retry]);
  assert.equal(writes, 1);
});

test('a background collection read cannot replace a successful newer mutation', async () => {
  const revisions = new CollectionRevision();
  const snapshot = revisions.capture();
  let release!: () => void;
  const response = new Promise<string[]>((resolve) => { release = () => resolve(['old']); });
  let current = ['old'];
  const refresh = response.then((rows) => { if (revisions.accepts(snapshot)) current = rows; });
  const finish = revisions.begin();
  current = ['new', 'old'];
  finish();
  release();
  await refresh;
  assert.deepEqual(current, ['new', 'old']);
  assert.equal(revisions.accepts(revisions.capture()), true);
});

test('reads started during queued mutations stay invalid after success or failure', () => {
  const revisions = new CollectionRevision();
  const first = revisions.begin();
  const second = revisions.begin();
  const snapshot = revisions.capture();
  assert.equal(snapshot, null);
  first();
  assert.equal(revisions.accepts(snapshot), false);
  second();
  assert.equal(revisions.accepts(snapshot), false);
  second(); // Completion is idempotent and cannot make pending negative.
  assert.equal(revisions.accepts(revisions.capture()), true);
});
