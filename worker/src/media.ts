// Penyimpanan media (foto profil) di R2.
// Browser sudah memotong & mengecilkan foto ke WebP; Worker hanya memeriksa dan menyimpan
// agar tetap di bawah batas CPU paket gratis.

export const AVATAR_MAX_BYTES = 512 * 1024;

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

/** Kunci R2 yang sah untuk dibaca publik; mencegah path traversal dan akses kunci lain. */
export function isValidMediaKey(key: string): boolean {
  return /^avatars\/[A-Za-z0-9_-]{1,64}\/[a-f0-9]{16}\.(webp|jpg|png)$/.test(key);
}

/** Ambil kunci R2 dari URL media milik kita, atau null bila URL bukan media kita. */
export function mediaKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const key = new URL(url).pathname.replace(/^\/m\//, '');
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
