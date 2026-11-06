# 1stdev.link — Modern Light Workspace (UI/UX 2.0)

Tanggal: 2026-11-06 · Status: fase fondasi dan layar utama di branch `feat/modern-light-workspace`.

## Tujuan

Menyatukan identitas visual landing, panel, pembuat halaman, shortlink manager, statistik, business/affiliate workspace, dan halaman publik melalui light UI yang mudah dipakai. Halaman publik lama **tidak dipaksa** mengubah tema. API, D1, KV, R2, SSR, alur OTP, cache dan analitik tetap dipertahankan.

## Peta layar, tugas, dan komponen

| Layar | Tugas utama | Komponen terkait | Fokus redesign |
| --- | --- | --- | --- |
| Landing | Mengerti manfaat dan mulai | `LandingPage.tsx`, `portfolio-landing.css` | Narasi konkret dan visual contoh produk; satu CTA utama |
| Welcome | Pilih Creator, Usaha, Affiliate, atau masuk | `Welcome.tsx` | Pilihan sederhana, contoh hasil, status guest jelas |
| Beranda | Melihat halaman, total klik/link, aksi berikutnya | `HomeScreen.tsx` | Hierarki KPI, aksi cepat, informasi terpenting |
| Halaman | Ubah profil, isi, tema dan publikasi | `ProfileScreen.tsx`, `LivePhonePreview.tsx`, `sheets/*` | Studio: konten/tema/preview, autosave eksplisit |
| Link | Membuat, mencari, filter, menyalin dan mengelola shortlink | `LinksScreen.tsx`, `AddLinkSheet.tsx` | Toolbar mudah ditemukan dan status terpisah dari hapus |
| Statistik | Memahami klik, tren, top link, negara, ekspor | `StatsScreen.tsx` | KPI dan grafik mudah dipindai; klik bukan penjualan |
| Usaha & Affiliate | Mengelola katalog, kontak, jam buka, lokasi | `BusinessModePanel.tsx`, `BusinessBlockSheet.tsx` | Pemisahan konfigurasi, item list, satu editor item |
| Akun | Simpan akun, transfer perangkat, keamanan, developer | `AccountScreen.tsx` | Section settings yang terstruktur |
| Publik /@handle | Menampilkan profil/katalog sesuai tema pengguna | `shared/renderBioPage.ts`, `shared/renderBusiness.ts` | Paritas preview-SSR; jangan mengubah tema lama diam-diam |

## Struktur navigasi target

- Desktop >= 1024px: sidebar workspace yang konsisten (Beranda, Halaman, Link, Statistik, Pengaturan); tombol Buat dan Bagikan tetap di topbar; preview sticky untuk halaman bila tersedia.
- Mobile/tablet: bottom dock empat destinasi dengan aksi Buat di tengah; Akun melalui topbar.
- Aksi penting tidak hanya bergantung pada dock: misalnya tombol Tambah link juga tampil di header layar Link.

## Design tokens 2.0

| Token | Nilai | Kegunaan |
| --- | --- | --- |
| `--bg` | `#f7f9f7` | Canvas |
| `--s1` | `#ffffff` | Surface |
| `--s2` | `#edf3ef` | Input dan surface sekunder |
| `--tx` | `#17362d` | Teks utama |
| `--tx2` | `#52695e` | Teks sekunder |
| `--ac` | `#18765d` | Aksi utama, fokus dan navigasi |
| `--ink` | `#ffffff` | Teks pada aksi utama |
| `--r1/r2/r3` | 10/14/20px | Komponen kecil, sedang, kartu |

Tipografi: DM Sans (UI dan judul), Inter fallback, JetBrains Mono untuk slug/URL. Fokus keyboard harus terlihat, kontras memadai, reduced-motion dihormati, target sentuh minimal 44px. Tidak memakai tracker pihak ketiga.

## Implementasi fase pertama

- [x] Palet light lintas root CSS dan Tailwind
- [x] `<html class="light">` dan theme-color terang
- [x] Sidebar desktop responsif, topbar, bottom dock mobile
- [x] Page headings Beranda, Halaman, Link, Statistik, Akun
- [x] Kartu, KPI, form, sheet, dropdown, toggle, grafik, builder surfaces bernuansa light
- [x] Landing hero product-first dengan contoh panel dan halaman publik, label demo yang jelas
- [x] Scrollbar native dan focus-visible dipertahankan
- [ ] Browser QA untuk lebar 320, 375, 390, 768, 1024, 1440px
- [ ] Uji kontras WCAG AA dan keyboard focus
- [ ] Screenshot visual regression untuk seluruh ekran
- [ ] Uji komprehensif interaksi sebelum deploy

## Backlog fase lanjut

1. **Builder UX** — pengelompokan pengaturan identitas, tema, background/efek yang lebih ringkas; inline editing; live preview yang tetap identik dengan SSR.
2. **Business workspace** — tata letak daftar katalog dan editor item yang lebih terpisah; jelasnya ketersediaan, CTA, disclosure affiliate.
3. **Onboarding** — contoh hasil dan pilihan tujuan; tidak menambah hambatan registrasi.
4. **Public themes** — varian light yang polished untuk halaman baru; tema historis tidak berubah otomatis.
5. **Quality** — keyboard, dialog, zoom, kontras, input errors, loading/empty states, reduced-motion, ID/EN.

## Regresi yang wajib dicek

- Guest → simpan akun / email OTP / pindah perangkat / keluar.
- Buat, edit, hapus, lepas dari halaman, aktif/nonaktif, reorder.
- Autosave lambat/gagal, refresh, ganti akun, multi-device.
- Tema, avatar, cover, wallpaper, business/affiliate dan preview SSR.
- Grafik klik 7/30 hari, ekspor CSV, QR, shortlink iOS/Android.
- Responsif tanpa overflow di 320px dan 390px; tidak ada scroll trap.
- `cd worker && npm run typecheck && npm test`, `cd web && npm run build`, plus audit visual.
