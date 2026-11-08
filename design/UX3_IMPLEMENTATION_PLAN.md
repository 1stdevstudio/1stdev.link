# RFC — Stabilitas Desain dan UI/UX 3.0 (1stdev.link)

Status: PROPOSED / PLANNING ONLY  
Basis audit: main pada commit 38b35e77e7e93cada8525073e1fe21cb4fc7ecb4  
Tanggal: 2026-11-08  
Cakupan: web React/Vite, SSR publik, pengujian browser, integrasi Cloudflare Pages/Worker.  
**Tidak mengubah fitur, database, API atau deploy production dengan dokumen ini.**

## 1. Sasaran, keputusan, dan batasan

1. Pengunjung pertama mendapat satu homepage kanonis yang terang, terbaca, meyakinkan dan dapat langsung membuat halaman/link tanpa registrasi wajib.
2. Pengguna terautentikasi mendapat workspace full-width terstruktur tanpa header terlalu jauh dari konten, tanpa overflow, dan dengan navigasi yang dapat digunakan dengan keyboard.
3. Builder mudah dipahami di desktop/mobile, menggunakan preview SSR yang sama dengan publik.
4. Tidak boleh memodifikasi tema lama milik pengguna, reset data, merusak slug pendek, SEO atau OTP.
5. Setiap perubahan desain wajib lolos tes screenshot/browser sebelum boleh di-merge.
6. Pertahankan arsitektur Cloudflare Workers + D1/KV/R2 + Pages, dan API yang sudah berjalan.
7. Tidak mengklaim adanya tombol Publish baru: saat ini halaman publik diperbarui lewat autosave, maka UI harus menunjukkan status menyimpan/tersimpan/gagal secara akurat.

Kebijakan visual: light untuk marketing & dashboard; tema halaman publik tetap berdasarkan pengaturan profil pengguna. Warna dasar #F7F9F7, surface #FFFFFF, teks #17362D, teks sekunder #52695E, aksen #18765D; gunakan CSS custom properties, bukan literal berulang.

## 2. Audit keadaan sekarang (terverifikasi dari source)

| Temuan dan bukti source | Risiko | Perbaikan |
| --- | --- | --- |
| web/src/App.tsx memilih Welcome saat tanpa sesi; LandingPage hanya bila /landing atau view=landing | Desain homepage yang diedit tidak sama dengan yang benar-benar tampil | Jadikan satu komposisi kanonis pada /; lepas ketergantungan preview publik untuk fitur utama |
| web/index.html body masih punya inline style background-color: #070e0c meskipun html class=light | Flash/area gelap; CSS biasa tidak mengalahkan inline style | Hapus inline dark, ubah noscript dan selection token sesuai light |
| web/src/index.css menumpuk aturan v2, light overrides, welcome CSS, full-width overrides | Cascade sulit diaudit, perubahan lintas layar tidak dapat diprediksi | Pisahkan tokens, base, layouts, components, features secara bertahap |
| web/src/components/portfolio-landing.css masih memuat style desain lama dan override hero | Duplikasi aturan, risiko regression di breakpoint | Audit selector unused, ekstrak namespace landing, hapus dead CSS setelah screenshot baseline |
| web/src/App.tsx + web/src/state/sessionCache.ts memakai hash + localStorage untuk tab | Deep-link/tab state dapat bentrok bila melakukan redesign routing | Pertahankan skema hash di P0/P1; tambah tes back/forward dan tab profile |
| worker/src/index.ts punya root /, /@:handle, /:slug dan proxy assets dari Pages | Route landing baru dapat bentrok dengan slug pendek | Jangan membuat route baru tanpa reservasi eksplisit dan tes redirect; pilih komposisi di / |
| web/src/components/LivePhonePreview.tsx memakai shared/renderBioPage.ts | Ini sudah sumber preview/SSR yang baik | Pertahankan satu renderer; tes paritas dengan data fixture |
| .github/workflows/verify.yml hanya web build serta Worker typecheck + tests | Layout visual bisa gagal meski CI hijau | Tambahkan Playwright + screenshot baseline + a11y checks |
| web/src/main.tsx dapat memindahkan host *.pages.dev ke domain utama | Preview branch berisiko menguji production tanpa sadar | Tetapkan preview-domain policy yang aman dan test redirect tersendiri |
| web/src/api.ts memakai mock hanya ketika Vite DEV dan VITE_USE_MOCK=true | Test Cloudflare preview tidak otomatis memiliki fixture aman | Siapkan staging terpisah atau pengujian browser lokal/mock; jangan memakai akun/data production untuk fixture |

Arsitektur produksi saat audit: Pages project edgelink, repo algiarts/1stdev.link, production branch main, root web, build npm ci && npm run build, output dist. Domain 1stdev.link dan www.1stdev.link melalui Worker edgelink-worker menuju frontend Pages edgelink-afl.pages.dev. Kedua deployment adalah unit terpisah.

## 3. Rancangan UX kanonis

### 3.1 Pengunjung pertama

- URL / menampilkan satu landing + pilihan tujuan (Creator, UMKM, Affiliate, Link pendek), bukan dua landing yang berlainan.
- Hero: manfaat utama, contoh tampilan yang jelas ditandai demo, satu CTA utama, tindakan Masuk yang mudah dicari.
- Pilihan tujuan menggunakan tombol radio/kartu dengan aria-pressed yang konsisten; satu CTA Mulai sekarang.
- Jalur Creator/Business/Affiliate: pengguna pilih tujuan, tekan mulai, POST /api/auth/guest, lengkapi profil dengan pengaturan business purpose yang sudah ada, masuk tab Halaman; tunjukkan CTA pertama dan Bagikan.
- Jalur link pendek: POST /api/auth/guest, buka tab Link, tampilkan satu form tindakan pertama.
- Jika request gagal: pertahankan pilihan pengguna, tampilkan pesan yang dapat dicoba ulang; jangan membuat duplikasi sesi.
- Pengguna kembali: Masuk -> OTP/device transfer -> restore session -> tab yang sesuai; jangan merender guest welcome sementara session restore berlangsung.
- Halaman /landing hanya sebagai preview internal selama migrasi; setelah verifikasi, arahkan ke / atau hapus cabang preview tanpa menambah route Worker yang bertabrakan.

### 3.2 Workspace

- Desktop >=1024: sidebar lebar stabil 224-248px, topbar tinggi 64-68px, konten mengisi kolom yang tersisa, padding adaptif 20-36px.
- Workspace utama tidak di-center lagi dengan max-width yang sempit. Konten panjang tetap memakai grid/batas baca pada kartu atau formulir, bukan membatasi seluruh workspace.
- Tablet 640-1023: satu kolom dengan bottom navigation yang jelas; panel minimal 16-24px gutter.
- Mobile 320-639: satu kolom, nav bawah tidak menutup CTA, safe-area dihormati, menu Create/Sheet mudah ditutup.
- Header judul mulai dalam ~16-28px dari batas topbar desktop, sesuai hirarki setiap layar.
- Status guest + Save account dapat dilihat namun tidak mendominasi viewport.

### 3.3 Flow builder

- Struktur urut: Identitas -> Isi/blok -> Tampilan -> Pratinjau -> Bagikan.
- Desktop: panel editor fleksibel + preview sticky; untuk layar lebar dapat memakai daftar blok + inspector + preview jika ruang mencukupi. Jangan memaksakan 3 kolom pada 1024px.
- Mobile: tab Isi / Desain / Pratinjau; tombol tambah blok kontekstual; sheet menyertakan fokus keyboard dan konfirmasi ketika perlu.
- Autosave eksplisit: Saving -> Saved -> Error + Retry; jangan tampilkan “Terbit” sebelum server mengonfirmasi.
- Pertahankan serialisasi penulisan, revision guard, dan generation guard di App.tsx.
- Ketika mengubah tema, cover/wallpaper dan style yang sudah dimiliki pengguna tidak direset.
- Reorder harus punya alternatif keyboard, bukan gesture drag saja.
- Hasil iframe preview dan GET /@handle diuji dengan fixture yang sama karena sama-sama memakai shared/renderBioPage.ts.

### 3.4 Links, Statistik, dan Akun

- Link: header + Add CTA, KPI responsif, search/filter/sort, empty state yang menggunakan ruang, tombol copy/active/open/delete dengan label aksesibel. Mobile toolbar bertumpuk rapi.
- Statistik: gunakan label jelas 7/30 hari, klik bukan penjualan, empty/error/loading lengkap, negara/top links/CSV sesuai data API saat ini.
- Beranda: header rapat, overview profil, CTA Next Best Action sesuai kondisi guest/blok/link, grid KPI sesuai lebar kolom.
- Business/Affiliate: perbaiki navigasi katalog dan editor blok besar tanpa mengubah business JSON; disclosure affiliate tetap tampil.
- Akun: kelompokkan sesi/keamanan, preferensi, developer dan legal; status guest, OTP, perangkat tidak berubah secara fungsional.

## 4. Mapping file dan komponen (pekerjaan konkret)

| Area | File existing | Tugas utama | Komponen baru / hasil |
| --- | --- | --- | --- |
| Root & routing | web/src/App.tsx, web/src/main.tsx, web/src/state/sessionCache.ts | Satukan root landing; jaga auth/hash/back/forward; preview policy | WelcomeFlow, RouteBoundary (opsional) |
| First visit | web/src/components/Welcome.tsx, LandingPage.tsx, portfolio-landing.css | Hilangkan duplikasi hero, gunakan satu komposisi dengan choice cards | MarketingHero, GoalPicker, ProductPreview |
| HTML baseline | web/index.html | Hapus inline dark style, sesuaikan noscript/selection/meta | HTML light konsisten |
| Design system | web/src/index.css, web/tailwind.config.js | Normalisasi token, foundation, spacing, focus, responsive; kurangi overrides | web/src/styles/tokens.css, base.css, layout.css, components.css |
| Shell | web/src/components/AppShell.tsx | Header, sidebar, dock, sticky offsets, layout full-width | WorkspaceLayout, WorkspaceHeader, Navigation |
| Beranda | web/src/components/screens/HomeScreen.tsx | Adaptive content grid, next action, no wasted space | StatCard, QuickActionGrid, GettingStarted |
| Builder | web/src/components/screens/ProfileScreen.tsx | Content/Design tabs, inspector, editing affordance, no data reset | BuilderLayout, BlockList, StyleInspector |
| Preview publik | web/src/components/LivePhonePreview.tsx, shared/renderBioPage.ts, shared/renderBusiness.ts | Parity checks, iframe scaling/resizing, preserve public themes | PreviewFrame + SSR fixture tests |
| Link manager | web/src/components/screens/LinksScreen.tsx, components/sheets/AddLinkSheet.tsx | Toolbar responsif, empty state, form validation, delete confirmation | LinkToolbar, LinkCard |
| Statistik | web/src/components/screens/StatsScreen.tsx | Chart layout, accessible bar labels, loading/no data, CSV | AnalyticsGrid, EmptyAnalytics |
| Business/Affiliate | web/src/components/business/BusinessModePanel.tsx, BusinessBlockSheet.tsx | Simplify catalog editing, polish errors, preserve validation | BusinessEditorLayout |
| Account & auth | web/src/components/screens/AccountScreen.tsx, sheets/LoginSheet.tsx, SaveAccountSheet.tsx, DeviceTransferSheet.tsx | Fokus, grouping settings, session flows | SettingsSection |
| Dialog/Select | web/src/components/Sheet.tsx, Select.tsx, ConfirmDialog.tsx | Focus trap, escape, overflow, mobile keyboard behavior | Shared interaction test fixtures |
| QA & CI | .github/workflows/verify.yml, web/package.json | Add visual, functional, a11y and performance checks | web/playwright.config.ts, web/e2e/*, .github/workflows/ui-qa.yml |

Gunakan file baru hanya bila benar-benar menurunkan kompleksitas. Migrasikan CSS sedikit demi sedikit: jangan mengubah index.css dan semua screen secara serentak.

## 5. Database dan API

**P0/P1/P2: tidak memerlukan migrasi database maupun endpoint API baru.** Semua perubahan styling, layout, state tampilan dan pengelompokan UI memakai kontrak sekarang:

| Tindakan UX | API existing | Storage/kontrak |
| --- | --- | --- |
| Mulai sebagai tamu | POST /api/auth/guest | users + bio_profiles default |
| Masuk / simpan akun | /api/auth/send-otp, /api/auth/verify-otp, /api/auth/me dan handoff | users, auth_challenges, sesi lokal |
| Ambil/edit halaman | GET /api/bio-profile, PUT /api/bio-profile | bio_profiles; theme, style JSON, business JSON |
| Daftar/tambah/edit/hapus link | GET/POST /api/links, PATCH/DELETE /api/links/:id | links dan block_type/data_json |
| Ubah urutan | PUT /api/links/reorder | links.sort_order |
| Pilih preset industri | POST /api/business/preset | business settings existing |
| Unggah media | POST /api/media/:type | R2 dan validasi existing |
| Performa | GET /api/analytics/summary?range=7d atau 30d | agregat D1, export CSV client-side |

Aturan: dilarang menyimpan draft UI anonim ke D1 hanya untuk persisting tab; cukup local state/localStorage dengan namespace per sesi. Jangan mengubah schema.sql atau mengulang migrasi produksi 0001-0003 untuk redesign ini. Jika di masa depan diperlukan versi draft/publish, template tersimpan, atau revision history server-side: ajukan RFC terpisah dengan migrasi D1 bernomor baru, API contract tests, backup dan rollback.

## 6. Fase implementasi / urutan PR

| PR | Cakupan | Dependensi | Kriteria merge |
| --- | --- | --- | --- |
| UX3-00 | Audit screenshot baseline + Playwright + fixture mock; daftar konflik CSS | Tidak ada | Tes browser bisa dijalankan di CI dan menghasilkan artifacts |
| UX3-01 | Hilangkan inline dark HTML; token/base CSS; perbaikan cascade, fokus dan kontras | 00 | Welcome dan semua screen existing tidak regresi di 320-1920 |
| UX3-02 | Satukan Welcome dan LandingPage; product preview dengan label demo; guest entry flow | 01 | Root, login, goal picker, errors, SEO dan I18n lulus E2E |
| UX3-03 | AppShell, Home, Links dan Stats responsive layout | 01, 02 | Header rapat, no overflow, tombol tidak terpotong, data benar |
| UX3-04 | Profile builder + sheet + preview desktop/mobile | 03 | Autosave, drag/keyboard reorder, upload, theme & SSR parity lulus |
| UX3-05 | Business/Affiliate, Account, modal/select, error/empty/loading | 04 | Edit katalog, OTP, device transfer dan keyboard lulus |
| UX3-06 | Audit a11y/perf, observability, screenshot approval, cleanup CSS | Semua | Semua release gates dan smoke production lulus |

Setiap PR harus kecil, menyertakan before/after screenshot minimal desktop dan mobile, serta catatan risk/rollback. Hindari PR yang mengubah CSS global dan backend sekaligus.

## 7. Acceptance criteria desain

- Tidak ada document horizontal overflow pada lebar 320, 360, 375, 390, 768, 1024, 1280, 1440, 1920px. Uji zoom browser 200% juga.
- Kontras WCAG AA: teks normal >=4.5:1, teks besar >=3:1, elemen nonteks penting >=3:1.
- Kontrol utama nyaman disentuh (target kira-kira >=44x44px), fokus keyboard selalu terlihat; tab/enter/escape dapat dipakai.
- Modal/sheet menjaga fokus dan mengembalikannya saat ditutup; tidak ada scrolling body yang terkunci setelah dialog ditutup.
- Layout memenuhi viewport dengan container query/grid responsive; content tidak memanjang melampaui kapasitas baca.
- Tidak ada konten gelap di halaman light, tidak ada FOUC/flash gelap dari inline HTML.
- Reduced motion dihormati. Tidak ada animasi yang mengganggu.
- Data user ID/EN tetap terbaca; UI default ID dan EN tidak overflowing.
- Preview iframe sama dengan output SSR profil publik untuk theme dan business fixtures; tema existing tidak diubah.
- Tidak menambah third-party analytics/tracking pada halaman publik.

## 8. QA otomatis dan manual

### 8.1 Tools / file

- Tambah Playwright sebagai dev dependency web untuk browser test + visual baseline (Chromium, Firefox, WebKit bila infrastrukturnya mendukung).
- Tambah E2E pada web/e2e: welcome.spec.ts, shell.spec.ts, builder.spec.ts, links.spec.ts, stats.spec.ts, auth.spec.ts, public-parity.spec.ts, release-smoke.spec.ts.
- Tambah accessibility scan berbasis axe/playwright untuk screen kunci; tes manual screen reader tetap wajib.
- Tambah web/package.json scripts: test:e2e, test:visual, test:a11y, test:smoke.
- Tambah workflow ui-qa.yml: npm ci, npm run build, install browser, start server fixture, jalankan tes, upload artifact screenshot/trace/test report. Jangan masukkan token production.

### 8.2 Matriks state dan browser

| Layar | State minimal | Browser/viewport |
| --- | --- | --- |
| Welcome dan landing | ID/EN, pilihan creator/business/affiliate/shortlink, gagal guest | Chromium 320/390/768/1280/1440; WebKit mobile |
| Home | Guest / claimed, profil kosong / berisi | Chromium 390/1024/1440 |
| Halaman/Builder | Empty, >10 blocks, design variants, preview, simpan gagal/retry | Chromium 320/390/1024/1440; WebKit |
| Links | 0/1/50 links, pencarian tidak ada hasil, filter, sort, toggle, delete | Chromium 390/768/1440 |
| Stats | 0 data, 7d/30d, top link, negara, CSV | Chromium 390/1440 |
| Account/Sheets | OTP error, login, save account, device transfer, Escape/Tab | Chromium 320/390/1024 |
| Publik | Tema lama, tema terang, business catalog, affiliate disclosure, image/gallery | Chromium 320/390/1280 |

Mock/staging harus deterministik: font pinned/self-hosted atau wait for document.fonts.ready, data fixture tetap, waktu/locale tetap, animasi dimatikan saat screenshot. Simpan baseline screenshot di repo hanya setelah disetujui secara visual.

### 8.3 Regresi fungsional wajib

1. Guest -> pilih tujuan -> POST guest -> editor/link yang tepat -> simpan akun -> OTP -> refresh / pindah perangkat.
2. Tambah blok, edit, duplikat, nonaktif/aktif, reorder, hapus, dan tidak kehilangan profil setelah network latency/failure.
3. Ubah tema, avatar, wallpaper, background, katalog; refresh; halaman publik tetap sama dengan preview.
4. Pembuatan shortlink -> redirect ke tujuan -> hitung klik -> rentang statistik -> ekspor CSV.
5. Modal/select, shortcut keyboard, Back/Forward, hash switching, i18n ID/EN, R2 upload, mobile keyboard/safe-area.
6. No crash/no console error, 0 overflow, tidak ada gambar/font hilang.

## 9. Deploy Cloudflare + rencana rollback

### 9.1 Preview branch

1. PR -> GitHub Actions build + Worker test + E2E/visual/a11y.
2. Cloudflare Pages otomatis membuat preview deployment untuk branch non-main. Pastikan preview host tidak diarahkan oleh logic isLegacyHost di web/src/main.tsx ke production.
3. Untuk test browser yang memakai data, jalankan fixture mock lokal atau staging Worker dengan D1/KV/R2 terisolasi; jangan menulis ke data production dari preview.
4. Uji perbandingan screenshot bersama manusia; approve baseline dahulu. Gunakan report + trace bila gagal.
5. Pastikan URL preview benar-benar menampilkan commit/asset hash PR, bukan hasil redirect 1stdev.link.

### 9.2 Production

1. Merge PR hanya setelah quality gates hijau dan visual approval.
2. Cloudflare Pages config: repo algiarts/1stdev.link, branch main, root web, build npm ci && npm run build, dist output.
3. Tunggu Cloudflare deployment status success; catat commit SHA, deployment ID, preview URL dan asset hashes.
4. Tes Pages production host: / HTTP 200, JS/CSS 200, UI light, root goal picker benar.
5. Tes domain 1stdev.link + www pada browser nyata (incognito, normal, mobile) dan GET /@handle, GET /:slug, GET /health, GET /api/auth/me tanpa kredensial (401 yang diharapkan). Jangan mengasumsikan status Pages memastikan Worker/domain sudah benar.
6. Jika automated GET ke 1stdev.link menjadi Cloudflare 403: periksa Security Events/challenge dan lakukan validasi browser yang sah; jangan mematikan WAF global untuk meloloskan smoke test.
7. Pantau error 4xx/5xx, Cloudflare Worker requests, Pages deployment status serta user reports selama release verification.
8. Deploy ulang Worker hanya jika source Worker atau route berubah; ini langkah terpisah yang memerlukan test Worker, validasi D1, dan pemeriksaan binding/secrets.

### 9.3 Rollback

- Simpan deployment Pages terakhir yang terbukti stabil. Jika UI regresi, rollback/promote versi Pages sebelumnya melalui Cloudflare (atau revert commit dan deploy main), kemudian ulang smoke checks.
- Rollback tidak menyentuh D1 selama UI-only phases.
- Jika perubahan Worker memang diperlukan: simpan versi Worker terakhir dan lakukan rollback Worker sendiri, jangan menyamakan rollback Pages dengan rollback backend.
- Pasca rollback, dokumentasikan root cause dan tambahkan screenshot regression test untuk kasus itu.

## 10. Quality gate / Definition of Done

- [ ] Satu homepage kanonis; Welcome/Landing tidak menggandakan UX.
- [ ] Tidak ada inline dark body/style yang merusak UI light.
- [ ] Variabel/token design terpusat; unused/duplicate rules dibersihkan secara terukur.
- [ ] Full-width adaptif tanpa overflow pada seluruh ukuran target.
- [ ] Kontras, fokus, keyboard, modal, accessibility review lulus.
- [ ] Semua hasil desain memiliki before/after screenshot dan persetujuan visual.
- [ ] Cypress/Playwright-equivalent E2E dilakukan di browser, bukan cuma TypeScript build (rencana memilih Playwright).
- [ ] Flow onboarding, OTP, builder, profile public, link dan analytics lulus.
- [ ] SSR dan preview konsisten untuk fixture tema/business.
- [ ] Worker typecheck/tests, web build, visual test & a11y lulus di CI.
- [ ] Deployment Cloudflare Pages terverifikasi, asset hash cocok, domain Worker smoke selesai.
- [ ] Rollback teruji/didokumentasikan dan tidak ada perubahan database yang tidak perlu.

## 11. Hal yang tidak termasuk UX 3.0

Tidak mencakup pembayaran, draft/publish backend, scheduler link, lead inbox, custom domain user, AI agent, kolom D1 baru, atau perubahan tracking pengunjung. Semua itu perlu RFC fitur dan privacy/security review masing-masing. Fase ini khusus kualitas dan navigasi, bukan ekspansi fitur produk.

## 12. Titik keputusan sebelum mulai coding

1. Canonical homepage: disarankan gabungkan marketing + goal picker sebagai satu Welcome di /; simpan /landing hanya sebagai preview sementara.
2. Layout builder desktop: 2 kolom pada 1024-1439; inspector ketiga hanya pada >=1440 jika snapshot membuktikan ada ruang.
3. CI screenshots: baseline ditetapkan dari desain yang disepakati; screenshot perubahan harus di-review, tidak di-update otomatis.
4. QA staging: gunakan fixtures dan Worker staging terisolasi untuk tes mutasi, tidak langsung ke production.
5. Strategi deploy: docs/plan ini tidak deploy; implementasi selalu melalui PR terpisah, small batch, dengan Cloudflare Pages preview dan rollback plan.
