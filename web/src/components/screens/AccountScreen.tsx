import React, { useState } from 'react';
import {
  Smartphone,
  Palette,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { AuthSession } from '../../types';

interface AccountScreenProps {
  session: AuthSession;
  onOpenSaveAccount: () => void;
  onOpenDeviceTransfer: () => void;
  onGoToProfile: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
  session,
  onOpenSaveAccount,
  onOpenDeviceTransfer,
  onGoToProfile,
  onOpenLegal,
  onLogout,
  onToast,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyApiKey = () => {
    if (!session.api_key) return;
    navigator.clipboard.writeText(session.api_key);
    setCopiedKey(true);
    onToast('API Key disalin');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <h2 className="text-[20px] font-semibold text-[var(--tx)]">Akun</h2>

      {/* Account Status Card */}
      <div className="card flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--tx)]">
            {session.is_guest ? 'Belum disimpan' : 'Akun tersimpan'}
          </h3>
          <p className="small muted truncate">
            {session.is_guest
              ? 'Simpan dengan email agar bisa dibuka di perangkat lain.'
              : session.email || 'Email terverifikasi'}
          </p>
        </div>
        {session.is_guest ? (
          <button
            type="button"
            className="btn btn-p btn-sm shrink-0"
            onClick={onOpenSaveAccount}
          >
            Simpan
          </button>
        ) : (
          <span className="tag shrink-0">Tersimpan</span>
        )}
      </div>

      {/* Menu Items */}
      <div className="flex flex-col gap-1 pt-1">
        <button
          type="button"
          className="menu-item"
          onClick={onOpenDeviceTransfer}
        >
          <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--tx2)] shrink-0">
            <Smartphone size={18} strokeWidth={1.75} />
          </span>
          <span className="grow text-left min-w-0">
            <h4 className="text-[14px] font-semibold text-[var(--tx)]">Pindah perangkat</h4>
            <span className="small muted block">Scan QR atau pakai kode</span>
          </span>
          <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] shrink-0" />
        </button>

        <button
          type="button"
          className="menu-item"
          onClick={onGoToProfile}
        >
          <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--tx2)] shrink-0">
            <Palette size={18} strokeWidth={1.75} />
          </span>
          <span className="grow text-left min-w-0">
            <h4 className="text-[14px] font-semibold text-[var(--tx)]">Tampilan profil</h4>
            <span className="small muted block">Tema dan bentuk foto</span>
          </span>
          <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] shrink-0" />
        </button>

        {/* Developer Expander */}
        <details className="adv mt-1">
          <summary>
            <span>Developer</span>
            <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] transition-transform" />
          </summary>
          <div className="body">
            <div className="field">
              <label htmlFor="dev-key">API Key (Bearer Token)</label>
              <div className="flex items-center gap-2">
                <input
                  id="dev-key"
                  type="text"
                  readOnly
                  className="mono text-[12px]"
                  value={session.api_key || 'el_live_••••••••'}
                />
                <button
                  type="button"
                  className="btn btn-g btn-sm shrink-0"
                  onClick={handleCopyApiKey}
                >
                  {copiedKey ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                  <span>{copiedKey ? 'Disalin' : 'Salin'}</span>
                </button>
              </div>
              <div className="hint">
                Gunakan header <code className="text-[var(--ac)]">Authorization: Bearer &lt;key&gt;</code> untuk integrasi API Worker.
              </div>
            </div>
          </div>
        </details>

        <button
          type="button"
          className="menu-item mt-1"
          onClick={() => onOpenLegal('terms')}
        >
          <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--tx2)] shrink-0">
            <ShieldCheck size={18} strokeWidth={1.75} />
          </span>
          <span className="grow text-left min-w-0">
            <h4 className="text-[14px] font-semibold text-[var(--tx)]">Ketentuan & Privasi</h4>
            <span className="small muted block">100% Gratis, tanpa pelacak, kepemilikan data</span>
          </span>
          <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] shrink-0" />
        </button>

        <button
          type="button"
          className="menu-item mt-2 text-rose-400 hover:text-rose-300"
          onClick={() => {
            if (confirm('Keluar dari sesi ini? Pastikan akun sudah disimpan agar tidak hilang.')) {
              onLogout();
            }
          }}
        >
          <span className="w-9 h-9 rounded-[var(--r2)] bg-rose-500/10 grid place-items-center text-rose-400 shrink-0">
            <LogOut size={18} strokeWidth={1.75} />
          </span>
          <span className="grow text-left min-w-0">
            <h4 className="text-[14px] font-semibold">Keluar / Ganti Akun</h4>
            <span className="small opacity-70 block">Ganti ke akun lain atau mulai baru</span>
          </span>
        </button>
      </div>
    </div>
  );
};
