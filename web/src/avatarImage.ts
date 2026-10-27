// Siapkan foto profil di browser: potong persegi di tengah, kecilkan ke 400x400, simpan WebP.
// Menggambar ulang ke canvas juga membuang metadata EXIF (lokasi GPS, kamera).

export const AVATAR_SIZE = 400;
const MAX_UPLOAD_BYTES = 512 * 1024;

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

  // Safari lama tidak bisa encode WebP (toBlob kembali PNG); turun ke JPEG.
  for (const [type, q] of [['image/webp', 0.85], ['image/jpeg', 0.85], ['image/jpeg', 0.7]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error('too_large');
}
