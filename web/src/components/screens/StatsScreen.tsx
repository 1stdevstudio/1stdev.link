import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RotateCw, ShieldCheck, Plus } from 'lucide-react';
import { LinkItem } from '../../types';
import { api } from '../../api';
import { isContentBlock } from '../../../../shared/business';
import { useI18n } from '../../i18n/context';

interface StatsScreenProps {
  links: LinkItem[];
  onOpenAddLink: () => void;
}

type Range = '7d' | '30d';

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
  byLink: { link: Pick<LinkItem, 'id' | 'title' | 'slug'>; clicks: number }[];
  active: number;
  total: number;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ links, onOpenAddLink }) => {
  const { lang } = useI18n();
  const s = TX[lang === 'en' ? 'en' : 'id'];
  const [range, setRange] = useState<Range>('7d');
  const [agg, setAgg] = useState<Agg | null>(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const [retry, setRetry] = useState(0);
  const redirectLinks = useMemo(() => links.filter((link) => !isContentBlock(link.block_type) && link.destination_url !== '#'), [links]);

  useEffect(() => {
    let alive = true;
    setAgg(null);
    setError(false);
    setPicked(null);
    api.getAnalyticsSummary(range).then((summary) => {
      if (!alive) return;
      const dates = new Map<string, number>();
      const days = range === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) dates.set(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), 0);
      for (const row of summary.by_date) if (dates.has(row.date)) dates.set(row.date, row.clicks);
      setAgg({
        total: summary.total_clicks,
        active: summary.active_links,
        byDate: [...dates].map(([date, clicks]) => ({ date, clicks })),
        byCountry: summary.by_country,
        byLink: summary.by_link.filter((link) => link.clicks > 0).map((link) => ({ link, clicks: link.clicks })),
      });
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [redirectLinks, range, retry]);

  const downloadSummary = () => {
    if (!agg) return;
    const cell = (raw: string | number) => {
      let value = String(raw);
      if (/^\s*[=+@-]/.test(value)) value = `'${value}`;
      return `"${value.replace(/"/g, '""')}"`;
    };
    const rows: (string | number)[][] = [
      ['section', 'date_or_name', 'clicks'],
      ...agg.byDate.map((row) => ['daily_utc', row.date, row.clicks]),
      ...agg.byCountry.map((row) => ['country', row.country, row.clicks]),
      ...agg.byLink.map((row) => ['top_link', row.link.title || row.link.slug, row.clicks]),
      ['total', range, agg.total],
    ];
    const blob = new Blob(['\ufeff', rows.map((row) => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `1stdev-statistik-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <header className="workspace-page-head">
        <p className="workspace-eyebrow">{lang === 'en' ? 'PERFORMANCE' : 'PERFORMA'}</p>
        <h1 className="workspace-page-title">{s.title}</h1>
        <p className="workspace-page-subtitle">{lang === 'en' ? 'See how your short links perform over time.' : 'Lihat perkembangan performa link pendekmu dari waktu ke waktu.'}</p>
      </header>
      <div className="seg">
        {(['7d', '30d'] as Range[]).map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
            {r === '7d' ? s.d7 : s.d30}
          </button>
        ))}
      </div>
    </div>
  );

  if (agg && agg.total === 0 && agg.active === 0 && redirectLinks.length === 0) {
    return (
      <div className="panel3-stats flex flex-col gap-5">
        {header}
        <div className="card empty panel3-stats-empty">
          <span className="panel3-stats-empty-icon"><BarChart3 size={29} strokeWidth={1.75} aria-hidden="true" /></span>
          <h3 className="text-[20px] font-semibold">{s.emptyT}</h3>
          <p className="small muted">{s.emptyD}</p>
          <button type="button" className="btn btn-p btn-sm" onClick={onOpenAddLink}>
            <Plus size={17} strokeWidth={2} aria-hidden="true"/>
            {lang === 'en' ? 'Create your first short link' : 'Buat link pendek pertama'}
          </button>
          <p className="panel3-stats-empty-note">{lang === 'en'
            ? 'Clicks appear automatically after someone opens your shared short link.'
            : 'Klik akan tercatat otomatis setelah orang membuka link pendek yang kamu bagikan.'}</p>
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...(agg?.byDate.map((d) => d.clicks) || [1]));
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const regionName = (code: string) => {
    if (!code || code === 'XX') return s.unknown;
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch { return code; }
  };
  const pickedDay = picked !== null && agg ? agg.byDate[picked] : null;

  return (
    <div className="panel3-stats flex flex-col gap-5">
      {header}

      <div className="kpis kpis-4 panel3-stats-metrics">
        <div className="kpi"><span>{s.clicks}</span><b>{agg ? agg.total.toLocaleString() : '–'}</b></div>
        <div className="kpi"><span>{s.active}</span><b>{agg ? agg.active : '–'}</b></div>
        <div className="kpi"><span>{s.countries}</span><b>{agg ? agg.byCountry.length : '–'}</b></div>
        <div className="kpi"><span>{s.best}</span><b className="truncate">{agg?.byLink[0] ? agg.byLink[0].link.title || `/${agg.byLink[0].link.slug}` : '–'}</b></div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="small muted">{lang === 'en' ? 'All tracked links · dates in UTC · clicks are not sales' : 'Semua link terlacak · tanggal dalam UTC · klik bukan penjualan'}</p>
        <button type="button" className="btn btn-g btn-sm gap-2" disabled={!agg} onClick={downloadSummary}><Download size={16} />{lang === 'en' ? 'Export summary' : 'Unduh ringkasan'}</button>
      </div>
      {error && <div role="alert" className="card flex items-center justify-between gap-3"><p className="small text-[var(--warn,#fbbf24)]">{s.err}</p><button type="button" className="btn btn-g btn-sm gap-2" onClick={() => setRetry((value) => value + 1)}><RotateCw size={16} />{lang === 'en' ? 'Retry' : 'Coba lagi'}</button></div>}

      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[15px] font-semibold">{s.daily}</h3>
          <span className="small muted" aria-live="polite">
            {pickedDay ? `${fmtDate(pickedDay.date)} · ${pickedDay.clicks} ${s.click}` : ''}
          </span>
        </div>
        {!agg ? (
          <p className="small muted py-8 text-center">{error ? s.err : s.loading}</p>
        ) : agg.total === 0 ? (
          <p className="small muted py-8 text-center">{s.none}</p>
        ) : (
          <div className="chart panel3-chart" role="list">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
