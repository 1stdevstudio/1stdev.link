import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '../Sheet';
import { BioBlockType, LinkItem } from '../../types';

export interface BlockPatch {
  title?: string;
  destination_url?: string;
  block_type?: BioBlockType;
}

interface EditBlockSheetProps {
  link: LinkItem | null;
  onClose: () => void;
  onSave: (id: string, patch: BlockPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const https = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

/** wa.me/628123?text=Halo -> { num: '08123', msg: 'Halo' } */
const parseWa = (url: string) => {
  const m = url.match(/wa\.me\/(\d+)(?:\?text=([^&]*))?/);
  if (!m) return { num: '', msg: '' };
  const num = m[1].startsWith('62') ? `0${m[1].slice(2)}` : m[1];
  let msg = '';
  try { msg = m[2] ? decodeURIComponent(m[2]) : ''; } catch { msg = m[2] || ''; }
  return { num, msg };
};

const buildWa = (num: string, msg: string) => {
  let n = num.replace(/[^0-9]/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = `62${n.slice(1)}`;
  return `https://wa.me/${n}${msg.trim() ? `?text=${encodeURIComponent(msg.trim())}` : ''}`;
};

const STYLE_OPTIONS: { id: BioBlockType; label: string }[] = [
  { id: 'link', label: 'Biasa' },
  { id: 'featured', label: 'Sorotan' },
  { id: 'video', label: 'Video' },
];

const KIND_NAME: Partial<Record<BioBlockType, string>> = {
  header: 'judul bagian', text: 'teks', divider: 'garis pemisah', whatsapp: 'WhatsApp',
  featured: 'sorotan', video: 'video', link: 'link',
};

export const EditBlockSheet: React.FC<EditBlockSheetProps> = ({ link, onClose, onSave, onDelete }) => {
  const type: BioBlockType = link?.block_type || 'link';
  const isContent = type === 'header' || type === 'text' || type === 'divider';
  const isWa = type === 'whatsapp' || /^https:\/\/wa\.me\//.test(link?.destination_url || '');

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [num, setNum] = useState('');
  const [msg, setMsg] = useState('');
  const [style, setStyle] = useState<BioBlockType>('link');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Isi ulang form setiap kali blok lain dibuka.
  useEffect(() => {
    if (!link) return;
    setTitle(link.title || '');
    setUrl(link.destination_url === '#' ? '' : link.destination_url || '');
    const wa = parseWa(link.destination_url || '');
    setNum(wa.num);
    setMsg(wa.msg);
    setStyle(type);
    setError('');
    setConfirmDelete(false);
  }, [link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildPatch = (): BlockPatch | null => {
    if (type === 'divider') return null;
    const t = title.trim();
    if (!t) return null;
    if (isContent) return { title: t.slice(0, 280) };
    if (isWa) {
      const wa = buildWa(num, msg);
      return wa ? { title: t, destination_url: wa } : null;
    }
    if (!url.trim()) return null;
    return { title: t, destination_url: https(url), ...(style !== type ? { block_type: style } : {}) };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    const patch = buildPatch();
    if (!patch) {
      setError('Isian belum lengkap atau formatnya belum benar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave(link.id, patch);
      onClose();
    } catch (err: any) {
      setError(err?.message ? `Gagal menyimpan: ${err.message}` : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!link) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    try {
      await onDelete(link.id);
      onClose();
    } catch (err: any) {
      setError(err?.message ? `Gagal menghapus: ${err.message}` : 'Gagal menghapus. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={Boolean(link)} onClose={onClose} title={`Ubah ${isWa ? 'WhatsApp' : KIND_NAME[type] || 'blok'}`}>
      {error && (
        <p role="alert" className="mb-3 rounded-[var(--r2)] bg-[rgba(248,113,113,0.12)] px-3 py-2.5 text-[13px] leading-snug text-rose-300">
          {error}
        </p>
      )}
      <form onSubmit={save} className="flex flex-col gap-3">
        {type === 'divider' ? (
          <p className="small muted">Garis pemisah tidak punya isian. Geser posisinya dari daftar, atau hapus di bawah.</p>
        ) : (
          <div className="field">
            <label htmlFor="edit-title">
              {type === 'header' ? 'Nama bagian' : type === 'text' ? 'Isi teks' : 'Judul tombol'}
            </label>
            {type === 'text' ? (
              <textarea id="edit-title" rows={3} maxLength={280} required value={title} onChange={(e) => setTitle(e.target.value)} />
            ) : (
              <input id="edit-title" type="text" maxLength={280} required value={title} onChange={(e) => setTitle(e.target.value)} />
            )}
          </div>
        )}

        {isWa && (
          <>
            <div className="field">
              <label htmlFor="edit-num">Nomor WhatsApp</label>
              <input id="edit-num" type="tel" required placeholder="mis. 08123456789" value={num} onChange={(e) => setNum(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="edit-msg">Pesan awal <span className="muted font-normal">(opsional)</span></label>
              <input id="edit-msg" type="text" value={msg} onChange={(e) => setMsg(e.target.value)} />
            </div>
          </>
        )}

        {!isContent && !isWa && (
          <>
            <div className="field">
              <label htmlFor="edit-url">Link tujuan</label>
              <input id="edit-url" type="url" required placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            {STYLE_OPTIONS.some((o) => o.id === type) && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-[var(--tx2)] font-medium">Gaya tombol</span>
                <div className="seg" role="group" aria-label="Gaya tombol">
                  {STYLE_OPTIONS.map((o) => (
                    <button key={o.id} type="button" aria-pressed={style === o.id} onClick={() => setStyle(o.id)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {type !== 'divider' && (
          <button type="submit" disabled={loading} className="btn btn-p btn-w mt-2 disabled:opacity-50">
            {loading ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={remove}
          className={`btn btn-w ${confirmDelete ? 'bg-[rgba(248,113,113,0.16)] text-rose-300' : 'btn-g text-rose-300'} disabled:opacity-50`}
        >
          <Trash2 size={18} strokeWidth={1.75} />
          <span>{confirmDelete ? 'Tekan lagi untuk hapus' : 'Hapus blok'}</span>
        </button>
      </form>
    </Sheet>
  );
};
