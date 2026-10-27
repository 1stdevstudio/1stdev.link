import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ShieldCheck } from 'lucide-react';
import { LinkItem } from '../../types';
import { api } from '../../api';
import { useI18n } from '../../i18n/context';

interface StatsScreenProps {
  links: LinkItem[];
}

type Range = '7d' | '30d';
const MAX_LINKS = 10; // batasi request agar hemat kuota free tier

const TX = {
  id: {
    title: 'Statistik', d7: '7 hari', d30: '30 hari', clicks: 'Total klik', active: 'Link aktif',
    countries: 'Negara', best: 'Terbaik', daily: 'Klik harian', top: 'Link teratas', geo: 'Negara',
    loading: 'Memuat data…', none: 'Belum ada klik di rentang ini.', emptyT: 'Belum ada data',
    emptyD: 'Buat dan bagikan link dulu. Klik akan muncul di sini.', privacy: 'Kami hanya menghitung klik dan negara. Tanpa data pribadi pengunjung.',
    unknown: 'Tidak diketahui', click: 'klik', err: 'Gagal memuat statistik.',
  },
  en: {
    title: 'Stats', d7: '7 days', d30: '30 days', clicks: 'Total clicks', active: 'Active links',
    countries: 'Countries', best: 'Top link', daily: 'Daily clicks', top: 'Top links', geo: 'Countries',
    loading: 'Loading…', none: 'No clicks in this range yet.', emptyT: 'No data yet',
    emptyD: 'Create and share a link first. Clicks will show up here.', privacy: 'We only count clicks and countries. No personal visitor data.',
    unknown: 'Unknown', click: 'clicks', err: 'Could not load stats.',
  },
};

interface Agg {
  byDate: { date: string; clicks: number }[];
  byCountry: { country: string; clicks: number }[];
  byLink: { link: LinkItem; clicks: number }[];
  total: number;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ links }) => {
  const { lang } = useI18n();
  const s = TX[lang === 'en' ? 'en' : 'id'];
  const [range, setRange] = useState<Range>('7d');
  const [agg, setAgg] = useState<Agg | null>(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const topLinks = useMemo(
    () => [...links].sort((a, b) => b.clicks - a.clicks).slice(0, MAX_LINKS),
    [links]
  );

  useEffect(() => {
    if (topLinks.length === 0) return;
    let alive = true;
    setAgg(null);
    setError(false);
    setPicked(null);
    Promise.all(topLinks.map((l) => api.getLinkAnalytics(l.id, range).then((a) => ({ l, a }))))
      .then((rows) => {
        if (!alive) return;
        const days = range === '7d' ? 7 : 30;
        const dates = new Map<string, number>();
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
          dates.set(d, 0);
        }
        const geo = new Map<string, number>();
        let total = 0;
        const byLink = rows.map(({ l, a }) => {
          a.by_date.forEach((r) => dates.has(r.date) && dates.set(r.date, (dates.get(r.date) || 0) + r.clicks));
          a.by_country.forEach((r) => geo.set(r.country || '', (geo.get(r.country || '') || 0) + r.clicks));
          total += a.total_clicks;
          return { link: l, clicks: a.total_clicks };
        });
        setAgg({
          byDate: [...dates].map(([date, clicks]) => ({ date, clicks })),
          byCountry: [...geo].map(([country, clicks]) => ({ country, clicks })).sort((a, b) => b.clicks - a.clicks),
          byLink: byLink.filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks),
          total,
        });
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [topLinks, range]);

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[20px] font-semibold text-[var(--tx)]">{s.title}</h2>
      <div className="seg">
        {(['7d', '30d'] as Range[]).map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
            {r === '7d' ? s.d7 : s.d30}
          </button>
        ))}
      </div>
    </div>
  );

  if (links.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[20px] font-semibold text-[var(--tx)]">{s.title}</h2>
        <div className="card empty">
          <BarChart3 size={28} strokeWidth={1.75} className="text-[var(--ac)]" />
          <h3 className="text-[16px] font-semibold">{s.emptyT}</h3>
          <p className="small muted">{s.emptyD}</p>
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...(agg?.byDate.map((d) => d.clicks) || [1]));
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' });
  const regionName = (code: string) => {
    if (!code || code === 'XX') return s.unknown;
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch { return code; }
  };
  const pickedDay = picked !== null && agg ? agg.byDate[picked] : null;

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="kpis kpis-4">
        <div className="kpi"><span>{s.clicks}</span><b>{agg ? agg.total.toLocaleString() : '–'}</b></div>
        <div className="kpi"><span>{s.active}</span><b>{links.filter((l) => l.is_active).length}</b></div>
        <div className="kpi"><span>{s.countries}</span><b>{agg ? agg.byCountry.length : '–'}</b></div>
        <div className="kpi"><span>{s.best}</span><b className="truncate">{agg?.byLink[0] ? agg.byLink[0].link.title || `/${agg.byLink[0].link.slug}` : '–'}</b></div>
      </div>

      {error && <p className="small text-[var(--warn,#fbbf24)]">{s.err}</p>}

      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[15px] font-semibold">{s.daily}</h3>
          <span className="small muted" aria-live="polite">
            {pickedDay ? `${fmtDate(pickedDay.date)} · ${pickedDay.clicks} ${s.click}` : ''}
          </span>
        </div>
        {!agg ? (
          <p className="small muted py-8 text-center">{s.loading}</p>
        ) : agg.total === 0 ? (
          <p className="small muted py-8 text-center">{s.none}</p>
        ) : (
          <div className="chart" role="list">
            {agg.byDate.map((d, i) => (
              <button
                key={d.date}
                role="listitem"
                className={`col ${picked === i ? 'on' : ''}`}
                onClick={() => setPicked(picked === i ? null : i)}
                aria-label={`${fmtDate(d.date)}: ${d.clicks} ${s.click}`}
              >
                <i style={{ height: `${Math.max(3, (d.clicks / max) * 100)}%` }} />
              </button>
            ))}
          </div>
        )}
      </section>

      {agg && agg.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          <section className="card">
            <h3 className="text-[15px] font-semibold mb-3">{s.top}</h3>
            <ol className="flex flex-col gap-3">
              {agg.byLink.slice(0, 5).map((r) => (
                <li key={r.link.id}>
                  <div className="flex justify-between gap-2 small">
                    <span className="truncate">{r.link.title || `/${r.link.slug}`}</span>
                    <b>{r.clicks}</b>
                  </div>
                  <div className="bar"><i style={{ width: `${(r.clicks / agg.total) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          </section>
          <section className="card">
            <h3 className="text-[15px] font-semibold mb-3">{s.geo}</h3>
            <ol className="flex flex-col gap-3">
              {agg.byCountry.slice(0, 5).map((r) => (
                <li key={r.country}>
                  <div className="flex justify-between gap-2 small">
                    <span className="truncate">{regionName(r.country)}</span>
                    <b>{Math.round((r.clicks / agg.total) * 100)}%</b>
                  </div>
                  <div className="bar"><i style={{ width: `${(r.clicks / agg.total) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      <p className="small muted flex items-center gap-2"><ShieldCheck size={16} /> {s.privacy}</p>
    </div>
  );
};
