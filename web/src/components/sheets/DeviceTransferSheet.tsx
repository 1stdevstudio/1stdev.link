import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import { Copy, Check } from 'lucide-react';

interface DeviceTransferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
  onToast: (msg: string) => void;
}

export const DeviceTransferSheet: React.FC<DeviceTransferSheetProps> = ({
  isOpen,
  onClose,
  apiKey,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const syncUrl = `${window.location.origin}/?sync_key=${encodeURIComponent(apiKey || '')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    syncUrl
  )}`;

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    onToast('Kode disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Pindah perangkat">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--tx2)] leading-normal">
          Di perangkat baru, buka EdgeLink, pilih{' '}
          <strong className="text-[var(--tx)] font-semibold">Masuk</strong>, lalu scan kode ini.
        </p>

        {/* QR Code Container */}
        <div className="w-[140px] h-[140px] mx-auto rounded-[var(--r2)] bg-white p-2.5 grid place-items-center shadow-lg">
          <img
            src={qrUrl}
            alt="QR Pindah Perangkat"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Sync Key Row */}
        <div className="flex items-center justify-between gap-2 bg-[var(--in)] rounded-[var(--r2)] p-1 pl-3">
          <span className="mono grow text-[13px] text-[var(--tx)] truncate select-all">
            {apiKey || 'el_live_••••••••'}
          </span>
          <button
            type="button"
            className="btn btn-g btn-sm shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
            <span>{copied ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>

        {/* Security Warning */}
        <p className="text-[13px] text-[var(--warn)] leading-relaxed">
          Jangan bagikan kode ini. Siapa pun yang memilikinya bisa membuka akun kamu.
        </p>
      </div>
    </Sheet>
  );
};
