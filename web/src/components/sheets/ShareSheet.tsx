import React, { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { MessageCircle, User, QrCode, Share2, Check, Download } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  handle: string;
  onToast: (msg: string) => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  isOpen,
  onClose,
  handle,
  onToast,
}) => {
  const { tx } = useI18n();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [qrError, setQrError] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shareUrl = `${baseUrl}/@${handle}`;
  const displayUrl = `${baseUrl.replace(/^https?:\/\//, '')}/@${handle}`;

  useEffect(() => {
    if (!isOpen || !handle) return;
    let active = true;

    setQrDataUrl('');
    setQrError(false);
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#070e0c',
        light: '#ffffff',
      },
    }))
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
        if (active) setQrError(true);
      });

    return () => {
      active = false;
    };
  }, [isOpen, handle, shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onToast(tx('Link disalin', 'Link copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast(tx('Gagal menyalin link', 'Failed to copy link'));
    }
  };

  const handleWhatsApp = () => {
    const text = tx(
      `Kunjungi halaman saya di 1stdev.link by 1stdev.space: ${shareUrl}`,
      `Check out my page on 1stdev.link by 1stdev.space: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast(tx('Link disalin untuk bio Instagram', 'Link copied for your Instagram bio'));
    } catch {
      onToast(tx('Gagal menyalin link', 'Failed to copy link'));
    }
  };

  const handleDownloadQr = async (format: 'png' | 'svg') => {
    if (downloading) return;
    setDownloading(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const options = { margin: 2, color: { dark: '#070e0c', light: '#ffffff' } };
      let blob: Blob;
      if (format === 'svg') {
        blob = new Blob([await QRCode.toString(shareUrl, { ...options, type: 'svg' })], { type: 'image/svg+xml' });
      } else {
        const dataUrl = await QRCode.toDataURL(shareUrl, { ...options, width: 800 });
        const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (character) => character.charCodeAt(0));
        blob = new Blob([bytes], { type: 'image/png' });
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `1stdev-link-${handle}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      onToast(tx('Gagal menyiapkan kode QR. Coba lagi.', 'Could not prepare the QR code. Try again.'));
    } finally { setDownloading(false); }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${handle} · 1stdev.link by 1stdev.space`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported share target
      }
    }
    await handleCopy();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={tx('Bagikan halaman', 'Share page')}>
      <div className="flex flex-col gap-5 pt-1">
        {/* QR Code Container — Solid surface, zero decorative shadow/border */}
        <div className="w-[144px] h-[144px] mx-auto rounded-[var(--r2)] bg-white p-2.5 grid place-items-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={tx('Kode QR halaman', 'Page QR code')}
              className="w-full h-full object-contain"
            />
          ) : qrError ? <p className="text-xs text-neutral-700 text-center" role="alert">{tx('QR gagal dimuat. Tutup dan coba lagi.', 'Could not load QR. Close and retry.')}</p> : (
            <div className="w-full h-full bg-neutral-100 animate-pulse rounded" />
          )}
        </div>

        <button type="button" className="btn btn-g btn-sm gap-2" disabled={downloading} onClick={() => handleDownloadQr('svg')}><Download size={16} strokeWidth={1.75} />{tx('Unduh SVG untuk cetak', 'Download SVG for print')}</button>

        {/* URL Row with Copy */}
        <div className="flex items-center justify-between gap-2 bg-[var(--in)] rounded-[var(--r2)] p-1 pl-3">
          <span className="mono grow text-[13px] text-[var(--tx)] truncate">
            {displayUrl}
          </span>
          <button
            type="button"
            className="btn btn-p btn-sm shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} strokeWidth={2} /> : null}
            <span>{copied ? tx('Disalin', 'Copied') : tx('Salin', 'Copy')}</span>
          </button>
        </div>

        {/* Share Grid — lucide stroke 1.75, no emoji, solid surfaces */}
        <div className="share-grid">
          <button type="button" onClick={handleWhatsApp}>
            <MessageCircle size={20} strokeWidth={1.75} className="text-[var(--ok)]" />
            <span>WhatsApp</span>
          </button>
          <button type="button" onClick={handleInstagram}>
            <User size={20} strokeWidth={1.75} className="text-[var(--tx2)]" />
            <span>Instagram</span>
          </button>
          <button type="button" disabled={downloading} onClick={() => handleDownloadQr('png')}>
            {downloading ? (
              <Download size={20} strokeWidth={1.75} className="text-[var(--ac)] animate-bounce" />
            ) : (
              <QrCode size={20} strokeWidth={1.75} className="text-[var(--tx2)]" />
            )}
            <span>{downloading ? tx('Mengunduh...', 'Saving...') : tx('QR PNG', 'QR PNG')}</span>
          </button>
          <button type="button" onClick={handleNativeShare}>
            <Share2 size={20} strokeWidth={1.75} className="text-[var(--ac)]" />
            <span>{tx('Lainnya', 'More')}</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
};
