import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';
import { useI18n } from '../i18n/context';

export type CropType = 'avatar' | 'cover' | 'background';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  cropType: CropType;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const CROP_CONFIG: Record<
  CropType,
  {
    title: [string, string];
    desc: [string, string];
    aspectRatio: number; // width / height
    outWidth: number;
    outHeight: number;
    maxBytes: number;
    roundOverlay?: boolean;
  }
> = {
  avatar: {
    title: ['Potong Foto Profil', 'Crop Profile Photo'],
    desc: ['Geser atau perbesar foto agar pas di dalam lingkaran profil.', 'Drag or zoom photo to fit inside the profile circle.'],
    aspectRatio: 1,
    outWidth: 400,
    outHeight: 400,
    maxBytes: 512 * 1024,
    roundOverlay: true,
  },
  cover: {
    title: ['Potong Banner Header', 'Crop Header Banner'],
    desc: ['Sesuaikan banner horizontal (rasio lebar 3:1) di bagian atas bio.', 'Adjust horizontal banner (3:1 ratio) for your bio header.'],
    aspectRatio: 3 / 1,
    outWidth: 1200,
    outHeight: 400,
    maxBytes: 1024 * 1024,
    roundOverlay: false,
  },
  background: {
    title: ['Potong Wallpaper Latar', 'Crop Wallpaper Background'],
    desc: ['Sesuaikan proporsi vertikal (layar HP 9:16) untuk latar belakang bio.', 'Adjust vertical proportions (9:16 phone ratio) for your bio background.'],
    aspectRatio: 9 / 16,
    outWidth: 900,
    outHeight: 1600,
    maxBytes: 1024 * 1024,
    roundOverlay: false,
  },
};

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageFile,
  cropType,
  onCropComplete,
  onCancel,
}) => {
  const { tx, lang } = useI18n();
  const L = (pair: [string, string]) => (lang === 'en' ? pair[1] : pair[0]);
  const config = CROP_CONFIG[cropType] || CROP_CONFIG.avatar;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Baca file gambar
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Hitung dimensi frame crop di dalam container (responsif)
  const getCropBoxDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 300, height: 300 };
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 36;
    const maxW = Math.max(100, rect.width - pad);
    const maxH = Math.max(100, rect.height - pad);

    let w = maxW;
    let h = w / config.aspectRatio;

    if (h > maxH) {
      h = maxH;
      w = h * config.aspectRatio;
    }

    return { width: Math.round(w), height: Math.round(h) };
  }, [config.aspectRatio]);

  // Kunci batas pan agar gambar tidak pernah keluar atau bocor dari area crop (snap boundary lock)
  const clampPan = useCallback(
    (targetX: number, targetY: number, targetZoom: number) => {
      if (!naturalSize.w || !naturalSize.h) return { x: 0, y: 0 };
      const cropBox = getCropBoxDimensions();

      const baseScale = Math.max(cropBox.width / naturalSize.w, cropBox.height / naturalSize.h);
      const displayW = naturalSize.w * baseScale * targetZoom;
      const displayH = naturalSize.h * baseScale * targetZoom;

      const maxPanX = Math.max(0, (displayW - cropBox.width) / 2);
      const maxPanY = Math.max(0, (displayH - cropBox.height) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, targetX)),
        y: Math.min(maxPanY, Math.max(-maxPanY, targetY)),
      };
    },
    [naturalSize, getCropBoxDimensions]
  );

  // Ubah zoom dengan penyesuaian clamp pan seketika
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, +newZoom.toFixed(2)));
    setZoom(clampedZoom);
    setPan((curr) => clampPan(curr.x, curr.y, clampedZoom));
  };

  // Event handler drag (pointer) dengan batas terkunci
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextX = initialPanRef.current.x + dx;
    const nextY = initialPanRef.current.y + dy;

    setPan(clampPan(nextX, nextY, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture sudah lepas
    }
  };

  // Zoom dengan scroll mouse / trackpad
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    handleZoomChange(zoom + delta);
  };

  // Reset posisi & zoom ke tengah sempurna
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Render crop ke Blob canvas
  const handleConfirmCrop = async () => {
    if (!imageSrc || !naturalSize.w || !naturalSize.h || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = imageSrc;
      await img.decode();

      const cropBox = getCropBoxDimensions();

      // Hitung skala tampilan gambar dalam kotak crop
      const baseScale = Math.max(cropBox.width / naturalSize.w, cropBox.height / naturalSize.h);
      const totalScale = baseScale * zoom;

      const displayW = naturalSize.w * totalScale;
      const displayH = naturalSize.h * totalScale;

      // Jarak dari tepi kiri gambar ke tepi kiri kotak potong (dalam display px)
      const cropOffsetDisplayX = (displayW - cropBox.width) / 2 - pan.x;
      const cropOffsetDisplayY = (displayH - cropBox.height) / 2 - pan.y;

      // Konversi ke koordinat gambar asli dengan batas presisi
      const maxSourceW = cropBox.width / totalScale;
      const maxSourceH = cropBox.height / totalScale;

      const sourceX = Math.max(0, Math.min(naturalSize.w - maxSourceW, cropOffsetDisplayX / totalScale));
      const sourceY = Math.max(0, Math.min(naturalSize.h - maxSourceH, cropOffsetDisplayY / totalScale));
      const sourceW = Math.min(naturalSize.w - sourceX, maxSourceW);
      const sourceH = Math.min(naturalSize.h - sourceY, maxSourceH);

      const canvas = document.createElement('canvas');
      canvas.width = config.outWidth;
      canvas.height = config.outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Gambar potongan ke canvas
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        config.outWidth,
        config.outHeight
      );

      // Konversi ke WebP / JPEG di bawah batas ukuran
      const toBlob = (c: HTMLCanvasElement, type: string, quality: number) =>
        new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, quality));

      let resultBlob: Blob | null = null;
      for (const [type, q] of [
        ['image/webp', 0.86],
        ['image/webp', 0.75],
        ['image/jpeg', 0.82],
        ['image/jpeg', 0.7],
      ] as const) {
        const b = await toBlob(canvas, type, q);
        if (b && b.size <= config.maxBytes) {
          resultBlob = b;
          break;
        }
      }

      if (!resultBlob) {
        resultBlob = await toBlob(canvas, 'image/jpeg', 0.6);
      }

      if (resultBlob) {
        onCropComplete(resultBlob);
      }
    } catch (err) {
      console.error('Crop error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageFile) return null;

  const cropBox = getCropBoxDimensions();

  // Hitung ukuran render gambar dalam box
  const baseScale = naturalSize.w && naturalSize.h
    ? Math.max(cropBox.width / naturalSize.w, cropBox.height / naturalSize.h)
    : 1;
  const currentRenderW = naturalSize.w * baseScale * zoom;
  const currentRenderH = naturalSize.h * baseScale * zoom;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg rounded-[var(--r3)] bg-[#10221c] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0d1a16]">
          <div>
            <h2 className="text-[16px] font-semibold text-white tracking-tight">{L(config.title)}</h2>
            <p className="text-[12px] text-[var(--tx3)] mt-0.5">{L(config.desc)}</p>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-white/10 text-[var(--tx3)] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Interaktif Pemotongan dengan Boundary Lock */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="relative w-full h-[320px] sm:h-[360px] bg-[#070e0c] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Gambar yang di-pan dan zoom */}
          {imageSrc && (
            <div
              className="absolute pointer-events-none transition-transform duration-75 ease-out"
              style={{
                width: `${currentRenderW}px`,
                height: `${currentRenderH}px`,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <img
                src={imageSrc}
                alt="Source preview"
                className="w-full h-full object-fill pointer-events-none"
                draggable={false}
              />
            </div>
          )}

          {/* Kotak Crop Guide (Viewport) */}
          <div
            className="absolute pointer-events-none border-2 border-[var(--ac)] shadow-[0_0_0_9999px_rgba(0,0,0,0.68)] z-10"
            style={{
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              borderRadius: config.roundOverlay ? '50%' : '8px',
            }}
          >
            {/* Grid Rule of Thirds */}
            {!config.roundOverlay && (
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            )}
          </div>

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-medium text-white/80 pointer-events-none">
            {tx('Snap aktif: gambar terkunci di dalam area potong', 'Snap active: image locked inside crop boundary')}
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="px-5 py-3.5 bg-[#0e1f1a] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-1 max-w-[280px]">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.1)}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10"
              title={tx('Perkecil', 'Zoom out')}
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-[var(--ac)] cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.1)}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10"
              title={tx('Perbesar', 'Zoom in')}
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-[12px] font-mono text-[var(--tx3)] w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--r1)] bg-white/5 hover:bg-white/10 text-[12px] text-white/80 transition-colors"
          >
            <RotateCcw size={13} />
            <span>{tx('Atur Ulang', 'Reset')}</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[#0d1a16]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 rounded-[var(--r2)] text-[13px] font-medium text-[var(--tx2)] hover:text-white hover:bg-white/5 transition-colors"
          >
            {tx('Batal', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmCrop}
            className="px-5 py-2 rounded-[var(--r2)] text-[13px] font-bold bg-[var(--ac)] text-[var(--ink)] hover:brightness-105 transition-all flex items-center gap-1.5"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{isProcessing ? tx('Memotong...', 'Cropping...') : tx('Gunakan Potongan', 'Set Photo')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
