import React, { useMemo, useState } from 'react';
import { Search, Copy, Plus, Trash2, Check, ExternalLink, Link2 } from 'lucide-react';
import { LinkItem } from '../../types';
import { useI18n } from '../../i18n/context';

interface LinksScreenProps {
  links: LinkItem[];
  onOpenAddLink: () => void;
  onToggleActive: (id: string, currentState: boolean) => void;
  onDeleteLink: (id: string) => void;
  onToast: (msg: string) => void;
}

type Filter = 'all' | 'on' | 'off' | 'bio';
type Sort = 'new' | 'clicks' | 'az';

const TX = {
  id: {
    title: 'Link', add: 'Tambah link', search: 'Cari link…', total: 'Total link', clicks: 'Total klik',
    best: 'Terbaik', all: 'Semua', on: 'Aktif', off: 'Nonaktif', bio: 'Di profil', sNew: 'Terbaru',
    sClicks: 'Klik terbanyak', sAz: 'A–Z', copied: 'Link disalin', del: 'Hapus link ini?', open: 'Buka',
    copy: 'Salin', remove: 'Hapus', app: 'Arah HP', click: 'klik', emptyT: 'Belum ada link',
    emptyD: 'Tempel link panjang, kami buatkan versi pendek yang mudah dibagikan.', noRes: 'Tidak ada link yang cocok.',
  },
  en: {
    title: 'Links', add: 'Add link', search: 'Search links…', total: 'Total links', clicks: 'Total clicks',
    best: 'Top link', all: 'All', on: 'Active', off: 'Inactive', bio: 'On profile', sNew: 'Newest',
    sClicks: 'Most clicks', sAz: 'A–Z', copied: 'Link copied', del: 'Delete this link?', open: 'Open',
    copy: 'Copy', remove: 'Delete', app: 'App routing', click: 'clicks', emptyT: 'No links yet',
    emptyD: 'Paste a long link and we will make a short one that is easy to share.', noRes: 'No matching links.',
  },
};

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
};

export const LinksScreen: React.FC<LinksScreenProps> = ({
  links, onOpenAddLink, onToggleActive, onDeleteLink, onToast,
}) => {
  const { lang } = useI18n();
  const s = TX[lang === 'en' ? 'en' : 'id'];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shortHost = host(baseUrl);

  const counts = {
    all: links.length,
    on: links.filter((l) => l.is_active).length,
    off: links.filter((l) => !l.is_active).length,
    bio: links.filter((l) => l.is_bio_entry).length,
  };
  const totalClicks = links.reduce((n, l) => n + (l.clicks || 0), 0);
  const best = links.reduce<LinkItem | null>((b, l) => (!b || l.clicks > b.clicks ? l : b), null);

  const shown = useMemo(() => {
    const q = query.toLowerCase();
    const list = links.filter((l) => {
      if (filter === 'on' && !l.is_active) return false;
      if (filter === 'off' && l.is_active) return false;
      if (filter === 'bio' && !l.is_bio_entry) return false;
      return !q || [l.title, l.slug, l.destination_url].some((v) => v?.toLowerCase().includes(q));
    });
    if (sort === 'clicks') list.sort((a, b) => b.clicks - a.clicks);
    else if (sort === 'az') list.sort((a, b) => (a.title || a.slug).localeCompare(b.title || b.slug));
    else list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return list;
  }, [links, query, filter, sort]);

  const handleCopy = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${baseUrl}/${slug}`);
    setCopiedId(id);
    onToast(s.copied);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (links.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[20px] font-semibold text-[var(--tx)]">{s.title}</h2>
        <div className="card empty">
          <Link2 size={28} strokeWidth={1.75} className="text-[var(--ac)]" />
          <h3 className="text-[16px] font-semibold">{s.emptyT}</h3>
          <p className="small muted">{s.emptyD}</p>
          <button className="btn btn-p" onClick={onOpenAddLink}><Plus size={18} /> {s.add}</button>
        </div>
      </div>
    );
  }

  const chips: Filter[] = ['all', 'on', 'off', 'bio'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold text-[var(--tx)]">{s.title}</h2>
        <span className="hidden lg:block">
          <button className="btn btn-p btn-sm" onClick={onOpenAddLink}>
            <Plus size={16} /> {s.add}
          </button>
        </span>
      </div>

      <div className="kpis">
        <div className="kpi"><span>{s.total}</span><b>{links.length}</b></div>
        <div className="kpi"><span>{s.clicks}</span><b>{totalClicks.toLocaleString()}</b></div>
        <div className="kpi"><span>{s.best}</span><b className="truncate">{best && best.clicks > 0 ? best.title || `/${best.slug}` : '–'}</b></div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx3)]" />
        <input className="input pl-10" placeholder={s.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={s.search} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {chips.map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)} aria-pressed={filter === c}>
            {s[c]} <span>{counts[c]}</span>
          </button>
        ))}
        <select className="chip-select ml-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="new">{s.sNew}</option>
          <option value="clicks">{s.sClicks}</option>
          <option value="az">{s.sAz}</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="small muted text-center py-6">{s.noRes}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((l) => (
            <li key={l.id} className={`card lcard ${l.is_active ? '' : 'dim'}`}>
              <div className="flex items-start gap-3">
                <div className="fav" aria-hidden>{host(l.destination_url).charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold">{l.title || host(l.destination_url)}</h3>
                  </div>
                  <p className="mono small text-[var(--ac)] truncate">{shortHost}/{l.slug}</p>
                  <p className="small muted truncate">{l.destination_url}</p>
                </div>
                <button
                  className={`switch ${l.is_active ? 'on' : ''}`}
                  role="switch"
                  aria-checked={!!l.is_active}
                  aria-label={l.is_active ? s.on : s.off}
                  onClick={() => onToggleActive(l.id, !!l.is_active)}
                ><i /></button>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {!!l.is_bio_entry && <span className="tag off">{s.bio}</span>}
                {(l.ios_url || l.android_url) && <span className="tag off">{s.app}</span>}
                <span className="small muted">{l.clicks.toLocaleString()} {s.click}</span>
                <div className="ml-auto flex gap-1">
                  <button className="iconbtn" onClick={() => handleCopy(l.slug, l.id)} aria-label={s.copy}>
                    {copiedId === l.id ? <Check size={18} className="text-[var(--ok)]" /> : <Copy size={18} />}
                  </button>
                  <a className="iconbtn" href={`${baseUrl}/${l.slug}`} target="_blank" rel="noopener noreferrer" aria-label={s.open}>
                    <ExternalLink size={18} />
                  </a>
                  <button className="iconbtn" onClick={() => window.confirm(s.del) && onDeleteLink(l.id)} aria-label={s.remove}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
