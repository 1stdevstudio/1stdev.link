import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import {
  Link2, Star, MessageCircle, Type, ArrowLeft, AlignLeft, Minus, PlayCircle,
  Camera, Tv, Send, Music2, ShoppingBag, MapPin, AtSign,
} from 'lucide-react';
import { BioBlockType } from '../../types';

interface AddBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLinkType: (type: 'link' | 'featured') => void;
  onCreateBlock: (payload: { title: string; destination_url: string; block_type: BioBlockType }) => Promise<void>;
}

interface Field { key: string; label: string; placeholder: string; type?: string; optional?: boolean; multiline?: boolean }

interface BlockDef {
  id: string;
  group: 'basic' | 'content' | 'social';
  name: string;
  desc: string;
  icon: React.ReactNode;
  fields?: Field[];
  /** builds payload from form values; return null when input invalid */
  build?: (v: Record<string, string>) => { title: string; destination_url: string; block_type: BioBlockType } | null;
  delegate?: 'link' | 'featured';
}

const ic = (C: React.ElementType, cls = 'text-[var(--tx2)]') => <C size={20} strokeWidth={1.75} className={cls} />;
const handle = (s: string) => s.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '');
const https = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

const profile = (
  id: string, name: string, icon: React.ReactNode, base: string, ph: string
): BlockDef => ({
  id, group: 'social', name, desc: `Tombol ke profil ${name} kamu`, icon,
  fields: [{ key: 'u', label: `Username ${name}`, placeholder: ph }],
  build: (v) => (handle(v.u) ? { title: name, destination_url: `${base}${handle(v.u)}`, block_type: 'link' } : null),
});

const BLOCKS: BlockDef[] = [
  { id: 'link', group: 'basic', name: 'Link', desc: 'Tombol ke website, toko, atau media sosial', icon: ic(Link2), delegate: 'link' },
  { id: 'featured', group: 'basic', name: 'Sorotan', desc: 'Tombol besar berwarna untuk hal terpenting', icon: ic(Star, 'text-[var(--ac)]'), delegate: 'featured' },
  {
    id: 'whatsapp', group: 'basic', name: 'WhatsApp', desc: 'Pengunjung langsung chat ke nomor kamu', icon: ic(MessageCircle, 'text-[var(--ok)]'),
    fields: [
      { key: 'num', label: 'Nomor WhatsApp', placeholder: 'mis. 08123456789', type: 'tel' },
      { key: 'msg', label: 'Pesan awal', placeholder: 'Halo, saya mau tanya…', optional: true },
    ],
    build: (v) => {
      let n = v.num.replace(/[^0-9]/g, '');
      if (!n) return null;
      if (n.startsWith('0')) n = `62${n.slice(1)}`;
      const q = v.msg?.trim() ? `?text=${encodeURIComponent(v.msg.trim())}` : '';
      return { title: 'Chat WhatsApp', destination_url: `https://wa.me/${n}${q}`, block_type: 'whatsapp' };
    },
  },
  {
    id: 'header', group: 'content', name: 'Judul bagian', desc: 'Teks pemisah untuk mengelompokkan isi', icon: ic(Type),
    fields: [{ key: 't', label: 'Nama bagian', placeholder: 'mis. Katalog, Kontak' }],
    build: (v) => (v.t.trim() ? { title: v.t.trim(), destination_url: '#', block_type: 'header' } : null),
  },
  {
    id: 'text', group: 'content', name: 'Teks', desc: 'Paragraf pendek: pengumuman, jam buka, cerita', icon: ic(AlignLeft),
    fields: [{ key: 't', label: 'Isi teks', placeholder: 'mis. Buka setiap hari 09.00–21.00', multiline: true }],
    build: (v) => (v.t.trim() ? { title: v.t.trim().slice(0, 280), destination_url: '#', block_type: 'text' } : null),
  },
  {
    id: 'divider', group: 'content', name: 'Garis pemisah', desc: 'Jeda tipis di antara blok', icon: ic(Minus),
    build: () => ({ title: 'Garis', destination_url: '#', block_type: 'divider' }),
  },
  {
    id: 'video', group: 'content', name: 'Video', desc: 'Tombol ke video YouTube, TikTok, atau Reels', icon: ic(PlayCircle),
    fields: [
      { key: 'url', label: 'Link video', placeholder: 'https://youtu.be/…', type: 'url' },
      { key: 't', label: 'Judul', placeholder: 'mis. Tonton video terbaru', optional: true },
    ],
    build: (v) => (v.url.trim() ? { title: v.t?.trim() || 'Tonton video', destination_url: https(v.url), block_type: 'video' } : null),
  },
  {
    id: 'shop', group: 'content', name: 'Toko online', desc: 'Shopee, Tokopedia, atau toko kamu sendiri', icon: ic(ShoppingBag),
    fields: [
      { key: 'url', label: 'Link toko', placeholder: 'https://shopee.co.id/…', type: 'url' },
      { key: 't', label: 'Judul', placeholder: 'mis. Belanja di toko kami', optional: true },
    ],
    build: (v) => (v.url.trim() ? { title: v.t?.trim() || 'Belanja sekarang', destination_url: https(v.url), block_type: 'featured' } : null),
  },
  {
    id: 'maps', group: 'content', name: 'Lokasi', desc: 'Petunjuk arah ke toko atau acara', icon: ic(MapPin),
    fields: [{ key: 'q', label: 'Alamat atau nama tempat', placeholder: 'mis. Jl. Malioboro, Yogyakarta' }],
    build: (v) => (v.q.trim()
      ? { title: 'Lihat lokasi', destination_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.q.trim())}`, block_type: 'link' }
      : null),
  },
  profile('ig', 'Instagram', ic(Camera), 'https://instagram.com/', '@namakamu'),
  profile('tt', 'TikTok', ic(Music2), 'https://www.tiktok.com/@', '@namakamu'),
  profile('yt', 'YouTube', ic(Tv), 'https://www.youtube.com/@', '@channelkamu'),
  profile('tg', 'Telegram', ic(Send), 'https://t.me/', '@namakamu'),
  profile('x', 'X', ic(AtSign), 'https://x.com/', '@namakamu'),
];

const GROUPS: { id: BlockDef['group']; label: string }[] = [
  { id: 'basic', label: 'Utama' },
  { id: 'content', label: 'Isi & tata letak' },
  { id: 'social', label: 'Media sosial' },
];

export const AddBlockSheet: React.FC<AddBlockSheetProps> = ({ isOpen, onClose, onSelectLinkType, onCreateBlock }) => {
  const [active, setActive] = useState<BlockDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setActive(null);
    setValues({});
    onClose();
  };

  const create = async (def: BlockDef, v: Record<string, string>) => {
    const payload = def.build?.(v);
    if (!payload) return;
    setLoading(true);
    try {
      await onCreateBlock(payload);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const pick = (def: BlockDef) => {
    if (def.delegate) {
      handleClose();
      onSelectLinkType(def.delegate);
    } else if (!def.fields) {
      create(def, {});
    } else {
      setValues({});
      setActive(def);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title={active ? `Tambah ${active.name}` : 'Tambah isi'}>
      {!active && (
        <div className="flex flex-col gap-4">
          {GROUPS.map((g) => (
            <section key={g.id} className="flex flex-col gap-1">
              <h3 className="sec-label">{g.label}</h3>
              <div className="grid gap-1 sm:grid-cols-2">
                {BLOCKS.filter((b) => b.group === g.id).map((b) => (
                  <button key={b.id} type="button" className="menu-item" disabled={loading} onClick={() => pick(b)}>
                    <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0">{b.icon}</span>
                    <span className="grow text-left min-w-0">
                      <span className="block text-[15px] font-semibold text-[var(--tx)]">{b.name}</span>
                      <span className="small muted block truncate">{b.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {active && (
        <form onSubmit={(e) => { e.preventDefault(); create(active, values); }} className="flex flex-col gap-3">
          <button type="button" className="btn btn-t btn-sm self-start -ml-2" onClick={() => setActive(null)}>
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Kembali</span>
          </button>
          {active.fields!.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`blk-${f.key}`}>
                {f.label} {f.optional && <span className="muted font-normal">(opsional)</span>}
              </label>
              {f.multiline ? (
                <textarea
                  id={`blk-${f.key}`} rows={3} maxLength={280} required={!f.optional} placeholder={f.placeholder}
                  value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  id={`blk-${f.key}`} type={f.type || 'text'} required={!f.optional} placeholder={f.placeholder}
                  value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn btn-p btn-w mt-2 disabled:opacity-50">
            {loading ? 'Menambahkan…' : 'Simpan'}
          </button>
        </form>
      )}
    </Sheet>
  );
};
