# Prompt untuk Hermes: Implementasi & Deploy Redesign EdgeLink v2

Salin seluruh blok di bawah ke Hermes.

---

```
Kamu mengerjakan project EdgeLink di /Users/spixelsdev/edgelink.
Tugasmu: IMPLEMENTASI redesign UI dashboard (web/) sesuai prototipe, lalu VERIFIKASI dan DEPLOY ke Cloudflare.

## 0. Baca dulu (wajib, urut)
1. AGENTS.md dan PROJECT-HANDOFF.md (aturan arsitektur, keamanan, perintah deploy).
2. design/FLOW.md (use case, peta layar, breakpoint, kamus istilah, design token).
3. design/prototype-v2.html: SUMBER KEBENARAN visual dan interaksi. Buka di browser dan klik semua layar
   di lebar 320, 375, 768, 1024, 1280, 1920.
   design/mockup-p1.html sudah usang (masih pakai emoji dan radius besar): JANGAN diikuti.

## 1. Scope
- HANYA mengubah web/ (React + Tailwind). JANGAN mengubah worker/, schema D1, atau kontrak API.
  Semua endpoint yang dibutuhkan sudah ada (lihat tabel endpoint di PROJECT-HANDOFF.md §5).
- Pertahankan semua logika di web/src/api.ts (auto guest session, OTP, device sync, CRUD). Ubah lapisan UI saja.
- Jika ada fitur di prototipe yang butuh endpoint baru (mis. "Kunjungan profil" di Statistik), tampilkan
  data yang tersedia saja atau sembunyikan kartu itu, lalu catat di handoff sebagai TODO. Jangan menambah endpoint.

## 2. Aturan desain (non-negotiable)
- Mobile-first: tulis style dasar untuk <640px, lalu sm: (≥640) dan lg: (≥1024).
- TANPA emoji di seluruh UI. Ikon pakai lucide-react (sudah jadi dependency), stroke 1.75, ukuran 20px.
- Border radius minim: 4px (tag/seg item), 6px (tombol, input), 8px (kartu, sheet). Tidak ada rounded-full/pill
  kecuali kontrol yang memang harus bulat (tidak ada di prototipe).
- Tanpa border 1px (aturan AGENTS.md). Batas dibuat dari latar: surface white/4%, surface-2 white/7%, input white/9%.
- Font: Inter untuk UI (body 15px, minimal 13px). JetBrains Mono HANYA untuk URL, slug, kode, dan API key.
- Kontras teks minimal WCAG AA 4.5:1 (text-2 #b4b8c5 di atas #07080c). Focus ring 3px rgba(124,140,255,.55) di semua kontrol.
- Tap target minimal 44px. Hormati prefers-reduced-motion.
- Gunakan token di design/FLOW.md §Design token. Daftarkan sebagai CSS variables + extend di tailwind.config.js.

## 3. Struktur yang harus dibangun
Alur:
- Tanpa sesi tersimpan → layar Sambutan (pilih "Halaman profil" / "Pendekkan link" / "Masuk").
  Guest session baru dibuat SETELAH user menekan Mulai (bukan saat halaman dibuka). Ini mencegah akun guest
  sampah setiap kali ada yang membuka situs.
- Pilihan "Halaman profil" → tab Profil; "Pendekkan link" → tab Link.
- Sesi sudah ada → langsung ke App (tab terakhir disimpan di localStorage).

Shell:
- <1024px: topbar (logo, ikon Bagikan, tombol "Simpan akun" bila guest) + bottom nav 4 tab
  (Profil, Link, Statistik, Akun) + FAB "+" di tab Link.
- ≥1024px: sidebar 240px (nav + kartu "Simpan akun" bila guest) + konten maks 720px
  + kolom pratinjau HP 380px khusus tab Profil (live update dari state form).
- Sheet: bottom sheet di <640px, dialog tengah di ≥640px. Tutup dengan Esc / klik scrim, fokus dikunci di dalam (focus trap),
  fokus kembali ke pemicu saat ditutup.

Komponen (boleh pecah file sesuai kebutuhan):
- Welcome, AppShell (Sidebar, TopBar, BottomNav), ProfileScreen (header profil, daftar blok drag-reorder,
  tema 6 pilihan, bentuk foto), LinksScreen (cari, daftar, salin, status aktif), StatsScreen (7/30 hari, negara),
  AccountScreen (simpan akun, pindah perangkat, developer/API key tersembunyi di bagian yang bisa dibuka, legal).
- Sheets: AddLink (opsi lanjutan di <details>), AddBlock (Link/Sorotan/WhatsApp/Judul bagian),
  EditProfile (cek ketersediaan handle), Share (QR, salin, WhatsApp, Instagram, unduh QR),
  SaveAccount (email → OTP 6 kotak, auto-advance, paste 6 digit, timer kirim ulang),
  Login (email / scan QR / kode pindah perangkat), DeviceTransfer (QR + kode + peringatan).
- Toast konfirmasi (role="status") untuk salin/simpan/buat.
- Komponen lama (LinkManager, BioProfileBuilder, AnalyticsModal, LegalModal) dipecah atau dibuang setelah fiturnya
  pindah. LegalModal boleh dipakai ulang dari menu Akun.

Teks: SEMUA label mengikuti kamus di design/FLOW.md. Tidak boleh ada istilah "Slug", "Base62", "Deep Link",
"Destination URL", "Secret Sync Key", "Klaim" di UI umum. Istilah teknis hanya boleh muncul di bagian Developer.

Reorder blok: debounce PUT /api/links/reorder minimal 800ms setelah drag terakhir (batas write D1/KV free tier).

## 4. Verifikasi sebelum deploy (wajib lulus semua)
1. cd worker && npm run typecheck && npm test   → harus lulus tanpa perubahan (worker tidak disentuh).
2. cd web && npm run build                      → 0 error TypeScript, dist/ terbentuk.
3. npm run preview, lalu cek di browser pada lebar 320 / 375 / 768 / 1024 / 1280 / 1920:
   - tidak ada scroll horizontal (document.documentElement.scrollWidth === innerWidth)
   - semua 4 tab dan 7 sheet bisa dibuka dan ditutup, keyboard-only (Tab/Enter/Esc) berfungsi
   - console bebas error
   - grep 0 emoji di web/src:  grep -rP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" web/src  → kosong
   - grep 0 border 1px kartu:  grep -rn "border-neutral\|border-white/" web/src → kosong
4. Smoke test end-to-end ke API production dari preview: Mulai → buat link → salin → buka /@handle →
   Simpan akun (email asli milik tester) → OTP → logout → Masuk di jendela incognito.
5. Ambil screenshot 375px dan 1280px untuk tiap tab, simpan di design/screens/.

## 5. Deploy (hanya jika langkah 4 lulus)
cd /Users/spixelsdev/edgelink/web
npm run build
npx wrangler pages deploy dist --project-name=edgelink --commit-dirty=true
Lalu buka https://edgelink-afl.pages.dev di 375px dan 1280px untuk memastikan versi baru live.
Worker TIDAK perlu di-deploy ulang.

Jika ada yang gagal: JANGAN deploy. Laporkan error lengkap + langkah yang gagal.

## 6. Setelah selesai
- Update PROJECT-HANDOFF.md: bagian struktur web/src (komponen baru) + standar desain (radius 4/6/8, tanpa emoji,
  mobile-first, kamus istilah).
- aimem_handoff_post projectId "edgelink": ringkasan perubahan, URL deploy, hasil verifikasi, TODO
  (mis. metrik kunjungan profil butuh endpoint baru).
- Laporkan: daftar file berubah, hasil tiap langkah verifikasi, URL live, screenshot.
```

---

# Tambahan v3: Bio editor bebas + 100% gratis + bilingual

```
Lanjutan tugas di atas. Baca design/FLOW.md bagian "Positioning", "Bahasa", "Bio editor v3",
lalu buka design/bio-editor-v3.html (sumber kebenaran; tombol EN di topbar menunjukkan versi Inggris).

A. 100% gratis: pasang teks baku ID/EN dari FLOW.md di Sambutan, editor, Akun, footer bio, meta description.
   grep -rni "premium\|upgrade\|pro plan" web/src worker/src → harus kosong.
B. Bilingual: i18n ID/EN untuk SELURUH web/ (kamus, bukan text-walk seperti prototipe). Footer bio publik ikut Accept-Language.
C. Bio v3 BUTUH perubahan worker (pengecualian scope "web/ saja" untuk bagian ini):
   - Migrasi D1: ALTER TABLE bio_profiles ADD COLUMN style TEXT DEFAULT '{}' (JSON: bg, accent, font, btn, radius, gap, enter, hover, bgfx, cover_url, av_shape, ring);
     ALTER TABLE links ADD COLUMN style TEXT DEFAULT '{}' (fx, thumb_url, image_url, ratio, images[]).
     block_type tambah: image, gallery, video, text, social, divider.
   - Validasi server: whitelist ketat setiap nilai enum/angka dalam style JSON (tolak properti asing), maks 4KB; semua URL gambar
     lewat validateDestinationUrl (https saja); jangan pernah sisipkan nilai mentah ke CSS (hanya dari whitelist), escapeHtml teks.
   - bio.ts: render efek dengan CSS murni (lihat class .bio di prototipe), tetap TANPA JavaScript, target < 20KB, prefers-reduced-motion.
   - Gambar: fase 1 pakai URL gambar (CSP img-src * sudah izinkan). Upload file = fase 2 (butuh R2) → catat TODO, jangan aktifkan.
   - Video: simpan URL, render thumbnail + link (tanpa iframe/script).
   - Query wajib WHERE id=? AND user_id=?; simpan style dengan debounce >= 800ms.
D. Verifikasi: worker typecheck + test (tambahkan test untuk validasi style JSON & URL), web build, cek 320–1920px di ID dan EN.
E. Deploy: migrasi D1 remote → deploy worker → deploy Pages (urutan ini). Jika gagal, jangan lanjut.
```
