import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import { MessageCircle, User, QrCode, Share2, Check } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shareUrl = `${baseUrl}/@${handle}`;
  const displayUrl = `edgelink.id/@${handle}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    shareUrl
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    onToast('Link disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `Kunjungi halaman profil saya di EdgeLink: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleInstagram = () => {
    navigator.clipboard.writeText(shareUrl);
    onToast('Link disalin untuk bio Instagram');
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `edgelink-qr-${handle}.png`;
    link.target = '_blank';
    link.click();
    onToast('Mengunduh kode QR');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${handle} · EdgeLink`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    handleCopy();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Bagikan halaman">
      <div className="flex flex-col gap-5 pt-1">
        {/* QR Code Container */}
        <div className="w-[140px] h-[140px] mx-auto rounded-[var(--r2)] bg-white p-2.5 grid place-items-center shadow-lg">
          <img
            src={qrUrl}
            alt="Kode QR Profil"
            className="w-full h-full object-contain"
          />
        </div>

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
            <span>{copied ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>

        {/* Share Grid */}
        <div className="share-grid">
          <button type="button" onClick={handleWhatsApp}>
            <MessageCircle size={20} strokeWidth={1.75} className="text-[var(--ok)]" />
            <span>WhatsApp</span>
          </button>
          <button type="button" onClick={handleInstagram}>
            <User size={20} strokeWidth={1.75} className="text-[var(--tx2)]" />
            <span>Instagram</span>
          </button>
          <button type="button" onClick={handleDownloadQr}>
            <QrCode size={20} strokeWidth={1.75} className="text-[var(--tx2)]" />
            <span>Unduh QR</span>
          </button>
          <button type="button" onClick={handleNativeShare}>
            <Share2 size={20} strokeWidth={1.75} className="text-[var(--ac)]" />
            <span>Lainnya</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
};
