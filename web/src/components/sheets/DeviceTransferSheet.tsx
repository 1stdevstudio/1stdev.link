import React, { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { Copy, Check, KeyRound } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { api } from '../../api';

interface DeviceTransferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const DeviceTransferSheet: React.FC<DeviceTransferSheetProps> = ({ isOpen, onClose, onToast }) => {
  const { tx } = useI18n();
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  useEffect(() => { if (!isOpen) { setUrl(''); setExpiresAt(0); setCopied(false); } }, [isOpen]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { setUrl(''); setCopied(false); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const generate = async () => {
    setLoading(true);
    try {
      const code = await api.createHandoff();
      const target = new URL(window.location.origin);
      target.searchParams.set('handoff', code);
      setUrl(target.toString());
      setExpiresAt(Date.now() + 120000);
      setCopied(false);
    } catch { onToast(tx('Gagal membuat tautan transfer', 'Could not create transfer link')); }
    finally { setLoading(false); }
  };
  const copy = async () => {
    if (!url || Date.now() >= expiresAt) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { onToast(tx('Tidak dapat menyalin tautan', 'Could not copy link')); }
  };
  return <Sheet isOpen={isOpen} onClose={onClose} title={tx('Pindah perangkat', 'Move to another device')}>
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[var(--tx2)]">{tx('Buat tautan sekali pakai, lalu buka di perangkat baru. Berlaku 2 menit.', 'Create a single-use link and open it on your new device. Expires in 2 minutes.')}</p>
      <button className="btn btn-p" disabled={loading} onClick={generate}><KeyRound size={16} strokeWidth={1.75} />{loading ? tx('Membuat...', 'Creating...') : tx('Buat tautan transfer', 'Create transfer link')}</button>
      {url && <div className="flex gap-2 items-center bg-[var(--s2)] rounded-lg p-3">
        <span className="truncate text-[13px] min-w-0 flex-1 select-all">{url}</span>
        <button className="btn btn-g btn-sm" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? tx('Disalin', 'Copied') : tx('Salin', 'Copy')}</button>
      </div>}
      <p className="text-[13px] text-[var(--warn)]">{tx('Tautan ini memberikan akses akun. Buka hanya di perangkat milikmu.', 'This link grants account access. Open it only on your own device.')}</p>
    </div>
  </Sheet>;
};
