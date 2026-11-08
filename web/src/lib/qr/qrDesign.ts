import QRCode from 'qrcode';
import jsQR from 'jsqr';

export type QrDots = 'square' | 'rounded' | 'dots';
export type QrEyes = 'square' | 'rounded';
export type QrFrame = 'none' | 'label';
export type QrPreset = 'classic' | 'brand' | 'minimal' | 'ocean';

export interface QrDesign {
  foreground: string;
  background: string;
  dots: QrDots;
  eyes: QrEyes;
  frame: QrFrame;
  label: string;
  logoDataUrl: string | null; // Locally rasterized PNG only; never persisted remotely.
}

export const QR_PRESETS: { id: QrPreset; foreground: string; background: string; dots: QrDots; eyes: QrEyes }[] = [
  { id: 'classic', foreground: '#142B22', background: '#FFFFFF', dots: 'square', eyes: 'square' },
  { id: 'brand', foreground: '#18765D', background: '#FFFFFF', dots: 'rounded', eyes: 'rounded' },
  { id: 'minimal', foreground: '#222222', background: '#F5F8F5', dots: 'dots', eyes: 'square' },
  { id: 'ocean', foreground: '#214A80', background: '#FFFFFF', dots: 'rounded', eyes: 'rounded' },
];

export const DEFAULT_QR_DESIGN: QrDesign = {
  ...QR_PRESETS[1],
  frame: 'none',
  label: 'SCAN ME',
  logoDataUrl: null,
};

export const hexColor = (value: string) => /^#[a-f\d]{6}$/i.test(value);

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => channel(parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function qrContrast(foreground: string, background: string): number {
  if (!hexColor(foreground) || !hexColor(background)) return 0;
  const f = luminance(foreground);
  const b = luminance(background);
  return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
}

export function qrStyleError(design: QrDesign): string | null {
  if (!hexColor(design.foreground) || !hexColor(design.background)) return 'invalid-colors';
  if (qrContrast(design.foreground, design.background) < 4.5) return 'low-contrast';
  if (luminance(design.background) <= luminance(design.foreground)) return 'dark-background';
  if (design.label.length > 24) return 'label-too-long';
  if (design.logoDataUrl && !/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(design.logoDataUrl)) return 'invalid-logo';
  return null;
}

const xml = (text: string) => text.replace(/[&<>"']/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch] || ch
);

/**
 * QR matrix from the already-installed encoder, with protected finder patterns.
 * Four-module quiet zone is non-negotiable, including in framed exports.
 */
export function renderQrSvg(payload: string, design: QrDesign, pixelWidth = 512): string {
  if (qrStyleError(design)) throw new Error('Unsafe QR design');
  const code = QRCode.create(payload, { errorCorrectionLevel: design.logoDataUrl ? 'H' : 'Q' });
  const size = code.modules.size;
  const margin = 4;
  const squareSize = size + margin * 2;
  const extraHeight = design.frame === 'label' ? 7 : 0;
  const canvasHeight = squareSize + extraHeight;
  const parts: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + pixelWidth + '" height="' + Math.round(pixelWidth * canvasHeight / squareSize) + '" viewBox="0 0 ' + squareSize + ' ' + canvasHeight + '">',
    '<rect width="' + squareSize + '" height="' + canvasHeight + '" fill="' + design.background + '"/>',
  ];

  // Three corner finder patterns are drawn as complete, scanner-friendly shapes.
  const finder = (x: number, y: number): boolean =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!code.modules.get(x, y) || finder(x, y)) continue;
      const px = x + margin;
      const py = y + margin;
      if (design.dots === 'dots') {
        parts.push('<circle cx="' + (px + 0.5) + '" cy="' + (py + 0.5) + '" r="0.44" fill="' + design.foreground + '"/>');
      } else {
        const radius = design.dots === 'rounded' ? '0.24' : '0';
        parts.push('<rect x="' + px + '" y="' + py + '" width="1" height="1" rx="' + radius + '" fill="' + design.foreground + '"/>');
      }
    }
  }

  for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    const px = x + margin;
    const py = y + margin;
    const rx = design.eyes === 'rounded' ? '1.5' : '0';
    const innerRx = design.eyes === 'rounded' ? '0.7' : '0';
    // 7x7 dark outer / 5x5 light center / 3x3 dark pupil.
    parts.push('<rect x="' + px + '" y="' + py + '" width="7" height="7" rx="' + rx + '" fill="' + design.foreground + '"/>');
    parts.push('<rect x="' + (px + 1) + '" y="' + (py + 1) + '" width="5" height="5" rx="' + innerRx + '" fill="' + design.background + '"/>');
    parts.push('<rect x="' + (px + 2) + '" y="' + (py + 2) + '" width="3" height="3" rx="' + innerRx + '" fill="' + design.foreground + '"/>');
  }

  if (design.logoDataUrl) {
    // Fixed 18%-of-matrix logo width with opaque white backing, no remote sources.
    const d = size * 0.18;
    const outer = d + 2;
    const px = margin + size / 2 - outer / 2;
    const py = margin + size / 2 - outer / 2;
    parts.push('<rect x="' + px + '" y="' + py + '" width="' + outer + '" height="' + outer + '" rx="1.2" fill="#FFFFFF"/>');
    parts.push('<image x="' + (px + 1) + '" y="' + (py + 1) + '" width="' + d + '" height="' + d + '" href="' + design.logoDataUrl + '" preserveAspectRatio="xMidYMid meet"/>');
  }

  if (design.frame === 'label') {
    parts.push('<text x="' + squareSize / 2 + '" y="' + (squareSize + 3.4) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="2.9" font-weight="700" fill="' + design.foreground + '">' + xml(design.label.trim() || 'SCAN ME') + '</text>');
  }
  parts.push('</svg>');
  return parts.join('');
}

/** Accept local raster files only; normalize to a small self-contained PNG. */
export async function normalizeQrLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('unsupported-logo');
  if (file.size > 512 * 1024) throw new Error('logo-too-large');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    if (image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('logo-dimensions');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 128, 128);
    const scale = Math.min(116 / image.naturalWidth, 116 / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (128 - w) / 2, (128 - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(objectUrl); }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('QR image could not load'));
    img.src = src;
  });
}

/** PNG is rendered from the exact SVG that is previewed/downloaded. */
export async function renderQrPng(svg: string, pixelWidth = 512): Promise<Blob> {
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(objectUrl);
    const aspect = image.naturalHeight / image.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = Math.round(pixelWidth * aspect);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not export PNG')), 'image/png'
    ));
  } finally { URL.revokeObjectURL(objectUrl); }
}

export async function verifyQrExport(blob: Blob, payload: string): Promise<boolean> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' })?.data === payload;
  } finally { URL.revokeObjectURL(url); }
}
