import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  Search,
  ExternalLink,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Sheet } from '../Sheet';
import { Select } from '../Select';
import { api } from '../../api';
import { prepareCatalogImage } from '../../avatarImage';
import type { LinkItem } from '../../types';
import {
  BLOCK_LABELS,
  CATALOG_LABELS,
  defaultBusinessData,
  validateBusinessData,
  type BusinessBlockType,
  type BusinessData,
  type CatalogItem,
  type CatalogData,
  type Industry,
} from '../../../../shared/business';

interface Props {
  kind: BusinessBlockType;
  link?: LinkItem;
  industry: Industry;
  onClose: () => void;
  onSave: (title: string, data: BusinessData, id?: string) => Promise<void>;
}

export function BusinessBlockSheet({
  kind,
  link,
  industry,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState(
    link?.title || (kind === 'catalog' ? CATALOG_LABELS[industry] : BLOCK_LABELS[kind])
  );
  const [data, setData] = useState<BusinessData>(() => {
    try {
      return validateBusinessData(kind, link?.data_json);
    } catch {
      return defaultBusinessData(kind, industry);
    }
  });

  const [categoryInput, setCategoryInput] = useState(
    data.kind === 'catalog' ? data.categories.join(', ') : ''
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Satu item aktif untuk editor katalog tunggal (R09 / Tahap 2)
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!activeItemId) return;
    const frame = requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[aria-label="Nama item (wajib)"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [activeItemId]);

  const update = (patch: Record<string, unknown>) =>
    setData((prev) => ({ ...prev, ...patch } as BusinessData));

  const field = (
    label: string,
    value: string | number,
    change: (value: string) => void,
    type = 'text',
    placeholder = ''
  ) => (
    <label className="business-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );

  const itemUpdate = (id: string, patch: Partial<CatalogItem>) =>
    setData((prev) =>
      prev.kind === 'catalog'
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          }
        : prev
    );

  // Normalisasi nomor WhatsApp (+62 / 08 digits)
  const normalizeWhatsapp = (raw: string): string => {
    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return digits;
  };

  // Upload foto katalog dengan menjaga rasio aspek asli (R09)
  const uploadCatalogPhoto = async (file: File, id: string) => {
    setUploading(id);
    setError('');
    try {
      const processedBlob = await prepareCatalogImage(file);
      const url = await api.uploadMedia(processedBlob, 'cover');
      itemUpdate(id, { image_url: url });
    } catch (err) {
      setError(
        (err as Error).message ||
          'Gagal mengunggah foto. Pastikan akun sudah tersimpan sebelum upload.'
      );
    } finally {
      setUploading(null);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !!uploading) return;
    setError('');

    if (!title.trim() || title.length > 100) {
      setError('Judul blok wajib diisi, maksimal 100 karakter');
      return;
    }

    if (data.kind === 'catalog') {
      // Validasi item: jika ada yang tidak valid, buka editor item terkait
      for (let idx = 0; idx < data.items.length; idx++) {
        const item = data.items[idx];
        if (!item.name.trim()) {
          setError(`Nama item ke-${idx + 1} wajib diisi`);
          setActiveItemId(item.id);
          return;
        }
        if (item.action_url && !/^https?:\/\//i.test(item.action_url)) {
          setError(
            `Tautan produk "${item.name}" harus berupa URL HTTP/HTTPS yang valid`
          );
          setActiveItemId(item.id);
          return;
        }
      }
    }

    setBusy(true);
    const formEl = event.currentTarget as HTMLFormElement;
    const fields = new FormData(formEl);

    const payload: BusinessData =
      data.kind === 'business_info'
        ? {
            ...data,
            hours: data.hours.map((h) => ({
              ...h,
              open: String(fields.get(`hours-open-${h.day}`) ?? h.open),
              close: String(fields.get(`hours-close-${h.day}`) ?? h.close),
            })),
          }
        : data;

    try {
      const validated = validateBusinessData(kind, payload);
      await onSave(title.trim(), validated, link?.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Helper tampilan item katalog aktif
  const catalogData = data.kind === 'catalog' ? (data as CatalogData) : null;
  const activeItem = catalogData?.items.find((i) => i.id === activeItemId);

  // Filter daftar item katalog
  const filteredItems = catalogData
    ? catalogData.items.filter((item) => {
        const matchSearch =
          !searchQuery.trim() ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCategory =
          !filterCategory || item.category === filterCategory;
        return matchSearch && matchCategory;
      })
    : [];

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title={`${link ? 'Ubah' : 'Tambah'} ${BLOCK_LABELS[kind].toLowerCase()}`}
    >
      <form ref={formRef} onSubmit={save} className="business-form">
        {field('Judul blok', title, setTitle)}

        {/* ---------------- KATALOG & REKOMENDASI ---------------- */}
        {catalogData && (
          <>
            {activeItem ? (
              /* Editor SATU item yang sedang dibuka */
              <div className="flex flex-col gap-4 p-4 rounded-[var(--r2)] bg-[var(--s1)] animate-fadeIn">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <button
                    type="button"
                    className="btn btn-g btn-sm gap-1.5"
                    onClick={() => setActiveItemId(null)}
                  >
                    <ArrowLeft size={16} strokeWidth={1.75} />
                    <span>Daftar item</span>
                  </button>
                  <span className="text-[13px] font-semibold text-[var(--tx)] truncate max-w-[200px]">
                    {activeItem.name || 'Item baru'}
                  </span>
                </div>

                {field(
                  'Nama item (wajib)',
                  activeItem.name,
                  (name) => itemUpdate(activeItem.id, { name }),
                  'text',
                  'Contoh: Kopi Susu Aren / Paket Konsultasi'
                )}

                <label className="business-field">
                  <span>Deskripsi item (maks 240 karakter)</span>
                  <textarea
                    aria-label="Deskripsi item"
                    maxLength={240}
                    value={activeItem.description}
                    placeholder="Jelaskan spesifikasi, rasa, atau bahan produk..."
                    onChange={(e) =>
                      itemUpdate(activeItem.id, { description: e.target.value })
                    }
                  />
                </label>

                <div className="business-columns">
                  <label className="business-field">
                    <span>Kategori item</span>
                    <Select
                      aria-label="Kategori item"
                      value={activeItem.category}
                      onChange={(e) =>
                        itemUpdate(activeItem.id, { category: e.target.value })
                      }
                    >
                      <option value="">Tanpa kategori</option>
                      {catalogData.categories.map((c, n) => (
                        <option key={n} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="business-field">
                    <span>Jenis harga</span>
                    <Select
                      aria-label="Jenis harga"
                      value={activeItem.price_kind}
                      onChange={(e) =>
                        itemUpdate(activeItem.id, {
                          price_kind: e.target.value as CatalogItem['price_kind'],
                        })
                      }
                    >
                      <option value="fixed">Harga tetap</option>
                      <option value="from">Mulai dari</option>
                      <option value="ask">Tanya harga</option>
                    </Select>
                  </label>
                </div>

                {activeItem.price_kind !== 'ask' &&
                  field(
                    'Harga rupiah (utuh tanpa titik)',
                    activeItem.price ?? '',
                    (v) =>
                      itemUpdate(activeItem.id, {
                        price: v === '' ? null : Math.floor(Math.abs(Number(v))),
                      }),
                    'number',
                    'Contoh: 35000'
                  )}

                <div className="business-columns">
                  {field(
                    'Satuan (opsional)',
                    activeItem.unit,
                    (unit) => itemUpdate(activeItem.id, { unit }),
                    'text',
                    'Contoh: porsi, box, sesi, jam'
                  )}

                  {catalogData.presentation === 'services' &&
                    field(
                      'Durasi menit (opsional)',
                      activeItem.duration ?? '',
                      (v) =>
                        itemUpdate(activeItem.id, {
                          duration: v === '' ? null : Math.floor(Number(v)),
                        }),
                      'number',
                      'Contoh: 60'
                    )}
                </div>

                <label className="business-field">
                  <span>Ketersediaan item</span>
                  <Select
                    aria-label="Ketersediaan item"
                    value={activeItem.status}
                    onChange={(e) =>
                      itemUpdate(activeItem.id, {
                        status: e.target.value as CatalogItem['status'],
                      })
                    }
                  >
                    <option value="available">Tersedia</option>
                    <option value="unavailable">Tidak tersedia / Habis</option>
                    <option value="hidden">Sembunyikan dari halaman</option>
                  </Select>
                </label>

                {/* Foto Item Produk (R09: Mempertahankan Rasio Alami Asli) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-[var(--tx2)]">
                    Foto produk (menjaga rasio foto asli)
                  </span>
                  {activeItem.image_url ? (
                    <div className="flex items-center gap-3 p-2 rounded-[var(--r2)] bg-[var(--s2)]">
                      <img
                        className="w-16 h-16 object-contain rounded bg-black/20"
                        src={activeItem.image_url}
                        alt={activeItem.name || 'Foto item'}
                      />
                      <div className="min-w-0 grow">
                        <span className="text-[12px] text-[var(--tx2)] block truncate">
                          Foto terpasang
                        </span>
                        <label className="text-[12px] text-[var(--ac)] hover:underline cursor-pointer">
                          Ganti foto
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={!!uploading || busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadCatalogPhoto(f, activeItem.id);
                            }}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn btn-g btn-sm text-red-400"
                        onClick={() => itemUpdate(activeItem.id, { image_url: '' })}
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3.5 rounded-[var(--r2)] bg-[var(--s2)] hover:bg-[#1a382e] text-[var(--tx)] text-[13px] font-medium cursor-pointer transition-colors">
                      <Upload size={16} strokeWidth={1.75} className="text-[var(--ac)]" />
                      <span>
                        {uploading === activeItem.id
                          ? 'Mengunggah & memproses...'
                          : 'Upload foto produk'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={!!uploading || busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadCatalogPhoto(f, activeItem.id);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Tautan Tindakan / Link Produk & Label CTA Afiliasi */}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-[var(--tx)]">
                      Tautan & Tombol Aksi (Afiliasi / Marketplace)
                    </span>
                    <span className="text-[12px] text-[var(--tx3)]">
                      Pengunjung dapat langsung membuka tautan toko atau referral Anda.
                    </span>
                  </div>

                  {field(
                    'URL Tautan produk / afiliasi (opsional)',
                    activeItem.action_url || '',
                    (url) => itemUpdate(activeItem.id, { action_url: url }),
                    'url',
                    'https://shopee.co.id/... atau https://tokopedia.com/...'
                  )}

                  {field(
                    'Label tombol aksi (maks 40 karakter)',
                    activeItem.action_label || '',
                    (lbl) => itemUpdate(activeItem.id, { action_label: lbl }),
                    'text',
                    'Contoh: Beli di Shopee / Pesan Sekarang'
                  )}

                  {activeItem.status === 'unavailable' && (
                    <p className="text-[12px] text-[var(--warn)]">
                      Item dengan status tidak tersedia tidak menampilkan tombol tautan di halaman profil.
                    </p>
                  )}
                </div>

                {/* Aksi Selesai / Hapus Item */}
                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    className="btn btn-g btn-sm text-red-400 gap-1.5"
                    onClick={() => {
                      update({
                        items: catalogData.items.filter((i) => i.id !== activeItem.id),
                      });
                      setActiveItemId(null);
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                    <span>Hapus item</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-p btn-sm gap-1.5"
                    onClick={() => setActiveItemId(null)}
                  >
                    <Check size={15} strokeWidth={2} />
                    <span>Selesai edit item</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Tampilan DAFTAR KOMPAK Katalog (Search & Filter) */
              <>
                <details className="rounded-[var(--r2)] bg-[var(--s1)] p-3">
                  <summary className="cursor-pointer min-h-[44px] text-sm font-semibold flex items-center justify-between gap-3"><span>Pengaturan katalog</span><span className="text-xs font-normal muted">Susunan, kategori & kontak</span></summary>
                  <div className="flex flex-col gap-4 pt-3">
                <div className="business-columns">
                  <label className="business-field">
                    <span>Penyajian</span>
                    <Select
                      aria-label="Penyajian"
                      value={catalogData.presentation}
                      onChange={(e) =>
                        update({ presentation: e.target.value })
                      }
                    >
                      <option value="products">Produk / menu barang</option>
                      <option value="services">Layanan & jasa</option>
                    </Select>
                  </label>
                  <label className="business-field">
                    <span>Susunan tampilan</span>
                    <Select
                      aria-label="Susunan tampilan"
                      value={catalogData.layout}
                      onChange={(e) => update({ layout: e.target.value })}
                    >
                      <option value="list">Daftar memanjang</option>
                      <option value="grid">Grid kartu</option>
                    </Select>
                  </label>
                </div>

                {/* Kategori */}
                {field(
                  'Kategori (pisahkan dengan koma, maksimal 8)',
                  categoryInput,
                  (value) => {
                    setCategoryInput(value);
                    const cats = value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean);
                    update({
                      categories: cats,
                      items: catalogData.items.map((item) => ({
                        ...item,
                        category: cats.includes(item.category)
                          ? item.category
                          : cats.length === catalogData.categories.length
                          ? cats[catalogData.categories.indexOf(item.category)] || ''
                          : '',
                      })),
                    });
                  },
                  'text',
                  'Contoh: Makanan, Minuman, Paket'
                )}

                {/* Bidang Opsional: Nomor WhatsApp & Keterangan Afiliasi */}
                <div className="flex flex-col gap-3 p-3.5 rounded-[var(--r2)] bg-[var(--s1)]">
                  <label className="business-field">
                    <span>Nomor WhatsApp untuk pertanyaan produk (opsional)</span>
                    <input
                      type="tel"
                      aria-label="Nomor WhatsApp untuk pertanyaan produk"
                      value={catalogData.whatsapp || ''}
                      placeholder="Contoh: 08123456789 atau 628123456789"
                      onChange={(e) =>
                        update({ whatsapp: normalizeWhatsapp(e.target.value) })
                      }
                    />
                    <span className="text-[11px] text-[var(--tx3)]">
                      Pengunjung dapat langsung mengklik tombol tanya produk via chat WhatsApp.
                    </span>
                  </label>

                  <label className="business-field">
                    <span>Keterangan afiliasi / catatan katalog (opsional)</span>
                    <textarea
                      aria-label="Keterangan afiliasi (opsional)"
                      maxLength={280}
                      value={catalogData.disclosure || ''}
                      placeholder="Contoh: Beberapa tautan dalam katalog ini adalah tautan afiliasi. Kami dapat menerima komisi kecil tanpa biaya tambahan bagi Anda."
                      onChange={(e) => update({ disclosure: e.target.value })}
                    />
                    <span className="text-[11px] text-[var(--tx3)]">
                      Maksimal 280 karakter. Ditampilkan dengan jelas di bawah katalog produk.
                    </span>
                  </label>
                </div>

                  </div>
                </details>

                {/* Bar Pencarian & Filter Item */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[var(--tx)]">
                      Daftar Item ({catalogData.items.length}/50)
                    </span>
                    <button
                      type="button"
                      className="btn btn-p btn-sm gap-1.5"
                      disabled={catalogData.items.length >= 50}
                      onClick={() => {
                        const newItem: CatalogItem = {
                          id: crypto.randomUUID(),
                          name: '',
                          description: '',
                          category:
                            filterCategory &&
                            catalogData.categories.includes(filterCategory)
                              ? filterCategory
                              : '',
                          image_url: '',
                          price: null,
                          price_kind: 'fixed',
                          unit: '',
                          status: 'available',
                          duration: null,
                        };
                        update({ items: [...catalogData.items, newItem] });
                        setActiveItemId(newItem.id);
                      }}
                    >
                      <Plus size={15} strokeWidth={2} />
                      <span>Tambah item</span>
                    </button>
                  </div>

                  {catalogData.items.length > 3 && (
                    <div className="flex items-center gap-2">
                      <div className="relative grow">
                        <input
                          type="text"
                          className="pl-8 text-[13px]"
                          placeholder="Cari item dalam katalog..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search
                          size={14}
                          strokeWidth={1.75}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx3)]"
                        />
                      </div>
                      {catalogData.categories.length > 0 && (
                        <Select
                          aria-label="Filter kategori"
                          className="w-auto text-[13px] px-3"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                        >
                          <option value="">Semua kategori</option>
                          {catalogData.categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  )}

                  {/* List Item Kompak */}
                  {filteredItems.length === 0 ? (
                    <div className="p-6 text-center rounded-[var(--r2)] bg-[var(--s1)] text-[var(--tx2)] text-[13px]">
                      {catalogData.items.length === 0
                        ? 'Belum ada item di katalog ini. Klik "Tambah item" untuk mulai.'
                        : 'Tidak ada item yang sesuai dengan pencarian.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-0.5">
                      {filteredItems.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setActiveItemId(item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveItemId(item.id);
                            }
                          }}
                          className="flex items-center justify-between gap-3 p-2.5 px-3 rounded-[var(--r2)] bg-[var(--s1)] hover:bg-[var(--s2)] cursor-pointer transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt=""
                                className="w-10 h-10 object-contain rounded bg-black/20 shrink-0"
                              />
                            ) : (
                              <span className="w-10 h-10 rounded bg-[var(--s2)] grid place-items-center text-[var(--tx3)] shrink-0">
                                <ImageIcon size={18} strokeWidth={1.75} />
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="text-[14px] font-medium text-[var(--tx)] block truncate">
                                {item.name || `Item ${idx + 1}`}
                              </span>
                              <div className="flex items-center gap-2 text-[12px] text-[var(--tx3)] truncate">
                                {item.category && (
                                  <span className="tag">{item.category}</span>
                                )}
                                <span>
                                  {item.price_kind === 'ask'
                                    ? 'Tanya harga'
                                    : item.price !== null
                                    ? `Rp ${item.price.toLocaleString()}`
                                    : 'Rp 0'}
                                </span>
                                {item.action_url && (
                                  <span className="text-[var(--ac)] flex items-center gap-0.5">
                                    <ExternalLink size={10} /> Link
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded ${
                                item.status === 'available'
                                  ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                                  : 'bg-neutral-500/15 text-neutral-400'
                              }`}
                            >
                              {item.status === 'available'
                                ? 'Tersedia'
                                : item.status === 'unavailable'
                                ? 'Habis'
                                : 'Sembunyi'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ---------------- INFORMASI USAHA ---------------- */}
        {data.kind === 'business_info' && (
          <>
            <label className="business-field">
              <span>Zona waktu</span>
              <Select
                aria-label="Zona waktu"
                value={data.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
              >
                <option value="Asia/Jakarta">WIB · Jakarta</option>
                <option value="Asia/Makassar">WITA · Makassar</option>
                <option value="Asia/Jayapura">WIT · Jayapura</option>
              </Select>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={data.closed}
                onChange={(e) => update({ closed: e.target.checked })}
              />
              <span>Tutup sementara</span>
            </label>
            <p className="small muted">
              Centang hari operasional. Jam tutup lebih awal berarti tutup keesokan hari.
            </p>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const hours = data.hours.find((h) => h.day === day);
              const label = [
                'Minggu',
                'Senin',
                'Selasa',
                'Rabu',
                'Kamis',
                'Jumat',
                'Sabtu',
              ][day];
              return (
                <div key={day} className="business-hours-row">
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={!!hours}
                      onChange={(e) =>
                        update({
                          hours: e.target.checked
                            ? [
                                ...data.hours,
                                { day, open: '09:00', close: '17:00' },
                              ]
                            : data.hours.filter((h) => h.day !== day),
                        })
                      }
                    />
                    <span>{label}</span>
                  </label>
                  {hours && (
                    <>
                      <input
                        type="time"
                        name={`hours-open-${day}`}
                        aria-label={`Jam buka ${label}`}
                        value={hours.open}
                        onInput={(e) => {
                          const val = e.currentTarget.value;
                          update({
                            hours: data.hours.map((h) =>
                              h.day === day ? { ...h, open: val } : h
                            ),
                          });
                        }}
                      />
                      <input
                        type="time"
                        name={`hours-close-${day}`}
                        aria-label={`Jam tutup ${label}`}
                        value={hours.close}
                        onInput={(e) => {
                          const val = e.currentTarget.value;
                          update({
                            hours: data.hours.map((h) =>
                              h.day === day ? { ...h, close: val } : h
                            ),
                          });
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
            <label className="business-field">
              <span>Catatan kunjungan / hari libur</span>
              <textarea
                maxLength={500}
                value={data.note}
                placeholder="Contoh: Tutup pada hari libur nasional..."
                onChange={(e) => update({ note: e.target.value })}
              />
            </label>
          </>
        )}

        {/* ---------------- LOKASI USAHA ---------------- */}
        {data.kind === 'location' && (
          <>
            <label className="business-field">
              <span>Alamat usaha</span>
              <textarea
                maxLength={500}
                value={data.address}
                placeholder="Alamat lengkap usaha, gedung, lantai, atau patokan..."
                onChange={(e) => update({ address: e.target.value })}
              />
            </label>
            {field('URL peta (Google Maps)', data.map_url, (map_url) =>
              update({ map_url })
            )}
            <button
              type="button"
              className="btn btn-g btn-sm self-start"
              disabled={!data.address.trim()}
              onClick={() =>
                update({
                  map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    data.address
                  )}`,
                })
              }
            >
              Buat tautan peta dari alamat
            </button>
          </>
        )}

        {/* ---------------- KONTAK USAHA ---------------- */}
        {data.kind === 'contact' && (
          <>
            {field(
              'WhatsApp (contoh: 08123456789 atau 628123456789)',
              data.whatsapp,
              (v) => update({ whatsapp: normalizeWhatsapp(v) }),
              'tel'
            )}
            {field('Nomor telepon lain (opsional)', data.phone, (phone) =>
              update({ phone })
            )}
            {field('Email resmi (opsional)', data.email, (email) =>
              update({ email }),
              'email'
            )}
            {field('Website usaha (opsional)', data.website, (website) =>
              update({ website }),
              'url'
            )}
          </>
        )}

        {/* ---------------- PENGUMUMAN ---------------- */}
        {data.kind === 'announcement' && (
          <label className="business-field">
            <span>Isi teks pengumuman / kabar</span>
            <textarea
              aria-label="Isi pengumuman"
              maxLength={1000}
              value={data.text}
              placeholder="Tuliskan pengumuman penting, diskon, atau kabar terbaru..."
              onChange={(e) => update({ text: e.target.value })}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="business-error">
            {error}
          </p>
        )}

        <button
          disabled={busy || !!uploading}
          className="btn btn-p btn-w mt-2"
          type="submit"
        >
          {busy
            ? 'Menyimpan...'
            : uploading
            ? 'Menunggu upload...'
            : 'Simpan blok'}
        </button>
      </form>
    </Sheet>
  );
}
