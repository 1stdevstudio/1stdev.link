import React, { useState } from 'react';
import {
  Copy, Check, Share2, Plus, LayoutGrid, UserPen, BarChart2, Circle, CheckCircle2, ArrowRight, ExternalLink,
} from 'lucide-react';
import { AuthSession, BioProfile, LinkItem } from '../../types';
import { useI18n } from '../../i18n/context';

interface HomeScreenProps {
  session: AuthSession;
  profile: BioProfile;
  links: LinkItem[];
  onOpenShare: () => void;
  onOpenAddLink: () => void;
  onOpenAddBlock: () => void;
  onOpenEditProfile: () => void;
  onOpenSaveAccount: () => void;
  onGoTo: (tab: 'profile' | 'links' | 'stats') => void;
  onToast: (msg: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  session, profile, links, onOpenShare, onOpenAddLink, onOpenAddBlock, onOpenEditProfile, onOpenSaveAccount, onGoTo, onToast,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const shortHost = baseUrl.replace(/^https?:\/\//, '');

  const bioBlocks = links.filter((l) => l.is_bio_entry);
  const totalClicks = links.reduce((n, l) => n + (l.clicks || 0), 0);
  const top = [...links].filter((l) => l.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 4);
  const recent = [...links].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 4);
  const maxTop = Math.max(1, ...top.map((l) => l.clicks));

  const steps = [
    { done: !!profile.avatar_url, label: 'Pasang foto profil', act: onOpenEditProfile },
    { done: !!profile.bio?.trim(), label: 'Tulis bio singkat', act: onOpenEditProfile },
    { done: bioBlocks.length >= 3, label: 'Tambah minimal 3 blok', act: onOpenAddBlock },
    { done: !session.is_guest, label: 'Simpan akun dengan email', act: onOpenSaveAccount },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const copy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    onToast('Link profil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  const actions = [
    { icon: <Plus size={20} strokeWidth={1.75} />, label: 'Link pendek', act: onOpenAddLink },
    { icon: <LayoutGrid size={20} strokeWidth={1.75} />, label: 'Tambah blok', act: onOpenAddBlock },
    { icon: <UserPen size={20} strokeWidth={1.75} />, label: 'Edit profil', act: onOpenEditProfile },
    { icon: <Share2 size={20} strokeWidth={1.75} />, label: 'Bagikan', act: onOpenShare },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="small muted">{greet}</p>
        <h2 className="text-[22px] font-semibold text-[var(--tx)] truncate">{profile.display_name || 'Kreator'}</h2>
      </div>

      <p className="free-strip"><b>{t('heroFreeHeadline')}</b> {t('heroFreeSub')}</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Bio link hero */}
        <section className="card home-hero">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-[var(--r2)] object-cover shrink-0" />
            ) : (
              <div className="fav fav-lg" aria-hidden>{(profile.display_name || 'E').charAt(0).toUpperCase()}</div>
            )}
            <div className="min-w-0">
              <p className="small muted">Halaman profil kamu</p>
              <p className="mono text-[14px] text-[var(--ac)] truncate">{shortHost}/@{profile.handle}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button type="button" className="btn btn-p btn-sm" onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Disalin' : 'Salin link'}
            </button>
            <button type="button" className="btn btn-g btn-sm" onClick={onOpenShare}><Share2 size={16} /> Bagikan</button>
            <a className="btn btn-g btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Lihat</a>
          </div>
        </section>

        {/* Setup checklist */}
        <section className="card">
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-[15px] font-semibold">Siapkan profil</h3>
            <span className="small muted">{doneCount}/{steps.length}</span>
          </div>
          <div className="bar mb-3"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          <ul className="flex flex-col">
            {steps.map((s) => (
              <li key={s.label}>
                <button type="button" className="check-row" onClick={s.act} disabled={s.done}>
                  {s.done
                    ? <CheckCircle2 size={18} strokeWidth={1.75} className="text-[var(--ok)] shrink-0" />
                    : <Circle size={18} strokeWidth={1.75} className="text-[var(--tx3)] shrink-0" />}
                  <span className={`grow text-left ${s.done ? 'line-through muted' : ''}`}>{s.label}</span>
                  {!s.done && <ArrowRight size={16} className="text-[var(--tx3)]" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="kpis kpis-4">
        <div className="kpi"><span>Total klik</span><b>{totalClicks.toLocaleString()}</b></div>
        <div className="kpi"><span>Link pendek</span><b>{links.length}</b></div>
        <div className="kpi"><span>Blok di profil</span><b>{bioBlocks.length}</b></div>
        <div className="kpi"><span>Link aktif</span><b>{links.filter((l) => l.is_active).length}</b></div>
      </div>

      <div className="quick">
        {actions.map((a) => (
          <button key={a.label} type="button" className="quick-btn" onClick={a.act}>
            <span className="text-[var(--ac)]">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold">Paling banyak diklik</h3>
            <button type="button" className="small text-[var(--ac)] min-h-[44px]" onClick={() => onGoTo('stats')}>
              <BarChart2 size={14} className="inline -mt-0.5" /> Statistik
            </button>
          </div>
          {top.length === 0 ? (
            <p className="small muted py-4">Belum ada klik. Bagikan link profil kamu untuk mulai.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {top.map((l) => (
                <li key={l.id}>
                  <div className="flex justify-between gap-2 small">
                    <span className="truncate">{l.title || `/${l.slug}`}</span><b>{l.clicks.toLocaleString()}</b>
                  </div>
                  <div className="bar"><i style={{ width: `${(l.clicks / maxTop) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold">Terbaru</h3>
            <button type="button" className="small text-[var(--ac)] min-h-[44px]" onClick={() => onGoTo('links')}>Semua link</button>
          </div>
          {recent.length === 0 ? (
            <p className="small muted py-4">Belum ada link.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center gap-3 min-w-0">
                  <div className="fav" aria-hidden>{(l.title || l.slug).charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 grow">
                    <p className="text-[14px] font-medium truncate">{l.title || l.slug}</p>
                    <p className="mono small muted truncate">{shortHost}/{l.slug}</p>
                  </div>
                  <span className={`tag shrink-0 ${l.is_active ? '' : 'off'}`}>{l.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
