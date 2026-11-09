import React, { useState } from 'react';
import {
  Smartphone,
  Palette,
  UserRound,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  Languages,
  Code2,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { AuthSession } from '../../types';
import { useConfirm } from '../ConfirmDialog';

const TX = {
  id: {
    title: 'Pengaturan Akun & Profil', unsaved: 'Belum disimpan', saved: 'Tersimpan', save: 'Simpan akun',
    unsavedD: 'Akun tamu yang belum diklaim akan dibersihkan setelah 7 hari. Simpan dengan email agar profil dan link tetap aman.', guest: 'Tamu',
    done: 'Kelengkapan profil', secProfile: 'Profil & halaman', secDev: 'Perangkat & keamanan', secPref: 'Preferensi', secMore: 'Lainnya',
    editProfile: 'Informasi profil', editProfileD: 'Nama, foto, bio, dan alamat profil', move: 'Pindah perangkat', moveD: 'Scan QR atau pakai kode', lang: 'Bahasa', design: 'Tampilan halaman',
    designD: 'Tema, foto profil, cover, dan latar', dev: 'Developer', devD: 'API key dan dokumentasi', langD: 'Ikut pengaturan perangkat', key: 'API key', copy: 'Salin', copied: 'Disalin',
    keyCopied: 'API key disalin', keyHint: 'Kirim di header Authorization: Bearer <key>.',
    legal: 'Ketentuan & Privasi', legalD: 'Pelajari pengelolaan dan hak data', out: 'Keluar',
    outD: 'Ganti akun atau mulai baru', outT: 'Keluar dari sesi ini?', outQ: 'Simpan akun dulu agar profil dan link tidak hilang.',
  },
  en: {
    title: 'Account & Profile Settings', unsaved: 'Not saved', saved: 'Saved', save: 'Save account',
    unsavedD: 'Unclaimed guest accounts expire after 7 days. Save with your email to keep your profile and links.', guest: 'Guest',
    done: 'Profile completeness', secProfile: 'Profile & page', secDev: 'Devices & security', secPref: 'Preferences', secMore: 'More',
    editProfile: 'Profile information', editProfileD: 'Name, photo, bio, and profile URL', move: 'Move to another device', moveD: 'Scan a QR or use a code', lang: 'Language', design: 'Page appearance',
    designD: 'Theme, profile photo, cover, and background', dev: 'Developer', devD: 'API key and docs', langD: 'Follows your device settings', key: 'API key', copy: 'Copy', copied: 'Copied',
    keyCopied: 'API key copied', keyHint: 'Send it in the Authorization: Bearer <key> header.',
    legal: 'Terms & Privacy', legalD: 'Learn about data use and your rights', out: 'Log out',
    outD: 'Switch account or start over', outT: 'Log out of this session?', outQ: 'Save your account first so your profile and links are not lost.',
  },
};

const Row: React.FC<{ icon: React.ReactNode; title: string; desc?: string; onClick: () => void; danger?: boolean }> = ({
  icon, title, desc, onClick, danger,
}) => (
  <button type="button" className={`menu-item ${danger ? 'text-rose-700' : ''}`} onClick={onClick}>
    <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0">{icon}</span>
    <span className="grow text-left min-w-0">
      <span className={`block text-[14px] font-semibold ${danger ? '' : 'text-[var(--tx)]'}`}>{title}</span>
      {desc && <span className="small muted block truncate">{desc}</span>}
    </span>
    {!danger && <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] shrink-0" />}
  </button>
);

interface AccountScreenProps {
  session: AuthSession;
  onOpenSaveAccount: () => void;
  onOpenDeviceTransfer: () => void;
  onGoToProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({
  session,
  onOpenSaveAccount,
  onOpenDeviceTransfer,
  onGoToProfile,
  onOpenEditProfile,
  onOpenLegal,
  onLogout,
  onToast,
}) => {
  const { lang } = useI18n();
  const s = TX[lang === 'en' ? 'en' : 'id'];
  const [copiedKey, setCopiedKey] = useState(false);
  const confirm = useConfirm();

  const handleCopyApiKey = () => {
    if (!session.api_key) return;
    navigator.clipboard.writeText(session.api_key);
    setCopiedKey(true);
    onToast(s.keyCopied);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const checks = [!!session.display_name, !!session.handle, !session.is_guest];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const iconBox = (icon: React.ReactNode) => (
    <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0">{icon}</span>
  );

  return (
    <div className="acct panel3-account flex flex-col gap-5">
      <header className="workspace-page-head">
        <p className="workspace-eyebrow">{lang === 'en' ? 'PREFERENCES & SECURITY' : 'PREFERENSI & KEAMANAN'}</p>
        <h1 className="workspace-page-title">{s.title}</h1>
        <p className="workspace-page-subtitle">{lang === 'en' ? 'Manage your profile, account, privacy, devices, and security in one place.' : 'Kelola profil, akun, privasi, perangkat, dan keamanan di satu tempat.'}</p>
      </header>

      {/* Mobile: satu kolom. Desktop: kartu akun menempel di kiri, pengaturan di kanan. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-6 items-start">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
          <div className="card flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="fav fav-lg" aria-hidden>{(session.display_name || session.handle || 'E').charAt(0).toUpperCase()}</div>
              <div className="min-w-0 grow">
                <p className="text-[15px] font-semibold truncate">{session.display_name || s.guest}</p>
                <p className="small muted truncate mono">{session.handle ? `@${session.handle}` : session.email || ''}</p>
              </div>
            </div>
            <span className={`tag self-start ${session.is_guest ? 'off' : ''}`}>{session.is_guest ? s.unsaved : s.saved}</span>
            <div>
              <div className="flex justify-between small muted mb-1"><span>{s.done}</span><span>{pct}%</span></div>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
            {session.is_guest && (
              <>
                <p className="small muted">{s.unsavedD}</p>
                <button type="button" className="btn btn-p btn-w" onClick={onOpenSaveAccount}>{s.save}</button>
              </>
            )}
          </div>

        </aside>

        <div className="flex flex-col gap-4 min-w-0">
          <section className="settings-group flex flex-col gap-1">
            <h3 className="sec-label">{s.secProfile}</h3>
            <Row icon={<UserRound size={18} strokeWidth={1.75} />} title={s.editProfile} desc={s.editProfileD} onClick={onOpenEditProfile} />
            <Row icon={<Palette size={18} strokeWidth={1.75} />} title={s.design} desc={s.designD} onClick={onGoToProfile} />
          </section>

          <section className="settings-group flex flex-col gap-1">
            <h3 className="sec-label">{s.secDev}</h3>
            <Row icon={<Smartphone size={18} strokeWidth={1.75} />} title={s.move} desc={s.moveD} onClick={onOpenDeviceTransfer} />
          </section>

          <section className="settings-group flex flex-col gap-1">
            <h3 className="sec-label">{s.secPref}</h3>
            <div className="menu-item cursor-default">
              {iconBox(<Languages size={18} strokeWidth={1.75} />)}
              <span className="grow min-w-0">
                <span className="block text-[14px] font-semibold text-[var(--tx)]">{s.lang}</span>
                <span className="small muted block truncate">{s.langD}</span>
              </span>
              {/* Bahasa otomatis mengikuti pengaturan perangkat. */}
              <span className="text-[13px] font-semibold text-[var(--tx)] shrink-0">{lang === 'en' ? 'English' : 'Indonesia'}</span>
            </div>
          </section>

          <section className="settings-group flex flex-col gap-1">
            <h3 className="sec-label">{s.secMore}</h3>
            <details className="adv acct-dev">
              <summary className="menu-item">
                {iconBox(<Code2 size={18} strokeWidth={1.75} />)}
                <span className="grow text-left min-w-0">
                  <span className="block text-[14px] font-semibold text-[var(--tx)]">{s.dev}</span>
                  <span className="small muted block truncate">{s.devD}</span>
                </span>
                <ChevronRight size={18} strokeWidth={1.75} className="chev text-[var(--tx3)] shrink-0 transition-transform" />
              </summary>
              <div className="body">
                <div className="field">
                  <label htmlFor="dev-key">{s.key}</label>
                  <div className="flex items-center gap-2">
                    <input id="dev-key" type="text" readOnly className="mono text-[12px] min-w-0" value={session.api_key || 'el_live_••••••••'} />
                    <button type="button" className="btn btn-g btn-sm shrink-0" onClick={handleCopyApiKey}>
                      {copiedKey ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                      <span>{copiedKey ? s.copied : s.copy}</span>
                    </button>
                  </div>
                  <div className="hint">{s.keyHint}</div>
                </div>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ac)] hover:underline font-semibold min-h-[44px]"
                >
                  <span>{lang === 'en' ? 'Open API docs' : 'Buka dokumentasi API'}</span>
                  <ChevronRight size={14} strokeWidth={2} />
                </a>
              </div>
            </details>
            <Row icon={<ShieldCheck size={18} strokeWidth={1.75} />} title={s.legal} desc={s.legalD} onClick={() => onOpenLegal('terms')} />
          </section>

          <div className="settings-signout"><Row danger icon={<LogOut size={18} strokeWidth={1.75} />} title={s.out} desc={s.outD} onClick={async () => { if (await confirm({ title: s.outT, message: s.outQ, confirmLabel: s.out, danger: true })) onLogout(); }} /></div>
        </div>
      </div>
    </div>
  );
};
