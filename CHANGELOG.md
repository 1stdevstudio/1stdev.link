# Changelog

Semua perubahan penting pada EdgeLink by 1stnear.com dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi mengikuti [SemVer](https://semver.org/lang/id/).

- Live: https://link.1stnear.com
- Pages: https://edgelink-afl.pages.dev
- Desain: https://edgelink-design.pages.dev

## [0.6.1] - 2026-10-28

Tata letak baru untuk editor profil (profile builder).

### Diubah
- Editor profil kini berbentuk studio: kartu identitas besar (foto, nama, handle, bio) dengan aksi Bagikan, Salin, Buka, Ubah dalam satu baris.
- Tab tetap di atas: **Isi**, **Tampilan**, dan **Pratinjau** (Pratinjau hanya di ponsel; layar lebar memakai kolom pratinjau samping).
- Baris blok baru: ikon berwarna per jenis, label jenis, domain tujuan, jumlah klik, tombol geser naik/turun, dan hapus.
- Pilihan tema tampil sebagai mockup ponsel mini sesuai warna aslinya; nama tema kini dwibahasa (Paper, Forest, Dusk, Ocean, Sand).
- Pilihan bentuk foto menampilkan bentuk sebenarnya.

### Diperbaiki
- Geser urutan blok sebelumnya tidak berpengaruh: urutan di editor, pratinjau, dan halaman publik kini sama (berdasarkan `sort_order`), dan hanya blok profil yang dikirim ke server.
- Pratinjau ponsel memakai bentuk foto bulat sebagai bawaan, sama dengan halaman publik.

## [0.6.0] - 2026-10-28

Panel baru tanpa sidebar dan versi bahasa Inggris penuh.

### Ditambahkan
- Bahasa Inggris untuk seluruh aplikasi: layar, sheet, toast, pesan error, ketentuan & privasi, dan 30 template blok (judul serta pesan awal ikut diterjemahkan).
- Tombol ID/EN di header (desktop), layar Welcome, dan halaman Akun. Bahasa terdeteksi otomatis dari perangkat dan diingat; `<html lang>` dan judul tab ikut berubah.
- Menu "Buat" satu pintu: Tambah isi profil atau Pendekkan link.
- Bagian bahasa Inggris di konten statis landing, `llms.txt`, dan `llms-full.txt`.

### Diubah
- Navigasi: sidebar diganti header dengan tab tengah (desktop) dan dock melayang dengan tombol + di tengah (mobile/tablet). Akun dibuka lewat avatar di header.
- Pratinjau ponsel tampil sebagai kolom samping hanya di tab Profil (layar lebar).

### Diperbaiki
- `I18nProvider` sebelumnya tidak pernah dipasang sehingga pengalih bahasa tidak berfungsi.

## [0.5.0] - 2026-10-27

SEO dan GEO (Generative Engine Optimization): mudah ditemukan Google dan dikutip mesin jawab AI.

### Ditambahkan
- `/robots.txt` dari worker: izinkan semua halaman publik, blokir `/api/`, grup eksplisit untuk mesin jawab AI (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User, DuckAssistBot, MistralAI-User), plus baris `Sitemap:`.
- `/sitemap.xml` dinamis: halaman utama, `/docs`, dan semua profil `/@handle` akun email yang punya minimal satu link aktif, dengan `lastmod`. Disimpan di cache edge 1 jam (tanpa tulis KV).
- Halaman bio SSR: meta description otomatis (bio atau ringkasan link teratas), canonical, robots, Open Graph `profile`, kartu Twitter, apple-touch-icon, dan JSON-LD `ProfilePage` + `Person` (`sameAs` dari tautan sosial, `significantLink`, `dateModified`).
- Profil tamu bawaan (`edge_xxx`) dan profil kosong diberi `noindex, follow` dan tidak masuk sitemap (hindari thin content).
- Landing: judul dan deskripsi berbahasa Indonesia, canonical, Open Graph + `og.png` 1200x630, JSON-LD `@graph` (Organization 1stnear.com, WebSite, WebApplication gratis, FAQPage).
- Konten statis di `#root` (hero, fitur, FAQ) untuk crawler AI yang tidak menjalankan JavaScript; React menggantinya saat aplikasi dimuat.
- `llms.txt` dan `llms-full.txt` (format llmstxt.org) berisi fakta produk dan FAQ untuk dikutip AI.
- Ikon PWA (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) dan `site.webmanifest`.
- Header `X-Robots-Tag: noindex, nofollow` pada semua respons `/api/`.

### Diubah
- Klik dari bot, crawler, dan pengambil pratinjau link (WhatsApp, Telegram, Discord, dll.) tidak lagi dihitung di statistik.

### Keamanan
- Ikon sosial di halaman bio hanya merender URL `http(s)` dan `mailto:`; skema lain (mis. `javascript:`) diabaikan.

### Catatan
- Crawler pelatihan AI (GPTBot, ClaudeBot, Google-Extended, CCBot, dll.) diblokir oleh pengaturan robots.txt terkelola di level zona 1stnear.com. Mesin jawab AI tetap diizinkan.

## [0.4.0] - 2026-10-27

Identitas 1stnear.com dan edit blok tanpa hapus-pasang.

### Ditambahkan
- Edit blok bio langsung di tempat: judul, link tujuan, gaya tombol (Biasa/Sorotan/Video), nomor dan pesan WhatsApp. Hapus butuh dua ketukan. (`3184396`)
- `PATCH /api/links/:id` menerima `title`, `destination_url`, `block_type` dalam satu UPDATE atomik dengan isolasi tenant, validasi SSRF (422) dan sinkronisasi KV slug serta cache bio. (`3184396`)
- Kode OTP login kini terkirim ke inbox email lewat Resend. (`e88a91f`)
- Tema bio baru "1stNear" dan menjadi tema bawaan untuk akun tamu maupun email. (`fc52bd4`)

### Diubah
- Nama produk jadi "EdgeLink by 1stnear.com" di seluruh UI, judul halaman, meta, dan footer bio. Penyebutan vendor dihapus dari UI. (`5b53be1`)
- Palet disamakan dengan 1stnear.com: latar hijau hutan `#0e1f1b`, aksen emas `#e9be54`, teks di atas emas `#182822`. Favicon, `theme-color`, dan warna seleksi ikut emas. Semua kontras lolos WCAG AA. (`fc52bd4`)
- Tema lama atau tak dikenal (mis. `minimal-dark`) otomatis jatuh ke tema 1stNear. (`fc52bd4`)
- Teks bio bawaan akun tamu baru: "Semua link saya ada di sini." (`fc52bd4`)

### Diperbaiki
- Error CSP di konsol: skrip analytics yang disisipkan otomatis di level zona kini dicegah lewat `Cache-Control: no-transform` pada semua respons HTML. Tanpa melonggarkan CSP. (`502279b`)

### Catatan
- Profil tamu lama masih menyimpan teks bio lama. Pengguna bisa mengubahnya sendiri; migrasi data belum dijalankan.

## [0.3.0] - 2026-10-27

Domain sendiri dan sinkronisasi halaman publik.

### Ditambahkan
- Domain kustom `link.1stnear.com` terpasang ke worker; `BASE_URL` diperbarui. (`83aeadd`)
- Dashboard SPA dan asetnya disajikan langsung dari `link.1stnear.com` tanpa redirect. (`078f348`, `0224b31`)

### Diperbaiki
- Root mengarah ke dashboard; slug yang tidak ada jatuh ke handle bio. (`55c7ac1`)
- Halaman bio publik langsung mengikuti perubahan di dashboard (cache KV diinvalidasi). (`936edc0`, `b81e2ed`)
- Blok konten (judul bagian, teks, garis) boleh tanpa URL (`#`). (`936edc0`)
- Error saat menyimpan blok kini terlihat di UI. (`0224b31`)
- Fokus input tidak lagi dicuri timer auto-focus saat mengetik. (`b56a9b0`)

## [0.2.0] - 2026-10-27

Redesain dashboard dan editor bio v3.

### Ditambahkan
- Dashboard baru mengikuti prototype-v2. (`88af437`)
- Beranda: link profil, checklist, KPI, aksi cepat, link teratas dan terbaru. (`6c829b1`)
- 14 jenis blok bio: teks, garis, video, toko, lokasi, sosial, dan lainnya. (`b7f842b`)
- 30 template blok siap pakai di sheet "Tambah isi". (`c27fdb4`)
- Skema gaya editor bio v3 di worker dan footer SSR dua bahasa. (`a0d5e45`)
- Panel Link, Statistik, Akun diperbarui, plus strip "100% gratis" di Profil. (`0553c81`)
- Layar Profil sinkron langsung dengan pratinjau ponsel. (`12b37c0`, `e0e2482`)

### Diperbaiki
- Layout penuh di desktop dengan grid panel. (`6627fbd`)
- Semua panel, header, dan navigasi responsif di ponsel. (`7c6596b`)
- Tombol Simpan di sheet selalu terlihat (sticky). (`6d15752`)

## [0.1.0] - 2026-10-27

Rilis awal. (`452cdde`)

### Ditambahkan
- Link pendek dan halaman bio di edge (Workers + D1 + KV), biaya $0.
- Login tamu instan dan OTP email.
- Halaman bio SSR dengan escaping HTML, validasi SSRF, dan rate limit berbasis IP.
