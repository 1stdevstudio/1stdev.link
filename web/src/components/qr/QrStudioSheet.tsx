import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Download, ImagePlus, LoaderCircle, RotateCcw, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { Sheet } from '../Sheet';
import { useI18n } from '../../i18n/context';
import {
  DEFAULT_QR_DESIGN, QR_PRESETS, qrContrast, qrStyleError, renderQrPng,
  renderQrSvg, verifyQrExport, normalizeQrLogo, type QrDesign,
} from '../../lib/qr/qrDesign';

export interface QrTarget {
  url: string;
  title: string;
  type: 'profile' | 'link';
}

type Status = 'checking' | 'ready' | 'invalid';

interface QrStudioSheetProps {
  isOpen: boolean;
  target: QrTarget | null;
  onClose: () => void;
  onToast: (message: string) => void;
}

const labels = {
  classic: ['Klasik', 'Classic'],
  brand: ['Brand', 'Brand'],
  minimal: ['Minimal', 'Minimal'],
  ocean: ['Biru', 'Ocean'],
} as const;

export const QrStudioSheet: React.FC<QrStudioSheetProps> = ({ isOpen, target, onClose, onToast }) => {
  const { tx } = useI18n();
  const [design, setDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN);
  const [svg, setSvg] = useState('');
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [size, setSize] = useState<512 | 1024 | 2048>(1024);
  const payload = target?.url || '';

  useEffect(() => {
    if (!isOpen) return;
    setDesign({ ...DEFAULT_QR_DESIGN });
    setSvg('');
    setError('');
    setStatus('checking');
    setSize(1024);
  }, [isOpen, payload]);

  useEffect(() => {
    if (!isOpen || !payload) return;
    let cancelled = false;
    setStatus('checking');
    setError('');
    const timer = window.setTimeout(async () => {
      const styleIssue = qrStyleError(design);
      if (styleIssue) {
        if (!cancelled) {
          setStatus('invalid');
          setError(styleIssue);
          setSvg('');
        }
        return;
      }
      try {
        const nextSvg = renderQrSvg(payload, design, 512);
        const blob = await renderQrPng(nextSvg, 512);
        const decoded = await verifyQrExport(blob, payload);
        if (!cancelled) {
          setSvg(nextSvg);
          setStatus(decoded ? 'ready' : 'invalid');
          setError(decoded ? '' : 'cannot-decode');
        }
      } catch {
        if (!cancelled) {
          setSvg('');
          setStatus('invalid');
          setError('render-failed');
        }
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, payload, design]);

  if (!target) return null;

  const update = (patch: Partial<QrDesign>) => setDesign((current) => ({ ...current, ...patch }));
  const problem = error === 'low-contrast'
    ? tx('Kontras warna terlalu rendah. Pilih warna lebih gelap dan latar terang.', 'Contrast is too low. Use darker ink on a light background.')
    : error === 'dark-background'
      ? tx('Latar harus lebih terang dari pola QR.', 'The background must be lighter than the QR dots.')
      : error === 'cannot-decode'
        ? tx('Kode QR gagal dibaca ulang. Coba pola kotak atau lepaskan logo.', 'QR could not be decoded. Try square dots or remove the logo.')
        : error === 'invalid-logo'
          ? tx('Format logo tidak aman.', 'Logo format is not safe.')
          : tx('Desain ini belum bisa dibuat. Gunakan preset aman.', 'This design cannot be generated. Try a safe preset.');

  const onLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = await normalizeQrLogo(file);
      update({ logoDataUrl: data });
    } catch {
      onToast(tx('Logo harus PNG/JPG/WebP maksimal 512 KB.', 'Logo must be PNG/JPG/WebP up to 512 KB.'));
    }
  };

  const exportQr = async (format: 'png' | 'svg') => {
    if (status !== 'ready' || exporting || !payload) return;
    setExporting(true);
    try {
      const exportedSvg = renderQrSvg(payload, design, size);
      const png = await renderQrPng(exportedSvg, size);
      if (!await verifyQrExport(png, payload)) throw new Error('cannot-decode');
      const file = format === 'svg'
        ? new Blob([exportedSvg], { type: 'image/svg+xml;charset=utf-8' })
        : png;
      const url = URL.createObjectURL(file);
      const filename = target.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'link';
      const link = document.createElement('a');
      link.href = url;
      link.download = '1stdev-qr-' + filename + '.' + format;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      onToast(tx('QR berhasil diunduh.', 'QR downloaded successfully.'));
    } catch {
      setStatus('invalid');
      setError('cannot-decode');
      onToast(tx('QR tidak dapat diekspor. Periksa kembali desain.', 'QR could not be exported. Review the design.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={tx('Custom QR Studio', 'Custom QR Studio')} className="qr-studio-modal">
      <div className="qr-studio">
        <div className="qr-studio-intro">
          <div><span className="qr-studio-eyebrow"><Sparkles size={13} aria-hidden="true" /> QR DESIGN STUDIO</span>
            <h3>{tx('Desain QR sesuai gaya kamu.', 'Make your QR your own.')}</h3>
            <p>{tx('Buat QR yang mudah dipindai dan siap dicetak. Tidak perlu menyimpan akun.', 'Make a scannable, print-ready QR. No account required.')}</p>
          </div>
          <span className="qr-studio-static">{tx('QR statis', 'Static QR')}</span>
        </div>

        <div className="qr-studio-layout">
          <div className="qr-studio-controls">
            <section className="qr-studio-section">
              <h4>01 <span>{tx('Tujuan QR', 'QR destination')}</span></h4>
              <div className="qr-studio-target">
                <span className="qr-studio-target-type">{target.type === 'profile' ? tx('Halaman profil', 'Profile page') : tx('Link pendek', 'Short link')}</span>
                <strong>{target.title}</strong>
                <span title={payload}>{payload}</span>
              </div>
            </section>

            <section className="qr-studio-section">
              <h4>02 <span>{tx('Pilih template', 'Choose a preset')}</span></h4>
              <div className="qr-studio-presets" role="group" aria-label={tx('Template QR', 'QR presets')}>
                {QR_PRESETS.map((preset) => {
                  const selected = design.foreground === preset.foreground && design.background === preset.background &&
                    design.dots === preset.dots && design.eyes === preset.eyes;
                  return (
                    <button key={preset.id} type="button" className={'qr-studio-preset' + (selected ? ' is-active' : '')}
                      aria-pressed={selected}
                      onClick={() => update({ foreground: preset.foreground, background: preset.background, dots: preset.dots, eyes: preset.eyes })}>
                      <span className="qr-studio-preset-swatch" style={{ background: preset.background, color: preset.foreground }}>
                        <span style={{ background: preset.foreground }}/><span style={{ background: preset.foreground }}/><span style={{ background: preset.foreground }}/><span style={{ background: preset.foreground }}/>
                      </span>
                      <small>{tx(labels[preset.id][0], labels[preset.id][1])}</small>
                      {selected && <Check size={13} className="qr-studio-preset-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="qr-studio-section">
              <h4>03 <span>{tx('Warna dan bentuk', 'Colors and shapes')}</span></h4>
              <div className="qr-studio-color-grid">
                <label><span>{tx('Warna kode', 'QR color')}</span>
                  <span className="qr-studio-color-input"><input type="color" value={/^#[0-9a-f]{6}$/i.test(design.foreground) ? design.foreground : '#17362D'} onChange={(e) => update({ foreground: e.target.value })} aria-label={tx('Pilih warna QR', 'Pick QR color')} /><input type="text" value={design.foreground} onChange={(e) => update({ foreground: e.target.value.toUpperCase().slice(0, 7) })} aria-label={tx('Hex warna QR', 'QR color hex')} maxLength={7}/></span>
                </label>
                <label><span>{tx('Warna latar', 'Background color')}</span>
                  <span className="qr-studio-color-input"><input type="color" value={/^#[0-9a-f]{6}$/i.test(design.background) ? design.background : '#FFFFFF'} onChange={(e) => update({ background: e.target.value })} aria-label={tx('Pilih warna latar', 'Pick background color')} /><input type="text" value={design.background} onChange={(e) => update({ background: e.target.value.toUpperCase().slice(0, 7) })} aria-label={tx('Hex warna latar', 'Background color hex')} maxLength={7}/></span>
                </label>
              </div>
              <div className="qr-studio-field">
                <span>{tx('Bentuk titik', 'Dot style')}</span>
                <div className="qr-studio-options" role="group" aria-label={tx('Bentuk titik QR', 'QR dot style')}>
                  {(['square', 'rounded', 'dots'] as const).map((dots) => (
                    <button type="button" key={dots} className={design.dots === dots ? 'is-active' : ''}
                      aria-pressed={design.dots === dots} onClick={() => update({ dots })}>
                      {{ square: tx('Kotak', 'Square'), rounded: tx('Lembut', 'Rounded'), dots: tx('Bulat', 'Dots') }[dots]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="qr-studio-field">
                <span>{tx('Sudut QR', 'QR corners')}</span>
                <div className="qr-studio-options" role="group" aria-label={tx('Sudut QR', 'QR corners')}>
                  {(['square', 'rounded'] as const).map((eyes) => (
                    <button type="button" key={eyes} className={design.eyes === eyes ? 'is-active' : ''}
                      aria-pressed={design.eyes === eyes} onClick={() => update({ eyes })}>
                      {eyes === 'square' ? tx('Kotak', 'Square') : tx('Membulat', 'Rounded')}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="qr-studio-section">
              <h4>04 <span>{tx('Logo dan frame', 'Logo and frame')}</span></h4>
              <div className="qr-studio-logo-controls">
                <label className="qr-studio-logo-upload"><ImagePlus size={18} aria-hidden="true" /> {design.logoDataUrl ? tx('Ganti logo', 'Replace logo') : tx('Tambah logo', 'Add logo')}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoChange} aria-label={tx('Upload logo QR', 'Upload QR logo')}/>
                </label>
                {design.logoDataUrl && <button type="button" className="qr-studio-remove" onClick={() => update({ logoDataUrl: null })}><Trash2 size={16} aria-hidden="true"/>{tx('Hapus', 'Remove')}</button>}
              </div>
              <p className="qr-studio-help">{tx('PNG, JPG atau WebP. Maksimal 512 KB. Logo hanya dipakai di browser dan tidak diunggah.', 'PNG, JPG or WebP. Up to 512 KB. Logo stays in your browser and is never uploaded.')}</p>
              <div className="qr-studio-field">
                <span>{tx('Frame teks', 'Text frame')}</span>
                <div className="qr-studio-options" role="group" aria-label={tx('Frame QR', 'QR frame')}>
                  <button type="button" className={design.frame === 'none' ? 'is-active' : ''} aria-pressed={design.frame === 'none'} onClick={() => update({ frame: 'none' })}>{tx('Tanpa frame', 'No frame')}</button>
                  <button type="button" className={design.frame === 'label' ? 'is-active' : ''} aria-pressed={design.frame === 'label'} onClick={() => update({ frame: 'label' })}>{tx('Dengan teks', 'With label')}</button>
                </div>
                {design.frame === 'label' && <input type="text" className="qr-studio-label-input" maxLength={24} value={design.label} onChange={(e) => update({ label: e.target.value })} aria-label={tx('Teks di bawah QR', 'Text below QR')} />}
              </div>
            </section>
          </div>

          <aside className="qr-studio-preview" aria-label={tx('Pratinjau QR', 'QR preview')}>
            <div className="qr-studio-preview-head"><span>{tx('PRATINJAU LANGSUNG', 'LIVE PREVIEW')}</span><span>{tx('SIAP CETAK', 'PRINT READY')}</span></div>
            <div className="qr-studio-artboard">
              {svg && <img src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)} alt={tx('Kode QR untuk ' + target.title, 'QR code for ' + target.title)} />}
              {!svg && <div className="qr-studio-preview-placeholder"><LoaderCircle size={28} aria-hidden="true" /></div>}
            </div>
            <div role="status" aria-live="polite" className={'qr-studio-status is-' + status}>
              {status === 'checking' ? <><LoaderCircle size={16} className="qr-studio-spinner" aria-hidden="true" /> {tx('Memeriksa hasil QR…', 'Validating QR…')}</>
                : status === 'ready' ? <><CheckCircle2 size={17} aria-hidden="true"/>{tx('QR berhasil dibaca ulang', 'QR decoded successfully')}</>
                  : <><ShieldAlert size={17} aria-hidden="true"/>{problem}</>}
            </div>
            <p className="qr-studio-contrast">{tx('Rasio kontras', 'Contrast ratio')}: {qrContrast(design.foreground, design.background).toFixed(1)}:1 · {tx('Area kosong 4 modul', '4-module quiet zone')}</p>
            <div className="qr-studio-export">
              <label>{tx('Resolusi ekspor', 'Export resolution')}
                <select value={size} onChange={(e) => setSize(Number(e.target.value) as 512 | 1024 | 2048)}>
                  <option value={512}>512 px</option>
                  <option value={1024}>1024 px</option>
                  <option value={2048}>2048 px</option>
                </select>
              </label>
              <div className="qr-studio-downloads">
                <button type="button" disabled={status !== 'ready' || exporting} className="qr-studio-download-primary" onClick={() => void exportQr('png')}>
                  <Download size={17} aria-hidden="true"/>{exporting ? tx('Memproses…', 'Exporting…') : 'Download PNG'}
                </button>
                <button type="button" disabled={status !== 'ready' || exporting} className="qr-studio-download-secondary" onClick={() => void exportQr('svg')}>SVG</button>
              </div>
            </div>
            <button type="button" className="qr-studio-reset" onClick={() => setDesign({ ...DEFAULT_QR_DESIGN })}><RotateCcw size={15} aria-hidden="true"/>{tx('Atur ulang ke desain aman', 'Reset to safe design')}</button>
            <p className="qr-studio-note">{tx('QR ini berisi URL saat ini. Untuk mengubah tujuan tanpa mencetak ulang, gunakan shortlink yang sama.', 'This QR contains the current URL. To change its destination after printing, keep the same shortlink.')}</p>
          </aside>
        </div>
      </div>
    </Sheet>
  );
};
