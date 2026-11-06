// Siapkan gambar (avatar, cover, background) di browser: resize, bersihkan EXIF metadata, simpan ke WebP/JPEG teroptimasi.

export const AVATAR_SIZE = 400;
const MAX_AVATAR_BYTES = 512 * 1024;
const MAX_MEDIA_BYTES = 1024 * 1024; // 1 MB

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation mengikuti rotasi EXIF agar foto HP tidak miring.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fallback ke <img> di bawah */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function prepareAvatar(file: File): Promise<Blob> {
  const src = await decode(file);
  const w = src.width;
  const h = src.height;
  if (!w || !h) throw new Error('unsupported');

  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(AVATAR_SIZE, side);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('unsupported');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  if ('close' in src) src.close();

  for (const [type, q] of [['image/webp', 0.85], ['image/jpeg', 0.85], ['image/jpeg', 0.7]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_AVATAR_BYTES) return blob;
  }
  throw new Error('too_large');
}

/** Siapkan banner cover horizontal (rasio lebar ~3:1 atau max 1200x500). */
export async function prepareCover(file: File): Promise<Blob> {
  const src = await decode(file);
  const w = src.width;
  const h = src.height;
  if (!w || !h) throw new Error('unsupported');

  const maxW = 1200;
  const maxH = 500;
  let targetW = w;
  let targetH = h;

  // Skalakan bila melebihi ukuran maksimum
  if (targetW > maxW) {
    targetH = Math.round((targetH * maxW) / targetW);
    targetW = maxW;
  }
  if (targetH > maxH) {
    targetW = Math.round((targetW * maxH) / targetH);
    targetH = maxH;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('unsupported');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h, 0, 0, targetW, targetH);
  if ('close' in src) src.close();

  for (const [type, q] of [['image/webp', 0.82], ['image/jpeg', 0.8], ['image/jpeg', 0.65]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_MEDIA_BYTES) return blob;
  }
  throw new Error('too_large');
}

/** Siapkan background wallpaper layar penuh (max 1600x1600, menjaga rasio asli). */
export async function prepareBackground(file: File): Promise<Blob> {
  const src = await decode(file);
  const w = src.width;
  const h = src.height;
  if (!w || !h) throw new Error('unsupported');

  const maxDim = 1600;
  let targetW = w;
  let targetH = h;

  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('unsupported');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h, 0, 0, targetW, targetH);
  if ('close' in src) src.close();

  for (const [type, q] of [['image/webp', 0.8], ['image/jpeg', 0.78], ['image/jpeg', 0.6]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_MEDIA_BYTES) return blob;
  }
  throw new Error('too_large');
}


/**
 * Siapkan foto produk atau layanan katalog:
 * Menjaga rasio aspek asli (tanpa crop persegi), resize proporsional max 1600px,
 * bersihkan EXIF metadata via canvas, dan simpan dalam WebP/JPEG max 1 MiB.
 */
export async function prepareCatalogImage(file: File): Promise<Blob> {
  const src = await decode(file);
  const w = src.width;
  const h = src.height;
  if (!w || !h) throw new Error('unsupported');

  const maxDim = 1600;
  let targetW = w;
  let targetH = h;

  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('unsupported');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h, 0, 0, targetW, targetH);
  if ('close' in src) src.close();

  for (const [type, q] of [['image/webp', 0.85], ['image/jpeg', 0.82], ['image/jpeg', 0.7]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_MEDIA_BYTES) return blob;
  }
  throw new Error('too_large');
}
