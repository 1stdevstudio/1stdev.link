import React from 'react';
import { X, Globe, BarChart2 } from 'lucide-react';
import { LinkAnalytics, LinkItem } from '../types';

interface AnalyticsModalProps {
  link: LinkItem;
  analytics: LinkAnalytics | null;
  loading: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  link,
  analytics,
  loading,
  onClose,
}) => {
  const maxClicks =
    analytics?.by_date.reduce(
      (m: number, d: { date: string; clicks: number }) => Math.max(m, d.clicks),
      0
    ) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#0c0d13] rounded-3xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header (Zero Border) */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300">
                /{link.slug}
              </span>
              <h3 className="text-sm font-semibold text-white truncate max-w-xs">
                {link.title || link.slug}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 truncate max-w-md mt-1 font-mono">
              {link.destination_url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading || !analytics ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500">
              Aggregating edge metrics...
            </div>
          ) : (
            <>
              {/* Summary stat cards (Zero Border) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/[0.03] rounded-2xl">
                  <span className="text-xs text-neutral-400">Total Kunjungan</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {(analytics.total_clicks ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-white/[0.03] rounded-2xl">
                  <span className="text-xs text-neutral-400">Status Tautan</span>
                  <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online &amp; Aktif
                  </div>
                </div>
              </div>

              {/* Velocity Bar Chart */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={14} className="text-neutral-400" />
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                    Recent Velocity (7 Days)
                  </span>
                </div>
                <div className="space-y-2">
                  {analytics.by_date.map((d: { date: string; clicks: number }) => (
                    <div key={d.date} className="flex items-center text-xs gap-3">
                      <span className="font-mono text-neutral-400 w-24 shrink-0">{d.date}</span>
                      <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden flex items-center p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(6, (d.clicks / maxClicks) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-white w-12 text-right shrink-0">
                        {d.clicks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Country breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Globe size={14} className="text-neutral-400" />
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                    Top Regions
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {analytics.by_country.map((c: { country: string; clicks: number }) => (
                    <div
                      key={c.country}
                      className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl text-xs"
                    >
                      <span className="font-mono text-cyan-300 font-semibold">{c.country}</span>
                      <span className="font-mono text-neutral-400">{c.clicks} clicks</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded-xl transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
