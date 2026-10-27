import React, { useMemo, useState } from 'react';
import { Sheet } from '../Sheet';
import {
  Link2, Star, MessageCircle, Type, ArrowLeft, AlignLeft, Minus, PlayCircle,
  Camera, Tv, Send, Music2, ShoppingBag, MapPin, AtSign,
} from 'lucide-react';
import { BioBlockType } from '../../types';
import { TEMPLATES, TEMPLATE_CATS, BlockTemplate, TemplateCat, localizedTemplates } from './blockTemplates';
import { useI18n } from '../../i18n/context';

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

type Tx = (idText: string, enText: string) => string;

/** Katalog blok & template sesuai bahasa aktif. */
const buildCatalog = (tx: Tx, lang: 'id' | 'en') => {
  const profile = (
    id: string, name: string, icon: React.ReactNode, base: string, ph: string
  ): BlockDef => ({
    id, group: 'social', name, desc: tx(`Tombol ke profil ${name} kamu`, `Button to your ${name} profile`), icon,
    fields: [{ key: 'u', label: tx(`Username ${name}`, `${name} username`), placeholder: ph }],
    build: (v) => (handle(v.u) ? { title: name, destination_url: `${base}${handle(v.u)}`, block_type: 'link' } : null),
  });

    const BLOCKS: BlockDef[] = [
    { id: 'link', group: 'basic', name: 'Link', desc: tx('Tombol ke website, toko, atau media sosial', 'Button to a website, shop, or social profile'), icon: ic(Link2), delegate: 'link' },
    { id: 'featured', group: 'basic', name: tx('Sorotan', 'Featured'), desc: tx('Tombol besar berwarna untuk hal terpenting', 'Large colored button for what matters most'), icon: ic(Star, 'text-[var(--ac)]'), delegate: 'featured' },
    {
      id: 'whatsapp', group: 'basic', name: 'WhatsApp', desc: tx('Pengunjung langsung chat ke nomor kamu', 'Visitors chat straight to your number'), icon: ic(MessageCircle, 'text-[var(--ok)]'),
      fields: [
        { key: 'num', label: tx('Nomor WhatsApp', 'WhatsApp number'), placeholder: tx('mis. 08123456789', 'e.g. 08123456789'), type: 'tel' },
        { key: 'msg', label: tx('Pesan awal', 'Opening message'), placeholder: tx('Halo, saya mau tanya…', 'Hi, I have a question…'), optional: true },
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
      id: 'header', group: 'content', name: tx('Judul bagian', 'Section heading'), desc: tx('Teks pemisah untuk mengelompokkan isi', 'Heading to group your content'), icon: ic(Type),
      fields: [{ key: 't', label: tx('Nama bagian', 'Section name'), placeholder: tx('mis. Katalog, Kontak', 'e.g. Catalog, Contact') }],
      build: (v) => (v.t.trim() ? { title: v.t.trim(), destination_url: '#', block_type: 'header' } : null),
    },
    {
      id: 'text', group: 'content', name: tx('Teks', 'Text'), desc: tx('Paragraf pendek: pengumuman, jam buka, cerita', 'Short paragraph: announcement, hours, story'), icon: ic(AlignLeft),
      fields: [{ key: 't', label: tx('Isi teks', 'Text'), placeholder: tx('mis. Buka setiap hari 09.00–21.00', 'e.g. Open daily 9 AM–9 PM'), multiline: true }],
      build: (v) => (v.t.trim() ? { title: v.t.trim().slice(0, 280), destination_url: '#', block_type: 'text' } : null),
    },
    {
      id: 'divider', group: 'content', name: tx('Garis pemisah', 'Divider'), desc: tx('Jeda tipis di antara blok', 'A thin break between blocks'), icon: ic(Minus),
      build: () => ({ title: 'Garis', destination_url: '#', block_type: 'divider' }),
    },
    {
      id: 'video', group: 'content', name: 'Video', desc: tx('Tombol ke video YouTube, TikTok, atau Reels', 'Button to a YouTube, TikTok, or Reels video'), icon: ic(PlayCircle),
      fields: [
        { key: 'url', label: tx('Link video', 'Video link'), placeholder: 'https://youtu.be/…', type: 'url' },
        { key: 't', label: tx('Judul', 'Title'), placeholder: tx('mis. Tonton video terbaru', 'e.g. Watch my latest video'), optional: true },
      ],
      build: (v) => (v.url.trim() ? { title: v.t?.trim() || tx('Tonton video', 'Watch video'), destination_url: https(v.url), block_type: 'video' } : null),
    },
    {
      id: 'shop', group: 'content', name: tx('Toko online', 'Online shop'), desc: tx('Shopee, Tokopedia, atau toko kamu sendiri', 'Shopee, Tokopedia, or your own store'), icon: ic(ShoppingBag),
      fields: [
        { key: 'url', label: tx('Link toko', 'Shop link'), placeholder: 'https://shopee.co.id/…', type: 'url' },
        { key: 't', label: tx('Judul', 'Title'), placeholder: tx('mis. Belanja di toko kami', 'e.g. Shop with us'), optional: true },
      ],
      build: (v) => (v.url.trim() ? { title: v.t?.trim() || tx('Belanja sekarang', 'Shop now'), destination_url: https(v.url), block_type: 'featured' } : null),
    },
    {
      id: 'maps', group: 'content', name: tx('Lokasi', 'Location'), desc: tx('Petunjuk arah ke toko atau acara', 'Directions to your store or event'), icon: ic(MapPin),
      fields: [{ key: 'q', label: tx('Alamat atau nama tempat', 'Address or place name'), placeholder: tx('mis. Jl. Malioboro, Yogyakarta', 'e.g. Jl. Malioboro, Yogyakarta') }],
      build: (v) => (v.q.trim()
        ? { title: tx('Lihat lokasi', 'View location'), destination_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.q.trim())}`, block_type: 'link' }
        : null),
    },
    profile('ig', 'Instagram', ic(Camera), 'https://instagram.com/', tx('@namakamu', '@yourname')),
    profile('tt', 'TikTok', ic(Music2), 'https://www.tiktok.com/@', tx('@namakamu', '@yourname')),
    profile('yt', 'YouTube', ic(Tv), 'https://www.youtube.com/@', tx('@channelkamu', '@yourchannel')),
    profile('tg', 'Telegram', ic(Send), 'https://t.me/', tx('@namakamu', '@yourname')),
    profile('x', 'X', ic(AtSign), 'https://x.com/', tx('@namakamu', '@yourname')),
  ];

  const waUrl = (num: string, msg?: string) => {
    let n = num.replace(/[^0-9]/g, '');
    if (!n) return null;
    if (n.startsWith('0')) n = `62${n.slice(1)}`;
    return `https://wa.me/${n}${msg?.trim() ? `?text=${encodeURIComponent(msg.trim())}` : ''}`;
  };

  /** Ubah template data menjadi BlockDef + nilai awal form. */
  const fromTemplate = (t: BlockTemplate): { def: BlockDef; defaults: Record<string, string> } => {
    const title: Field = { key: 't', label: tx('Judul tombol', 'Button title'), placeholder: t.title };
    if (t.kind === 'wa') {
      return {
        defaults: { t: t.title, msg: t.msg || '' },
        def: {
          id: t.id, group: 'basic', name: t.name, desc: 'WhatsApp', icon: ic(MessageCircle, 'text-[var(--ok)]'),
          fields: [title, { key: 'num', label: tx('Nomor WhatsApp', 'WhatsApp number'), placeholder: tx('mis. 08123456789', 'e.g. 08123456789'), type: 'tel' }, { key: 'msg', label: tx('Pesan awal', 'Opening message'), placeholder: t.msg || '', optional: true }],
          build: (v) => {
            const url = waUrl(v.num, v.msg);
            return url && v.t.trim() ? { title: v.t.trim(), destination_url: url, block_type: 'whatsapp' } : null;
          },
        },
      };
    }
    if (t.kind === 'url') {
      const type = t.type || 'link';
      const icon = type === 'featured' ? ic(Star, 'text-[var(--ac)]') : type === 'video' ? ic(PlayCircle) : ic(Link2);
      return {
        defaults: { t: t.title, url: '' },
        def: {
          id: t.id, group: 'basic', name: t.name, desc: type === 'featured' ? 'Sorotan' : type === 'video' ? 'Video' : 'Link', icon,
          fields: [title, { key: 'url', label: tx('Link tujuan', 'Destination link'), placeholder: t.hint || 'https://…', type: 'url' }],
          build: (v) => (v.url.trim() && v.t.trim() ? { title: v.t.trim(), destination_url: https(v.url), block_type: type } : null),
        },
      };
    }
    const isText = t.kind === 'text';
    return {
      defaults: { t: t.title },
      def: {
        id: t.id, group: 'content', name: t.name, desc: isText ? tx('Teks', 'Text') : tx('Judul bagian', 'Section heading'), icon: isText ? ic(AlignLeft) : ic(Type),
        fields: [{ key: 't', label: isText ? tx('Isi teks', 'Text') : tx('Nama bagian', 'Section name'), placeholder: t.title, multiline: isText }],
        build: (v) => (v.t.trim() ? { title: v.t.trim().slice(0, 280), destination_url: '#', block_type: t.kind as BioBlockType } : null),
      },
    };
  };

  const TEMPLATE_DEFS = localizedTemplates(lang).map((t) => ({ cat: t.cat, ...fromTemplate(t) }));

  const GROUPS: { id: BlockDef['group']; label: string }[] = [
    { id: 'basic', label: tx('Utama', 'Essentials') },
    { id: 'content', label: tx('Isi & tata letak', 'Content & layout') },
    { id: 'social', label: tx('Media sosial', 'Social media') },
  ];
  return { BLOCKS, TEMPLATE_DEFS, GROUPS };
};

export const AddBlockSheet: React.FC<AddBlockSheetProps> = ({ isOpen, onClose, onSelectLinkType, onCreateBlock }) => {
  const { tx, lang } = useI18n();
  const { BLOCKS, TEMPLATE_DEFS, GROUPS } = useMemo(() => buildCatalog(tx, lang), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const [active, setActive] = useState<BlockDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'blocks' | 'templates'>('blocks');
  const [cat, setCat] = useState<TemplateCat | 'all'>('all');
  const shownTemplates = TEMPLATE_DEFS.filter((t) => cat === 'all' || t.cat === cat);

  const handleClose = () => {
    setActive(null);
    setValues({});
    setMode('blocks');
    setError('');
    onClose();
  };

  const create = async (def: BlockDef, v: Record<string, string>) => {
    const payload = def.build?.(v);
    if (!payload) {
      setError(tx('Isian belum lengkap atau formatnya belum benar.', 'Some fields are missing or invalid.'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onCreateBlock(payload);
      handleClose();
    } catch (err: any) {
      // Jangan gagal diam-diam: blok tidak tersimpan di server.
      setError(err?.message ? `${tx('Gagal menyimpan', 'Could not save')}: ${err.message}` : tx('Gagal menyimpan. Periksa koneksi lalu coba lagi.', 'Could not save. Check your connection and try again.'));
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
      setError(''); setActive(def);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title={active ? `${tx('Tambah', 'Add')} ${active.name}` : tx('Tambah isi', 'Add content')}>
      {error && (
        <p role="alert" className="mb-3 rounded-[var(--r2)] bg-[rgba(248,113,113,0.12)] px-3 py-2.5 text-[13px] leading-snug text-rose-300">
          {error}
        </p>
      )}
      {!active && (
        <div className="seg mb-4" role="group" aria-label={tx('Jenis isi', 'Content type')}>
          <button type="button" aria-pressed={mode === 'blocks'} onClick={() => setMode('blocks')}>{tx('Blok', 'Blocks')}</button>
          <button type="button" aria-pressed={mode === 'templates'} onClick={() => setMode('templates')}>Template ({TEMPLATES.length})</button>
        </div>
      )}

      {!active && mode === 'templates' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {[{ id: 'all' as const, label: tx('Semua', 'All') }, ...TEMPLATE_CATS.map((c) => ({ ...c, label: lang === 'en' ? c.label[1] : c.label[0] }))].map((c) => (
              <button
                key={c.id} type="button" className={`chip ${cat === c.id ? 'on' : ''}`} aria-pressed={cat === c.id}
                onClick={() => setCat(c.id)}
              >
                {c.label} <span>{c.id === 'all' ? TEMPLATES.length : TEMPLATES.filter((t) => t.cat === c.id).length}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {shownTemplates.map(({ def, defaults }) => (
              <button
                key={def.id} type="button" className="menu-item" disabled={loading}
                onClick={() => { setValues(defaults); setError(''); setActive(def); }}
              >
                <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0">{def.icon}</span>
                <span className="grow text-left min-w-0">
                  <span className="block text-[15px] font-semibold text-[var(--tx)] truncate">{def.name}</span>
                  <span className="small muted block truncate">{def.desc} · {defaults.t}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="small muted">{tx('Semua template bisa diubah sebelum disimpan. 100% gratis, tanpa batas.', 'Every template can be edited before saving. 100% free, no limits.')}</p>
        </div>
      )}

      {!active && mode === 'blocks' && (
        <div className="flex flex-col gap-4">
          {GROUPS.map((g) => (
            <section key={g.id} className="flex flex-col gap-1">
              <h3 className="sec-label">{g.label}</h3>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
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
          <button type="button" className="btn btn-t btn-sm self-start -ml-2" onClick={() => { setError(''); setActive(null); }}>
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>{tx('Kembali', 'Back')}</span>
          </button>
          {active.fields!.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`blk-${f.key}`}>
                {f.label} {f.optional && <span className="muted font-normal">({tx('opsional', 'optional')})</span>}
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
            {loading ? tx('Menambahkan…', 'Adding…') : tx('Simpan', 'Save')}
          </button>
        </form>
      )}
    </Sheet>
  );
};
