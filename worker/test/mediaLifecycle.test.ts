import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOrphanMedia, mediaKeyFromUrl, isValidMediaKey } from '../src/media.js';

interface FakeObject {
  key: string;
  uploaded?: Date | string | number;
}

class TinyFakeBucket {
  objects = new Map<string, FakeObject>();

  set(key: string, uploaded?: Date | string | number) {
    this.objects.set(key, { key, uploaded });
  }

  async list(opts?: { prefix?: string; limit?: number }) {
    const prefix = opts?.prefix || '';
    let objs = Array.from(this.objects.values()).filter((o) => o.key.startsWith(prefix));
    if (opts?.limit) objs = objs.slice(0, opts.limit);
    return { objects: objs, truncated: false };
  }

  async delete(keys: string | string[]) {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) {
      this.objects.delete(k);
    }
  }
}

class TinyFakeDb {
  profile: { avatar_url?: string; style?: string } | null = null;
  links: Array<{ destination_url?: string; style?: string; data_json?: string }> = [];

  prepare(query: string) {
    const self = this;
    return {
      bind(...params: any[]) {
        return {
          async first<T>() {
            if (query.includes('FROM bio_profiles')) {
              return (self.profile as unknown as T) || null;
            }
            return null;
          },
          async all<T>() {
            if (query.includes('FROM links')) {
              return { results: self.links as unknown as T[] };
            }
            return { results: [] };
          },
        };
      },
    };
  }
}

describe('mediaLifecycle: cleanupOrphanMedia', () => {
  const userId = 'usr_alice123';
  const now = 1700000000000;
  const oldTime = new Date(now - 48 * 3600 * 1000); // 48h ago (older than 24h grace)
  const recentTime = new Date(now - 2 * 3600 * 1000); // 2h ago (within grace)

  it('retains all referenced media across profile avatar, cover, background, and link catalog/thumbs', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const avatarKey = 'avatars/usr_alice123/0123456789abcdef.webp';
    const coverKey = 'covers/usr_alice123/1123456789abcdef.webp';
    const bgKey = 'backgrounds/usr_alice123/2123456789abcdef.jpg';
    const catalogKey = 'covers/usr_alice123/3123456789abcdef.webp';
    const thumbKey = 'covers/usr_alice123/4123456789abcdef.png';

    bucket.set(avatarKey, oldTime);
    bucket.set(coverKey, oldTime);
    bucket.set(bgKey, oldTime);
    bucket.set(catalogKey, oldTime);
    bucket.set(thumbKey, oldTime);

    db.profile = {
      avatar_url: `/m/${avatarKey}`,
      style: JSON.stringify({
        cover_url: `/m/${coverKey}`,
        bg_image: `https://edgelink.id/m/${bgKey}`,
      }),
    };

    db.links = [
      {
        style: JSON.stringify({ thumb_url: `/m/${thumbKey}` }),
        data_json: JSON.stringify({
          items: [
            { id: 'item_1', image_url: `/m/${catalogKey}` },
          ],
        }),
      },
      // Second link reusing the exact same catalog image
      {
        data_json: JSON.stringify({
          items: [
            { id: 'item_2', image_url: `/m/${catalogKey}` },
          ],
        }),
      },
    ];

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 0);
    assert.equal(bucket.objects.size, 5);
    assert.ok(bucket.objects.has(avatarKey));
    assert.ok(bucket.objects.has(coverKey));
    assert.ok(bucket.objects.has(bgKey));
    assert.ok(bucket.objects.has(catalogKey));
    assert.ok(bucket.objects.has(thumbKey));
  });

  it('deletes unreferenced media older than 24h grace window', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const activeAvatar = 'avatars/usr_alice123/0123456789abcdef.webp';
    const staleAvatar = 'avatars/usr_alice123/aaaaaaaaaaaaaaaa.webp';
    const staleCover = 'covers/usr_alice123/bbbbbbbbbbbbbbbb.webp';

    bucket.set(activeAvatar, oldTime);
    bucket.set(staleAvatar, oldTime);
    bucket.set(staleCover, oldTime);

    db.profile = { avatar_url: `/m/${activeAvatar}` };

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 2);
    assert.equal(bucket.objects.size, 1);
    assert.ok(bucket.objects.has(activeAvatar));
    assert.ok(!bucket.objects.has(staleAvatar));
    assert.ok(!bucket.objects.has(staleCover));
  });

  it('preserves unreferenced media that is within 24h grace window (new upload during delayed save)', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const freshUploadCover = 'covers/usr_alice123/cccccccccccccccc.webp';
    bucket.set(freshUploadCover, recentTime);

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 0);
    assert.ok(bucket.objects.has(freshUploadCover));
  });

  it('preserves objects with missing or unparseable uploaded timestamps', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const noTimeKey = 'covers/usr_alice123/dddddddddddddddd.webp';
    bucket.set(noTimeKey, undefined);

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 0);
    assert.ok(bucket.objects.has(noTimeKey));
  });

  it('never touches media owned by other users', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const victimAvatar = 'avatars/usr_bob999/eeeeeeeeeeeeeeee.webp';
    const victimCover = 'covers/usr_bob999/ffffffffffffffff.webp';

    bucket.set(victimAvatar, oldTime);
    bucket.set(victimCover, oldTime);

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 0);
    assert.ok(bucket.objects.has(victimAvatar));
    assert.ok(bucket.objects.has(victimCover));
  });

  it('conservatively preserves media references even when JSON is malformed', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();

    const malformedCoverKey = 'covers/usr_alice123/1212121212121212.webp';
    bucket.set(malformedCoverKey, oldTime);

    // Malformed JSON string with trailing garbage / unclosed syntax
    db.profile = {
      style: `{ "cover_url": "/m/${malformedCoverKey}", invalid_json...}`,
    };

    const deletedCount = await cleanupOrphanMedia(bucket as any, db as any, userId, now);
    assert.equal(deletedCount, 0);
    assert.ok(bucket.objects.has(malformedCoverKey));
  });

  it('conservatively rejects untrusted external hosts in mediaKeyFromUrl', () => {
    assert.equal(mediaKeyFromUrl('/m/avatars/u1/0123456789abcdef.webp'), 'avatars/u1/0123456789abcdef.webp');
    assert.equal(mediaKeyFromUrl('https://localhost/m/covers/u1/0123456789abcdef.webp'), 'covers/u1/0123456789abcdef.webp');
    assert.equal(mediaKeyFromUrl('https://edgelink.id/m/backgrounds/u1/0123456789abcdef.jpg'), 'backgrounds/u1/0123456789abcdef.jpg');
    assert.equal(mediaKeyFromUrl('https://sub.1stdev.link/m/avatars/u1/0123456789abcdef.webp'), 'avatars/u1/0123456789abcdef.webp');
    // Untrusted host must be rejected
    assert.equal(mediaKeyFromUrl('https://attacker.com/m/covers/u1/0123456789abcdef.webp'), null);
    assert.equal(mediaKeyFromUrl('https://phishing.site/m/avatars/u1/0123456789abcdef.webp'), null);
  });
  it('persists bounded scan cursors so later objects are eventually inspected', async () => {
    const bucket = new TinyFakeBucket();
    const db = new TinyFakeDb();
    const first = 'covers/usr_alice123/0123456789abcdef.webp';
    const later = 'covers/usr_alice123/1123456789abcdef.webp';
    bucket.set(first, oldTime); bucket.set(later, oldTime);
    db.profile = { style: JSON.stringify({ cover_url: `/m/${first}` }) };
    const list = async (options: { prefix?: string; cursor?: string }) => {
      if (options.prefix !== 'covers/usr_alice123/') return { objects: [], truncated: false };
      return options.cursor === 'page-two'
        ? { objects: [bucket.objects.get(later)!], truncated: false }
        : { objects: [bucket.objects.get(first)!], truncated: true, cursor: 'page-two' };
    };
    const cursors: Record<string, string> = {};
    const wrapped = { list, delete: bucket.delete.bind(bucket) } as unknown as R2Bucket;
    assert.equal(await cleanupOrphanMedia(wrapped, db as any, userId, now, cursors), 0);
    assert.equal(cursors['covers/usr_alice123/'], 'page-two');
    assert.equal(await cleanupOrphanMedia(wrapped, db as any, userId, now, cursors), 1);
    assert.equal(bucket.objects.has(first), true);
    assert.equal(bucket.objects.has(later), false);
    assert.equal(cursors['covers/usr_alice123/'], undefined);
  });

});
