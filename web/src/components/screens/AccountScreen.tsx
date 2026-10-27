import React, { useState } from 'react';
import {
  Smartphone,
  Palette,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  Gift,
  Languages,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { AuthSession } from '../../types';

const TX = {
  id: {
    title: 'Akun', unsaved: 'Belum disimpan', saved: 'Tersimpan', save: 'Simpan akun',
    unsavedD: 'Simpan dengan email agar profil dan link tidak hilang saat ganti HP.', guest: 'Tamu',
    done: 'Kelengkapan profil', secDev: 'Perangkat & keamanan', secPref: 'Preferensi', secMore: 'Lainnya',
    move: 'Pindah perangkat', moveD: 'Scan QR atau pakai kode', lang: 'Bahasa', design: 'Desain halaman',
    designD: 'Foto, tema, dan efek', dev: 'Developer', key: 'API key', copy: 'Salin', copied: 'Disalin',
    keyCopied: 'API key disalin', keyHint: 'Kirim di header Authorization: Bearer <key>.',
    legal: 'Ketentuan & Privasi', legalD: 'Tanpa pelacak, data milikmu', out: 'Keluar',
    outD: 'Ganti akun atau mulai baru', outQ: 'Keluar dari sesi ini? Simpan akun dulu agar tidak hilang.',
  },
  en: {
    title: 'Account', unsaved: 'Not saved', saved: 'Saved', save: 'Save account',
    unsavedD: 'Save with your email so your profile and links survive a phone change.', guest: 'Guest',
    done: 'Profile completeness', secDev: 'Devices & security', secPref: 'Preferences', secMore: 'More',
    move: 'Move to another device', moveD: 'Scan a QR or use a code', lang: 'Language', design: 'Page design',
    designD: 'Photos, theme and effects', dev: 'Developer', key: 'API key', copy: 'Copy', copied: 'Copied',
    keyCopied: 'API key copied', keyHint: 'Send it in the Authorization: Bearer <key> header.',
    legal: 'Terms & Privacy', legalD: 'No trackers, your data stays yours', out: 'Log out',
    outD: 'Switch account or start over', outQ: 'Log out of this session? Save your account first so nothing is lost.',
  },
};

const Row: React.FC<{ icon: React.ReactNode; title: string; desc?: string; onClick: () => void; danger?: boolean }> = ({
  icon, title, desc, onClick, danger,
}) => (
  <button type="button" className={`menu-item ${danger ? 'text-rose-400' : ''}`} onClick={onClick}>
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
  const { t, lang, setLang } = useI18n();
  const s = TX[lang === 'en' ? 'en' : 'id'];
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyApiKey = () => {
    if (!session.api_key) return;
    navigator.clipboard.writeText(session.api_key);
    setCopiedKey(true);
    onToast(s.keyCopied);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const checks = [!!session.display_name, !!session.handle, !session.is_guest];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[20px] font-semibold text-[var(--tx)]">{s.title}</h2>

      <div className="card free-card">
        <Gift size={20} strokeWidth={1.75} className="shrink-0 text-[var(--ok)]" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{t('heroFreeHeadline')}</p>
          <p className="small muted">{t('heroFreeSub')}</p>
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="fav fav-lg" aria-hidden>{(session.display_name || session.handle || 'E').charAt(0).toUpperCase()}</div>
          <div className="min-w-0 grow">
            <p className="text-[15px] font-semibold truncate">{session.display_name || s.guest}</p>
            <p className="small muted truncate mono">{session.handle ? `@${session.handle}` : session.email || ''}</p>
          </div>
          <span className={`tag shrink-0 ${session.is_guest ? 'off' : ''}`}>{session.is_guest ? s.unsaved : s.saved}</span>
        </div>
        <div>
          <div className="flex justify-between small muted mb-1"><span>{s.done}</span><span>{pct}%</span></div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        {session.is_guest && (
          <>
            <p className="small muted">{s.unsavedD}</p>
            <button type="button" className="btn btn-p" onClick={onOpenSaveAccount}>{s.save}</button>
          </>
        )}
      </div>

      <section className="flex flex-col gap-1">
        <h3 className="sec-label">{s.secDev}</h3>
        <Row icon={<Smartphone size={18} strokeWidth={1.75} />} title={s.move} desc={s.moveD} onClick={onOpenDeviceTransfer} />
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="sec-label">{s.secPref}</h3>
        <div className="menu-item cursor-default">
          <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0"><Languages size={18} strokeWidth={1.75} /></span>
          <span className="grow text-[14px] font-semibold text-[var(--tx)]">{s.lang}</span>
          <div className="seg w-[132px] shrink-0">
            <button type="button" aria-pressed={lang === 'id'} onClick={() => setLang('id')}>ID</button>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
        <Row icon={<Palette size={18} strokeWidth={1.75} />} title={s.design} desc={s.designD} onClick={onGoToProfile} />
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="sec-label">{s.secMore}</h3>
        <details className="adv">
          <summary>
            <span>{s.dev}</span>
            <ChevronRight size={18} strokeWidth={1.75} className="text-[var(--tx3)] transition-transform" />
          </summary>
          <div className="body">
            <div className="field">
              <label htmlFor="dev-key">{s.key}</label>
              <div className="flex items-center gap-2">
                <input id="dev-key" type="text" readOnly className="mono text-[12px]" value={session.api_key || 'el_live_••••••••'} />
                <button type="button" className="btn btn-g btn-sm shrink-0" onClick={handleCopyApiKey}>
                  {copiedKey ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                  <span>{copiedKey ? s.copied : s.copy}</span>
                </button>
              </div>
              <div className="hint">{s.keyHint}</div>
            </div>
          </div>
        </details>
        <Row icon={<ShieldCheck size={18} strokeWidth={1.75} />} title={s.legal} desc={s.legalD} onClick={() => onOpenLegal('terms')} />
        <Row danger icon={<LogOut size={18} strokeWidth={1.75} />} title={s.out} desc={s.outD} onClick={() => { if (confirm(s.outQ)) onLogout(); }} />
      </section>
    </div>
  );
};
