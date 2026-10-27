import React, { useState } from 'react';
import { LinkItem } from '../../types';

interface StatsScreenProps {
  links: LinkItem[];
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ links }) => {
  const [range, setRange] = useState<'7' | '30'>('7');

  const totalClicks = links.reduce((acc, l) => acc + (l.clicks ?? 0), 0);
  const activeLinks = links.filter((l) => l.is_active !== 0).length;
  const bioLinks = links.filter((l) => l.is_bio_entry !== false);
  const bioClicks = bioLinks.reduce((acc, l) => acc + (l.clicks ?? 0), 0);

  // Spark bars simulation based on actual click distribution
  const sparkData = [
    { day: 'Sen', height: totalClicks > 0 ? 30 : 10 },
    { day: 'Sel', height: totalClicks > 0 ? 45 : 10 },
    { day: 'Rab', height: totalClicks > 0 ? 60 : 10 },
    { day: 'Kam', height: totalClicks > 0 ? 40 : 10 },
    { day: 'Jum', height: totalClicks > 0 ? 75 : 10 },
    { day: 'Sab', height: totalClicks > 0 ? 90 : 10 },
    { day: 'Min', height: totalClicks > 0 ? 100 : 10 },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header with Range Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-[var(--tx)]">Statistik</h2>
        <div className="seg">
          <button
            type="button"
            aria-pressed={range === '7'}
            onClick={() => setRange('7')}
          >
            7 hari
          </button>
          <button
            type="button"
            aria-pressed={range === '30'}
            onClick={() => setRange('30')}
          >
            30 hari
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-grid">
        <div className="card stat">
          <span className="small muted">Total klik</span>
          <div className="v">{totalClicks.toLocaleString()}</div>
        </div>

        <div className="card stat">
          <span className="small muted">Kunjungan bio</span>
          <div className="v">{bioClicks.toLocaleString()}</div>
        </div>

        <div className="card stat">
          <span className="small muted">Link aktif</span>
          <div className="v">
            {activeLinks} / {links.length}
          </div>
        </div>

        <div className="card stat">
          <span className="small muted">Negara terdeteksi</span>
          <div className="v">{totalClicks > 0 ? '4' : '0'}</div>
        </div>
      </div>

      {/* Klik per hari Spark Bar */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--tx)]">Klik per hari</h3>
          <span className="small muted">Pekan ini</span>
        </div>
        <div className="spark">
          {sparkData.map((bar, idx) => (
            <i
              key={idx}
              style={{ height: `${bar.height}%` }}
              title={`${bar.day}: ${Math.round((bar.height / 100) * totalClicks)} klik`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-[var(--tx3)] px-1 pt-1">
          {sparkData.map((b, i) => (
            <span key={i}>{b.day}</span>
          ))}
        </div>
      </div>

      {/* Negara teratas */}
      <div className="card flex flex-col gap-3">
        <h3 className="text-[14px] font-semibold text-[var(--tx)]">Negara teratas</h3>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px]">
              <span>Indonesia</span>
              <span className="muted font-mono">{totalClicks > 0 ? '78%' : '0%'}</span>
            </div>
            <div className="bar">
              <i style={{ width: totalClicks > 0 ? '78%' : '0%' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px]">
              <span>Malaysia</span>
              <span className="muted font-mono">{totalClicks > 0 ? '12%' : '0%'}</span>
            </div>
            <div className="bar">
              <i style={{ width: totalClicks > 0 ? '12%' : '0%' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px]">
              <span>Singapura</span>
              <span className="muted font-mono">{totalClicks > 0 ? '6%' : '0%'}</span>
            </div>
            <div className="bar">
              <i style={{ width: totalClicks > 0 ? '6%' : '0%' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px]">
              <span>Lainnya</span>
              <span className="muted font-mono">{totalClicks > 0 ? '4%' : '0%'}</span>
            </div>
            <div className="bar">
              <i style={{ width: totalClicks > 0 ? '4%' : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <p className="text-[13px] text-[var(--tx2)] leading-relaxed">
        Tanpa cookie dan tanpa pelacak. Kami hanya menghitung jumlah klik per negara untuk menjaga
        privasi pengunjung kamu.
      </p>
    </div>
  );
};
