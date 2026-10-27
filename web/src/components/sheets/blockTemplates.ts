import { BioBlockType } from '../../types';

/** Template blok siap pakai. Semua memakai block_type yang sudah dirender worker. */
export type TemplateKind = 'wa' | 'url' | 'text' | 'header';

export interface BlockTemplate {
  id: string;
  cat: TemplateCat;
  name: string;
  kind: TemplateKind;
  /** block_type untuk kind 'url' */
  type?: Extract<BioBlockType, 'link' | 'featured' | 'video'>;
  /** judul tombol / isi teks bawaan */
  title: string;
  /** pesan awal WhatsApp bawaan */
  msg?: string;
  /** contoh link untuk placeholder */
  hint?: string;
}

export type TemplateCat = 'jualan' | 'kreator' | 'kontak' | 'info' | 'acara' | 'komunitas';

export const TEMPLATE_CATS: { id: TemplateCat; label: [string, string] }[] = [
  { id: 'jualan', label: ['Jualan', 'Selling'] },
  { id: 'kreator', label: ['Kreator', 'Creator'] },
  { id: 'kontak', label: ['Kontak', 'Contact'] },
  { id: 'info', label: ['Info', 'Info'] },
  { id: 'acara', label: ['Acara', 'Events'] },
  { id: 'komunitas', label: ['Komunitas', 'Community'] },
];

export const TEMPLATES: BlockTemplate[] = [
  // Jualan
  { id: 'order-wa', cat: 'jualan', name: 'Pesan via WhatsApp', kind: 'wa', title: 'Pesan sekarang', msg: 'Halo, saya mau pesan:' },
  { id: 'catalog', cat: 'jualan', name: 'Katalog produk', kind: 'url', type: 'featured', title: 'Lihat katalog', hint: 'https://shopee.co.id/tokokamu' },
  { id: 'promo', cat: 'jualan', name: 'Promo hari ini', kind: 'text', title: 'Promo hari ini: diskon 20% untuk semua produk. Berlaku sampai pukul 21.00.' },
  { id: 'stock', cat: 'jualan', name: 'Cek stok & ongkir', kind: 'wa', title: 'Cek stok & ongkir', msg: 'Halo, apakah produk ini masih ada? Ongkir ke kota saya berapa?' },
  { id: 'testimoni', cat: 'jualan', name: 'Testimoni pelanggan', kind: 'url', type: 'link', title: 'Baca testimoni pelanggan', hint: 'https://instagram.com/stories/highlights/…' },

  // Kreator
  { id: 'latest', cat: 'kreator', name: 'Konten terbaru', kind: 'url', type: 'video', title: 'Tonton konten terbaru', hint: 'https://youtu.be/…' },
  { id: 'collab', cat: 'kreator', name: 'Kerja sama & endorse', kind: 'wa', title: 'Kerja sama & endorse', msg: 'Halo, saya tertarik kerja sama. Boleh minta rate card?' },
  { id: 'support', cat: 'kreator', name: 'Dukung karya saya', kind: 'url', type: 'featured', title: 'Dukung karya saya', hint: 'https://saweria.co/namakamu' },
  { id: 'ratecard', cat: 'kreator', name: 'Rate card', kind: 'url', type: 'link', title: 'Lihat rate card', hint: 'https://drive.google.com/…' },
  { id: 'about', cat: 'kreator', name: 'Tentang saya', kind: 'text', title: 'Halo! Saya membuat konten seputar kuliner dan jalan-jalan. Konten baru setiap Senin dan Kamis.' },

  // Kontak
  { id: 'cs', cat: 'kontak', name: 'Chat customer service', kind: 'wa', title: 'Hubungi CS', msg: 'Halo, saya butuh bantuan.' },
  { id: 'hours', cat: 'kontak', name: 'Jam operasional', kind: 'text', title: 'Senin–Jumat 09.00–17.00 · Sabtu 09.00–14.00 · Minggu libur' },
  { id: 'store', cat: 'kontak', name: 'Alamat toko', kind: 'url', type: 'link', title: 'Kunjungi toko kami', hint: 'https://maps.app.goo.gl/…' },
  { id: 'booking', cat: 'kontak', name: 'Booking / reservasi', kind: 'wa', title: 'Booking sekarang', msg: 'Halo, saya mau reservasi untuk tanggal:' },
  { id: 'h-contact', cat: 'kontak', name: 'Judul: Hubungi kami', kind: 'header', title: 'Hubungi kami' },

  // Info
  { id: 'announce', cat: 'info', name: 'Pengumuman', kind: 'text', title: 'Pengumuman: toko tutup sementara pada 17 Agustus. Pesanan dikirim kembali tanggal 18.' },
  { id: 'faq', cat: 'info', name: 'Pertanyaan umum', kind: 'url', type: 'link', title: 'Pertanyaan umum (FAQ)', hint: 'https://notion.so/…' },
  { id: 'return', cat: 'info', name: 'Kebijakan retur', kind: 'text', title: 'Barang bisa ditukar maksimal 3 hari setelah diterima, dengan video unboxing.' },
  { id: 'howto', cat: 'info', name: 'Cara pemesanan', kind: 'text', title: '1. Pilih produk  2. Chat WhatsApp  3. Transfer  4. Pesanan dikirim hari yang sama' },
  { id: 'h-info', cat: 'info', name: 'Judul: Info penting', kind: 'header', title: 'Info penting' },

  // Acara
  { id: 'register', cat: 'acara', name: 'Daftar acara', kind: 'url', type: 'featured', title: 'Daftar sekarang', hint: 'https://forms.gle/…' },
  { id: 'schedule', cat: 'acara', name: 'Jadwal acara', kind: 'text', title: 'Sabtu, 12 Juli · 19.00 WIB · Online via Zoom' },
  { id: 'ticket', cat: 'acara', name: 'Beli tiket', kind: 'url', type: 'featured', title: 'Beli tiket', hint: 'https://loket.com/…' },
  { id: 'replay', cat: 'acara', name: 'Rekaman acara', kind: 'url', type: 'video', title: 'Tonton rekaman', hint: 'https://youtu.be/…' },
  { id: 'h-event', cat: 'acara', name: 'Judul: Acara mendatang', kind: 'header', title: 'Acara mendatang' },

  // Komunitas
  { id: 'wa-group', cat: 'komunitas', name: 'Gabung grup WhatsApp', kind: 'url', type: 'link', title: 'Gabung grup WhatsApp', hint: 'https://chat.whatsapp.com/…' },
  { id: 'newsletter', cat: 'komunitas', name: 'Newsletter', kind: 'url', type: 'link', title: 'Langganan newsletter', hint: 'https://substack.com/…' },
  { id: 'portfolio', cat: 'komunitas', name: 'Portofolio', kind: 'url', type: 'featured', title: 'Lihat portofolio', hint: 'https://behance.net/…' },
  { id: 'hiring', cat: 'komunitas', name: 'Lowongan kerja', kind: 'url', type: 'link', title: 'Kami sedang merekrut', hint: 'https://forms.gle/…' },
  { id: 'download', cat: 'komunitas', name: 'Unduhan gratis', kind: 'url', type: 'link', title: 'Unduh e-book gratis', hint: 'https://drive.google.com/…' },
];

/** Versi Inggris: nama, judul, dan pesan bawaan per template (id sama). */
export const TEMPLATES_EN: Record<string, Pick<BlockTemplate, 'name' | 'title'> & { msg?: string }> = {
  'order-wa': { name: 'Order via WhatsApp', title: 'Order now', msg: 'Hi, I would like to order:' },
  catalog: { name: 'Product catalog', title: 'See the catalog' },
  promo: { name: "Today's promo", title: "Today's promo: 20% off all products. Valid until 9 PM." },
  stock: { name: 'Stock & shipping check', title: 'Check stock & shipping', msg: 'Hi, is this product still available? How much is shipping to my city?' },
  testimoni: { name: 'Customer reviews', title: 'Read customer reviews' },
  latest: { name: 'Latest content', title: 'Watch my latest content' },
  collab: { name: 'Collabs & sponsorships', title: 'Collabs & sponsorships', msg: 'Hi, I am interested in working together. Could I see your rate card?' },
  support: { name: 'Support my work', title: 'Support my work' },
  ratecard: { name: 'Rate card', title: 'See my rate card' },
  about: { name: 'About me', title: 'Hi! I make content about food and travel. New posts every Monday and Thursday.' },
  cs: { name: 'Customer service chat', title: 'Contact support', msg: 'Hi, I need some help.' },
  hours: { name: 'Opening hours', title: 'Mon–Fri 9 AM–5 PM · Sat 9 AM–2 PM · Closed Sunday' },
  store: { name: 'Store address', title: 'Visit our store' },
  booking: { name: 'Booking / reservation', title: 'Book now', msg: 'Hi, I would like to make a reservation for:' },
  'h-contact': { name: 'Heading: Contact us', title: 'Contact us' },
  announce: { name: 'Announcement', title: 'Announcement: the store is closed on Aug 17. Orders ship again on the 18th.' },
  faq: { name: 'FAQ', title: 'Frequently asked questions' },
  return: { name: 'Return policy', title: 'Items can be exchanged within 3 days of delivery, with an unboxing video.' },
  howto: { name: 'How to order', title: '1. Pick a product  2. Chat on WhatsApp  3. Pay  4. Ships the same day' },
  'h-info': { name: 'Heading: Important info', title: 'Important info' },
  register: { name: 'Event sign-up', title: 'Register now' },
  schedule: { name: 'Event schedule', title: 'Saturday, July 12 · 7 PM · Online via Zoom' },
  ticket: { name: 'Buy tickets', title: 'Buy tickets' },
  replay: { name: 'Event recording', title: 'Watch the recording' },
  'h-event': { name: 'Heading: Upcoming events', title: 'Upcoming events' },
  'wa-group': { name: 'Join WhatsApp group', title: 'Join our WhatsApp group' },
  newsletter: { name: 'Newsletter', title: 'Subscribe to the newsletter' },
  portfolio: { name: 'Portfolio', title: 'See my portfolio' },
  hiring: { name: 'Job openings', title: "We're hiring" },
  download: { name: 'Free download', title: 'Download the free e-book' },
};

export const localizedTemplates = (lang: 'id' | 'en'): BlockTemplate[] =>
  lang === 'en' ? TEMPLATES.map((t) => ({ ...t, ...TEMPLATES_EN[t.id] })) : TEMPLATES;
