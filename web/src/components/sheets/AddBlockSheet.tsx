import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import { Link2, Star, MessageCircle, Type, ArrowLeft } from 'lucide-react';
import { BioBlockType } from '../../types';

interface AddBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLinkType: (type: 'link' | 'featured') => void;
  onCreateBlock: (payload: {
    title: string;
    destination_url: string;
    block_type: BioBlockType;
  }) => Promise<void>;
}

export const AddBlockSheet: React.FC<AddBlockSheetProps> = ({
  isOpen,
  onClose,
  onSelectLinkType,
  onCreateBlock,
}) => {
  const [subMode, setSubMode] = useState<'menu' | 'whatsapp' | 'header'>('menu');
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setSubMode('menu');
    setWaNumber('');
    setWaMessage('');
    setHeaderTitle('');
    onClose();
  };

  const handleCreateWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waNumber.trim()) return;

    let cleanNum = waNumber.trim().replace(/[^0-9]/g, '');
    if (cleanNum.startsWith('0')) {
      cleanNum = `62${cleanNum.slice(1)}`;
    }

    const encodedText = waMessage.trim() ? `?text=${encodeURIComponent(waMessage.trim())}` : '';
    const waUrl = `https://wa.me/${cleanNum}${encodedText}`;

    setLoading(true);
    try {
      await onCreateBlock({
        title: 'Chat WhatsApp',
        destination_url: waUrl,
        block_type: 'whatsapp',
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerTitle.trim()) return;

    setLoading(true);
    try {
      await onCreateBlock({
        title: headerTitle.trim(),
        destination_url: '#',
        block_type: 'header',
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      title={
        subMode === 'menu'
          ? 'Tambah isi'
          : subMode === 'whatsapp'
          ? 'Tambah WhatsApp'
          : 'Tambah judul bagian'
      }
    >
      {subMode === 'menu' && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              handleClose();
              onSelectLinkType('link');
            }}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--tx2)] shrink-0">
              <Link2 size={20} strokeWidth={1.75} />
            </span>
            <span className="grow text-left min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Link</h3>
              <span className="small muted block">Tombol ke website, toko, atau media sosial</span>
            </span>
          </button>

          <button
            type="button"
            className="menu-item"
            onClick={() => {
              handleClose();
              onSelectLinkType('featured');
            }}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
              <Star size={20} strokeWidth={1.75} />
            </span>
            <span className="grow text-left min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Sorotan</h3>
              <span className="small muted block">Tombol besar berwarna untuk hal terpenting</span>
            </span>
          </button>

          <button
            type="button"
            className="menu-item"
            onClick={() => setSubMode('whatsapp')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ok)] shrink-0">
              <MessageCircle size={20} strokeWidth={1.75} />
            </span>
            <span className="grow text-left min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">WhatsApp</h3>
              <span className="small muted block">Pengunjung langsung chat ke nomor kamu</span>
            </span>
          </button>

          <button
            type="button"
            className="menu-item"
            onClick={() => setSubMode('header')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--tx2)] shrink-0">
              <Type size={20} strokeWidth={1.75} />
            </span>
            <span className="grow text-left min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Judul bagian</h3>
              <span className="small muted block">Teks pemisah untuk mengelompokkan link</span>
            </span>
          </button>
        </div>
      )}

      {subMode === 'whatsapp' && (
        <form onSubmit={handleCreateWhatsApp} className="flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-t btn-sm self-start -ml-2"
            onClick={() => setSubMode('menu')}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Kembali</span>
          </button>

          <div className="field">
            <label htmlFor="wa-num">Nomor WhatsApp</label>
            <input
              id="wa-num"
              type="tel"
              inputMode="tel"
              required
              placeholder="mis. 08123456789 atau 628123456789"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="wa-msg">
              Pesan awal <span className="muted font-normal">(opsional)</span>
            </label>
            <input
              id="wa-msg"
              type="text"
              placeholder="Halo, saya ingin bertanya tentang produk..."
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p btn-w mt-2 disabled:opacity-50"
          >
            {loading ? 'Menambahkan...' : 'Simpan WhatsApp'}
          </button>
        </form>
      )}

      {subMode === 'header' && (
        <form onSubmit={handleCreateHeader} className="flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-t btn-sm self-start -ml-2"
            onClick={() => setSubMode('menu')}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Kembali</span>
          </button>

          <div className="field">
            <label htmlFor="h-title">Nama Bagian / Kategori</label>
            <input
              id="h-title"
              type="text"
              required
              placeholder="mis. Katalog Produk, Media Sosial, Kontak"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p btn-w mt-2 disabled:opacity-50"
          >
            {loading ? 'Menambahkan...' : 'Simpan Judul'}
          </button>
        </form>
      )}
    </Sheet>
  );
};
