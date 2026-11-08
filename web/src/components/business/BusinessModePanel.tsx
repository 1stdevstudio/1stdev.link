import { useState } from 'react';
import { Plus, Store, Sparkles, ShoppingBag } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { Select } from '../Select';
import {
  BLOCK_LABELS,
  BUSINESS_TYPES,
  DEFAULT_BUSINESS,
  INDUSTRIES,
  type BusinessBlockType,
  type BusinessSettings,
} from '../../../../shared/business';

interface Props {
  value?: BusinessSettings;
  onChange: (value: BusinessSettings) => Promise<void>;
  onAdd: (kind: BusinessBlockType) => void;
  onPreset: (industry: BusinessSettings['industry']) => Promise<void>;
}

export function BusinessModePanel({
  value = DEFAULT_BUSINESS,
  onChange,
  onAdd,
  onPreset,
}: Props) {
  const { tx } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Turunkan purpose jika belum tersimpan (backwards compatibility)
  const currentPurpose: 'creator' | 'business' | 'affiliate' =
    value.purpose || (value.mode === 'business' ? 'business' : 'creator');

  const change = async (patch: Partial<BusinessSettings>) => {
    setError('');
    try {
      await onChange({ ...value, ...patch });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSelectPurpose = (target: 'creator' | 'business' | 'affiliate') => {
    if (target === 'creator') {
      void change({ mode: 'personal', purpose: 'creator' });
    } else if (target === 'business') {
      void change({
        mode: 'business',
        purpose: 'business',
        industry: value.industry || 'fnb',
      });
    } else {
      void change({
        mode: 'business',
        purpose: 'affiliate',
        industry: 'retail',
      });
    }
  };

  return (
    <section className="business-mode-panel panel3-business" aria-label="Tujuan dan mode halaman">
      <div className="business-mode-heading">
        <Store size={18} strokeWidth={1.75} className="text-[var(--ac)]" />
        <h2>{currentPurpose === 'creator' ? tx('Halaman kreator', 'Creator page') : currentPurpose === 'affiliate' ? tx('Rekomendasi affiliate', 'Affiliate recommendations') : tx('Etalase usaha', 'Business page')}</h2>
        <button type="button" className="btn btn-g btn-sm ml-auto" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>{expanded ? tx('Selesai', 'Done') : tx('Atur tujuan', 'Page setup')}</button>
      </div>
      {!expanded && <p className="small muted">{currentPurpose === 'creator' ? tx('Satukan karya, konten, dan kontak kerja sama.', 'Bring your work, content, and collaboration details together.') : currentPurpose === 'affiliate' ? tx('Kelompokkan produk pilihan dengan tautan dan keterangan afiliasi.', 'Organize recommendations with product links and an affiliate disclosure.') : tx('Tampilkan produk, layanan, dan informasi usaha dalam satu halaman.', 'Show your products, services, and business details on one page.')}</p>}
      {expanded && <>
      {/* 3 Kartu Pilihan Tujuan dengan Ikon Lucide (No Emoji, Stroke 1.75) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Pilih tujuan halaman">
        <button
          type="button"
          aria-pressed={currentPurpose === 'creator'}
          onClick={() => handleSelectPurpose('creator')}
          className={`flex flex-col items-start p-3.5 rounded-[var(--r2)] text-left transition ${
            currentPurpose === 'creator'
              ? 'bg-[var(--s2)] text-[var(--tx)]'
              : 'bg-[var(--s1)]/80 hover:bg-[var(--s2)] text-[var(--tx2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-7 h-7 rounded-[var(--r1)] grid place-items-center ${
                currentPurpose === 'creator' ? 'bg-[var(--ac)] text-[var(--ink)]' : 'bg-[var(--s2)] text-[var(--tx2)]'
              }`}
            >
              <Sparkles size={15} strokeWidth={1.75} />
            </span>
            <span className="text-[14px] font-semibold text-[var(--tx)]">Kreator</span>
          </div>
          <span className="text-[12px] text-[var(--tx3)] leading-snug">
            Karya, portofolio, dan media sosial
          </span>
        </button>

        <button
          type="button"
          aria-pressed={currentPurpose === 'business'}
          onClick={() => handleSelectPurpose('business')}
          className={`flex flex-col items-start p-3.5 rounded-[var(--r2)] text-left transition ${
            currentPurpose === 'business'
              ? 'bg-[var(--s2)] text-[var(--tx)]'
              : 'bg-[var(--s1)]/80 hover:bg-[var(--s2)] text-[var(--tx2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-7 h-7 rounded-[var(--r1)] grid place-items-center ${
                currentPurpose === 'business' ? 'bg-[var(--ac)] text-[var(--ink)]' : 'bg-[var(--s2)] text-[var(--tx2)]'
              }`}
            >
              <Store size={15} strokeWidth={1.75} />
            </span>
            <span className="text-[14px] font-semibold text-[var(--tx)]">Usaha / UMKM</span>
          </div>
          <span className="text-[12px] text-[var(--tx3)] leading-snug">
            Katalog, jam buka, lokasi, dan kontak
          </span>
        </button>

        <button
          type="button"
          aria-pressed={currentPurpose === 'affiliate'}
          onClick={() => handleSelectPurpose('affiliate')}
          className={`flex flex-col items-start p-3.5 rounded-[var(--r2)] text-left transition ${
            currentPurpose === 'affiliate'
              ? 'bg-[var(--s2)] text-[var(--tx)]'
              : 'bg-[var(--s1)]/80 hover:bg-[var(--s2)] text-[var(--tx2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-7 h-7 rounded-[var(--r1)] grid place-items-center ${
                currentPurpose === 'affiliate' ? 'bg-[var(--ac)] text-[var(--ink)]' : 'bg-[var(--s2)] text-[var(--tx2)]'
              }`}
            >
              <ShoppingBag size={15} strokeWidth={1.75} />
            </span>
            <span className="text-[14px] font-semibold text-[var(--tx)]">Afiliasi</span>
          </div>
          <span className="text-[12px] text-[var(--tx3)] leading-snug">
            Katalog rekomendasi dan tautan belanja
          </span>
        </button>
      </div>

      {/* Pengaturan Tambahan: Bidang usaha hanya ditampilkan pada purpose business */}
      <div className="business-columns">
        {currentPurpose === 'business' && (
          <label className="business-field">
            <span>Bidang usaha</span>
            <Select
              aria-label="Bidang usaha"
              value={value.industry}
              onChange={(e) => void change({ industry: e.target.value as BusinessSettings['industry'] })}
            >
              {INDUSTRIES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        )}

        {/* Pilihan Paper / Ink untuk profil mode bisnis/usaha/afiliasi */}
        {value.mode === 'business' && (
          <label className="business-field">
            <span>Tema tampilan kartu</span>
            <Select
              aria-label="Tema tampilan kartu"
              value={value.skin}
              onChange={(e) => void change({ skin: e.target.value as BusinessSettings['skin'] })}
            >
              <option value="paper">Paper · Krem hangat</option>
              <option value="ink">Ink · Hijau gelap</option>
            </Select>
          </label>
        )}
      </div>

      {/* Tombol Preset Awal Kosong (hanya untuk bisnis/afiliasi) tanpa menimpa isi lama */}
      {value.mode === 'business' && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            className="btn btn-g btn-sm self-start"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await onPreset(value.industry);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Menyiapkan...' : 'Siapkan susunan blok awal'}
          </button>
          <p className="small muted">
            Menambahkan draft blok kosong terstruktur. Isi yang sudah ada tetap tersimpan dan tidak ditimpa.
          </p>
        </div>
      )}

      {/* Blok Cepat yang Disarankan Sesuai Tujuan (Purpose-Specific Suggested Blocks) */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[12px] font-semibold text-[var(--tx2)] uppercase tracking-wider">
          {currentPurpose === 'creator'
            ? 'Saran blok pendukung kreator'
            : currentPurpose === 'affiliate'
            ? 'Saran blok katalog rekomendasi'
            : 'Saran blok usaha'}
        </span>

        <div className="business-block-library">
          {currentPurpose === 'creator' && (
            <>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('contact')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Kontak kerja sama</span>
              </button>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('announcement')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Kabar / pengumuman</span>
              </button>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('catalog')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Katalog portofolio / jasa</span>
              </button>
            </>
          )}

          {currentPurpose === 'affiliate' && (
            <>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('catalog')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Katalog produk rekomendasi</span>
              </button>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('announcement')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Keterangan / disclaimer</span>
              </button>
              <button type="button" className="btn btn-g btn-sm" onClick={() => onAdd('contact')}>
                <Plus size={14} strokeWidth={1.75} />
                <span>Kontak kerja sama</span>
              </button>
            </>
          )}

          {currentPurpose === 'business' && (
            <>
              {BUSINESS_TYPES.map((kind) => (
                <button key={kind} type="button" className="btn btn-g btn-sm" onClick={() => onAdd(kind)}>
                  <Plus size={14} strokeWidth={1.75} />
                  <span>{BLOCK_LABELS[kind]}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      </>}
      {error && (
        <p role="alert" className="business-error">
          {error}
        </p>
      )}
    </section>
  );
}
