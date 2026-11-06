// Penyimpanan media (foto profil) di R2.
// Browser sudah memotong & mengecilkan foto ke WebP; Worker hanya memeriksa dan menyimpan
// agar tetap di bawah batas CPU paket gratis.

export const AVATAR_MAX_BYTES = 512 * 1024;
export const MEDIA_MAX_BYTES = 1024 * 1024; // 1 MB untuk cover dan background

export type ImageKind = { mime: 'image/webp' | 'image/jpeg' | 'image/png'; ext: 'webp' | 'jpg' | 'png' };

/**
 * Kenali gambar dari byte awalnya (magic bytes), bukan dari header Content-Type
 * yang bisa dipalsukan. SVG/HTML sengaja tidak dikenali sehingga selalu ditolak.
 */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && // RIFF
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) { // WEBP
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes.length >= 8 &&
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) {
    return { mime: 'image/png', ext: 'png' };
  }
  return null;
}

/** 16 karakter hex SHA-256: nama file berubah tiap isi berubah, jadi cache bisa "immutable". */
export async function contentHash(buf: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  return Array.from(digest.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const avatarPrefix = (userId: string) => `avatars/${userId}/`;
export const mediaPrefix = (folder: string, userId: string) => `${folder}/${userId}/`;

/** Kunci R2 yang sah untuk dibaca publik; mencegah path traversal dan akses kunci lain. */
export function isValidMediaKey(key: string): boolean {
  return /^(avatars|covers|backgrounds)\/[A-Za-z0-9_-]{1,64}\/[a-f0-9]{16}\.(webp|jpg|png)$/.test(key);
}

/** Ambil kunci R2 dari URL media milik kita, atau null bila URL bukan media kita. */
export function mediaKeyFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    let key: string;
    if (trimmed.startsWith('/m/')) {
      key = trimmed.slice(3);
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      // Conservative domain filter: only allow internal/local hosts for media parsing
      const isTrustedHost =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '1stdev.link' ||
        host.endsWith('.1stdev.link') ||
        host === 'edgelink.id' ||
        host.endsWith('.edgelink.id') ||
        host.endsWith('.workers.dev') ||
        host.endsWith('.pages.dev');
      if (!isTrustedHost) return null;
      const pathname = decodeURIComponent(parsed.pathname);
      if (!pathname.startsWith('/m/')) return null;
      key = pathname.slice(3);
    } else {
      return null;
    }
    return isValidMediaKey(key) ? key : null;
  } catch {
    return null;
  }
}

/** Hapus semua foto milik user kecuali yang sedang dipakai (termasuk upload yang tak jadi disimpan). */
export async function pruneAvatars(bucket: R2Bucket, userId: string, keepKey: string | null): Promise<number> {
  const listed = await bucket.list({ prefix: avatarPrefix(userId), limit: 100 });
  const stale = listed.objects.map((o) => o.key).filter((k) => k !== keepKey);
  if (stale.length) await bucket.delete(stale);
  return stale.length;
}

function extractUrlsFromUnknown(val: unknown, depth = 0, maxDepth = 5, urls: string[] = []): string[] {
  if (depth > maxDepth || val === null || val === undefined) return urls;
  if (typeof val === 'string') {
    urls.push(val);
    return urls;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      extractUrlsFromUnknown(item, depth + 1, maxDepth, urls);
    }
    return urls;
  }
  if (typeof val === 'object') {
    for (const v of Object.values(val as Record<string, unknown>)) {
      extractUrlsFromUnknown(v, depth + 1, maxDepth, urls);
    }
  }
  return urls;
}

/**
 * Safe orphan media cleanup across avatars, covers, and backgrounds scoped to a specific user.
 * Discovers referenced keys in profile and links, and only deletes objects older than the 24-hour grace window.
 */
export async function cleanupOrphanMedia(
  bucket: R2Bucket,
  db: D1Database,
  userId: string,
  now: number = Date.now(),
  cursors?: Record<string, string>
): Promise<number> {
  if (!bucket || !db || !userId) return 0;

  const userPrefixes = [
    avatarPrefix(userId),
    mediaPrefix('covers', userId),
    mediaPrefix('backgrounds', userId),
  ];

  const activeKeys = new Set<string>();

  const isOwnedMediaKey = (key: string): boolean => {
    return userPrefixes.some((prefix) => key.startsWith(prefix));
  };

  const registerCandidateUrl = (url: unknown): void => {
    if (typeof url !== 'string' || !url) return;
    const key = mediaKeyFromUrl(url);
    if (key && isOwnedMediaKey(key)) {
      activeKeys.add(key);
    }
  };

  const scanJsonOrString = (raw: unknown): void => {
    if (typeof raw !== 'string' || !raw) return;
    try {
      const parsed = JSON.parse(raw);
      const urls = extractUrlsFromUnknown(parsed, 0, 5, []);
      for (const u of urls) {
        registerCandidateUrl(u);
      }
    } catch {
      // Conservative fallback for malformed JSON: regex search for owned keys
      for (const prefix of userPrefixes) {
        const regex = new RegExp(`${prefix}[a-f0-9]{16}\.(?:webp|jpg|png)`, 'g');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(raw)) !== null) {
          activeKeys.add(m[0]);
        }
      }
    }
  };

  // 1. Discover profile references (user_id scoped)
  try {
    const profile = await db
      .prepare('SELECT avatar_url, style FROM bio_profiles WHERE user_id = ?')
      .bind(userId)
      .first<{ avatar_url?: string; style?: string }>();

    if (profile) {
      if (profile.avatar_url) registerCandidateUrl(profile.avatar_url);
      if (profile.style) scanJsonOrString(profile.style);
    }
  } catch {
    // If DB query fails, safe abort cleanup to avoid accidental deletion
    return 0;
  }

  // 2. Discover link references (user_id scoped)
  try {
    const { results } = await db
      .prepare('SELECT destination_url, style, data_json FROM links WHERE user_id = ?')
      .bind(userId)
      .all<{ destination_url?: string; style?: string; data_json?: string }>();

    if (Array.isArray(results)) {
      for (const row of results) {
        if (row.destination_url) registerCandidateUrl(row.destination_url);
        if (row.style) scanJsonOrString(row.style);
        if (row.data_json) scanJsonOrString(row.data_json);
      }
    }
  } catch {
    // If DB query fails, safe abort cleanup
    return 0;
  }

  // 3. Scan user media prefixes and delete stale unreferenced objects
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  const cutoff = now - GRACE_PERIOD_MS;
  let totalDeleted = 0;

  for (const prefix of userPrefixes) {
    try {
      const listed = await bucket.list({ prefix, limit: 1000, ...(cursors?.[prefix] ? { cursor: cursors[prefix] } : {}) });
      const staleKeys: string[] = [];

      for (const obj of listed.objects) {
        // Enforce strict prefix ownership
        if (!obj.key.startsWith(prefix)) continue;

        // Extract uploaded date
        let uploadedTime: number | null = null;
        if (obj.uploaded instanceof Date) {
          uploadedTime = obj.uploaded.getTime();
        } else if (typeof obj.uploaded === 'number') {
          uploadedTime = obj.uploaded;
        } else if (typeof obj.uploaded === 'string') {
          const t = Date.parse(obj.uploaded);
          if (!Number.isNaN(t)) uploadedTime = t;
        }

        // Missing timestamp: safe keep
        if (uploadedTime === null || !Number.isFinite(uploadedTime)) continue;

        // Within grace period (<= 24h): keep
        if (uploadedTime > cutoff) continue;

        // Unreferenced and older than grace window: mark for deletion
        if (!activeKeys.has(obj.key)) {
          staleKeys.push(obj.key);
        }
      }

      if (staleKeys.length > 0) {
        await bucket.delete(staleKeys);
        totalDeleted += staleKeys.length;
      }
      if (cursors) {
        if (listed.truncated && listed.cursor) cursors[prefix] = listed.cursor;
        else delete cursors[prefix];
      }
    } catch {
      // Continue safely across prefixes
    }
  }

  return totalDeleted;
}

export const CLAIM_MEDIA_CLEANUP_SQL = `
  INSERT INTO media_cleanup_runs (user_id, last_run, cursors_json) VALUES (?, ?, '{}')
  ON CONFLICT(user_id) DO UPDATE SET last_run = excluded.last_run
  WHERE media_cleanup_runs.last_run <= ?
  RETURNING cursors_json`;

/** At most one bounded pass per tenant/day; persisted cursors cover large libraries. */
export async function cleanupMediaIfDue(bucket: R2Bucket, db: D1Database, userId: string, now = Date.now()): Promise<number> {
  const seconds = Math.floor(now / 1000);
  const claim = await db.prepare(CLAIM_MEDIA_CLEANUP_SQL).bind(userId, seconds, seconds - 86400).first<{ cursors_json: string }>();
  if (!claim) return 0;
  let cursors: Record<string, string> = {};
  try {
    const parsed = JSON.parse(claim.cursors_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      cursors = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    }
  } catch { /* A corrupt cursor safely restarts a bounded pass. */ }
  const deleted = await cleanupOrphanMedia(bucket, db, userId, now, cursors);
  await db.prepare('UPDATE media_cleanup_runs SET cursors_json = ? WHERE user_id = ?').bind(JSON.stringify(cursors), userId).run();
  return deleted;
}
