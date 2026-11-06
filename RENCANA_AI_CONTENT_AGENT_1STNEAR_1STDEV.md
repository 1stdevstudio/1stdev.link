# Rencana Proyek — AI Content Agent untuk 1stnear.com dan 1stdev.link

**Versi:** 0.1 (perencanaan, belum diimplementasikan)  
**Tanggal acuan:** 29 Oktober 2026  
**Pemilik:** pengembang kedua brand  
**Nama kerja:** Brand Content Agent  
**Status:** Usulan desain untuk ditinjau sebelum Codex membuat proyek baru.

## 1. Tujuan

Membangun **satu sistem pengelolaan konten** untuk dua brand yang berbeda:

- **1stnear.com:** SaaS POS/aplikasi kasir; audiens utama pemilik usaha.
- **1stdev.link:** layanan gratis bio link, shortlink, katalog, dan informasi usaha; audiens kreator dan UMKM. Boleh sesekali menjelaskan hubungan kedua produk, tetapi jangan mengubah 1stdev.link menjadi sekadar kanal iklan POS.

Sistem menyusun **kalender satu minggu sekaligus**, membuat ide/materi/caption sesuai brand, lalu menjadwalkan distribusi ke Instagram, Threads, dan TikTok menurut kemampuan API masing-masing. **Satu ide konten diadaptasi menjadi format berbeda untuk tiap platform**, bukan wajib mengunggah berkas yang sama.

### Volume yang disepakati

- Maksimal **3 ide/konten utama per hari secara total**, bukan per akun.
- Setiap konten bisa menghasilkan hingga **3 publikasi** (Instagram, Threads, TikTok): maksimum teoritis 9 publikasi/hari jika semua kanal siap dan diotorisasi.
- Awali uji coba dengan **1 konten utama per hari**.
- Brand dipilih per hari atau per slot; jika hari itu dipilih 1stnear, generator tidak memasukkan promosi 1stdev kecuali ada instruksi eksplisit.
- Zona waktu jadwal untuk pengguna: **Asia/Jakarta (WIB)**, disimpan sebagai UTC di database.

### Contoh kalender awal (hanya usulan; bisa diubah)

| Hari | Fokus | Konten utama | Distribusi |
|---|---|---|---|
| Senin | 1stnear | Masalah pencatatan penjualan UMKM | Instagram + Threads; TikTok manual |
| Selasa | 1stdev | Demo membuat halaman bio gratis | Instagram + Threads; TikTok manual |
| Rabu | 1stnear | Demo alur kasir nyata, tanpa klaim fitur yang belum ada | Instagram + Threads; TikTok manual |
| Kamis | 1stdev | Demo katalog dan informasi usaha | Instagram + Threads; TikTok manual |
| Jumat | 1stnear | Edukasi operasional toko | Instagram + Threads; TikTok manual |
| Sabtu | 1stdev | Cerita pembangunan produk dengan bantuan AI | Instagram + Threads; TikTok manual |
| Minggu | Evaluasi | Analisis dan susun draft minggu depan | Tidak wajib posting |

**Pola mingguan bukan aturan permanen.** Admin bisa memindahkan slot, membatalkan posting, dan mengutamakan brand tertentu pada hari yang dipilih.

## 2. Batasan dan keputusan platform

| Kanal | Rencana MVP | Prasyarat/pembatas |
|---|---|---|
| Instagram | Jadwalkan **foto/feed** yang sudah siap; dukung Reels saat pipeline video matang | Gunakan **akun profesional** (Business/Creator), Meta app, OAuth, izin publikasi. Pilih jalur **Instagram Login** atau **Facebook Login** secara eksplisit; persyaratannya berbeda. Media yang dipublikasikan via URL harus bisa diakses Meta selama proses unggah. |
| Threads | Jadwalkan teks, dan jika diperlukan lampiran media | Meta app dengan Threads use case, OAuth, scope seperti `threads_basic` dan `threads_content_publish`; tangani token kedaluwarsa dan rate limit. |
| TikTok | **Export paket siap unggah + notifikasi/pengingat manual** | Tidak menjanjikan auto-post publik di MVP. TikTok Direct Post belum diaudit membatasi visibilitas, dan pedomannya menyatakan tool internal untuk akun sendiri bukan intended use. Kelak evaluasi ulang hanya jika benar-benar sesuai aturan dan memperoleh izin. |

**Catatan:** Akun dan izin Meta yang benar-benar tersedia belum diverifikasi. Pengujian publikasi hanya dilakukan setelah pemilik menghubungkan akun dan menyetujui akses. Tidak memakai bot browser, scraping sesi, cookie, atau cara yang melanggar aturan platform sebagai jalan pintas.

## 3. Batas scope MVP

### Masuk MVP

1. **Dashboard admin tunggal** untuk memilih brand dan melihat status akun media sosial.
2. **Brand profile terpisah:** deskripsi produk, USP, audiens, gaya bahasa, tautan CTA, larangan klaim, visual kit, dan topik.
3. **Kalender mingguan:** drag/reschedule sederhana, slot WIB, prioritas brand, batas maksimal 3 konten utama/hari.
4. **AI brief & caption:** input tujuan → ide → hook → skrip pendek/storyboard → caption IG/TikTok/Threads → hashtag opsional → CTA relevan.
5. **Library media:** unggah gambar/video yang sudah ada; versi konten per platform; berkas di R2 dengan metadata di D1.
6. **Review/approval satu minggu:** konten berstatus draft sampai disetujui; hanya konten berstatus scheduled + approved yang boleh diterbitkan.
7. **Posting resmi Instagram/Threads** setelah akun terkoneksi dan izin valid; TikTok tetap manual dengan paket ekspor.
8. **Riwayat publikasi, retry terkendali, status error, notifikasi dan pause semua posting.**
9. **Batas biaya AI dan batas jumlah output per hari** agar tidak ada tagihan tak terduga.

### Di luar MVP

- Membuat video berkualitas tinggi sepenuhnya otomatis dengan rendering berat di Worker.
- Jaminan auto-post TikTok publik tanpa audit/izin.
- Otomatis membalas DM/komentar, membeli iklan, scraping tren, mengakses akun tanpa OAuth.
- Mengubah kode aplikasi produksi 1stnear.com atau 1stdev.link.
- Membuat SaaS multi-tenant untuk dijual ke publik. Ini terlebih dulu **tool internal satu admin**.

## 4. Arsitektur yang diusulkan

Proyek **terpisah** dari repo `edgelink` dan repo POS. Contoh nama repo baru `brand-content-agent` (pilih lokasi lokal saat implementasi).

- **Frontend:** Vite + React + TypeScript + Tailwind + lucide-react (dashboard mobile-first).
- **API/serverless:** Cloudflare Workers + Hono + TypeScript.
- **DB:** Cloudflare D1, **database baru khusus agent**, tidak memakai `edgelink-db`.
- **Media:** Cloudflare R2, **bucket baru khusus agent**, tidak memakai `edgelink-media`.
- **Scheduler:** satu Cron Trigger (misalnya setiap 5 menit) memeriksa posting yang jatuh tempo; penyimpanan waktu UTC, tampilan WIB.
- **Proses jobs:** D1 dengan klaim job atomik dan retry. Cloudflare Queues opsional jika volume/reliabilitas memerlukannya; verifikasi kuota sebelum aktivasi.
- **AI:** adapter provider/API model yang bisa dikonfigurasi. **Codex digunakan untuk membangun/memelihara sistem**, bukan diasumsikan otomatis menjadi mesin inferensi produksi yang selalu aktif. Biaya model dan layanan render terpisah.
- **Akun/platform:** Instagram Publishing API + Threads API melalui OAuth resmi, TikTok paket ekspor manual.
- **Auth:** akses terbatas untuk pemilik, session aman, CSRF protection; token OAuth terenkripsi at-rest memakai kunci rahasia dari Workers Secrets; **tidak masuk ke frontend/log**.

Alur konseptual:

```text
Admin pilih brand & rencana mingguan
  -> AI menyusun brief, skrip, caption dan usulan aset
  -> Admin meninjau/mengunggah atau menyetujui media
  -> Kalender (approved + scheduled)
  -> Cron di Workers memeriksa posting jatuh tempo
  -> Klaim job atomik di D1
  -> Instagram / Threads: API resmi -> verifikasi hasil -> catat ID posting
  -> TikTok: export manual + notifikasi -> tandai selesai setelah konfirmasi
  -> Dashboard status + audit log + evaluasi
```

**Pemisahan penting:** membuat naskah, membuat aset media, dan menerbitkan posting adalah tiga komponen berbeda. Kegagalan satu komponen tidak boleh dianggap sukses oleh komponen lain.

## 5. Model data minimum

- `brands`: ID, nama, deskripsi, CTA, tone, aturan, identitas visual.
- `social_accounts`: brand_id, platform, account_id, status koneksi, scope, token terenkripsi, expiry, health check.
- `content_ideas`: brand_id, judul, tujuan, target, referensi yang diverifikasi, status persetujuan.
- `content_variants`: idea_id, platform, hook, caption, hashtags, media_refs, versi prompt/model, status.
- `assets`: path R2, tipe MIME, ukuran, dimensi/durasi, lisensi/sumber, checksum.
- `calendar_slots`: brand_id, tanggal WIB, waktu UTC, urutan slot (1–3), content_idea_id, status.
- `publish_jobs`: variant_id, social_account_id, scheduled_at_utc, status, attempts, unique idempotency key, provider_post_id, error_code, retry_at.
- `audit_events`: actor, aksi, waktu, ID objek, ringkasan tanpa token/PII.

Gunakan indeks untuk query jatuh tempo; unique constraint untuk mencegah publikasi ganda dari satu kombinasi **slot + platform + akun + versi**. Implementasikan transisi status secara atomik dan hati-hati terhadap retry ketika respons provider tidak pasti (cek hasil sebelum mencoba ulang).

### State machine minimum

`draft -> needs_review -> approved -> scheduled -> publishing -> published`

Cabang: `needs_asset`, `failed_retryable`, `failed_permanent`, `manual_required`, `cancelled`, `paused`. **Tidak boleh menganggap status `publishing` berarti sudah terpublikasi.** Untuk posting TikTok manual, status `manual_required` berubah menjadi `published_manual` hanya setelah konfirmasi.

## 6. Tahap implementasi berurutan

### Fase 0 — Persiapan dan keputusan akses

- Buat repo/Cloudflare resources baru; tidak menyentuh repo atau deployment produk yang sudah live.
- Periksa jenis akun IG dan Threads, proses pembuatan Meta App, scope, review/access level, serta kemampuan akun mengakses API.
- Tentukan provider AI dan anggaran maksimum; pilih apakah media awal berupa upload manual/template atau memakai generator berbayar.
- Tetapkan aturan editorial: jangan mengarang klaim fitur, harga, atau statistik pelanggan; jelaskan bahwa konten tertentu dibuat dengan bantuan AI bila relevan.

**Kriteria lulus:** kredensial tersimpan aman (tanpa bocor di log), kebutuhan API diketahui, dan batas anggaran disetujui.

### Fase 1 — Fondasi dashboard

- Setup React, Worker, D1, R2, auth satu admin.
- Buat brand profiles, konten draft, library media, kalender mingguan dan batas slot harian.
- Tampilkan WIB; simpan UTC; sediakan tombol pause global.

**Kriteria lulus:** pemilik bisa membuat/edit kalender tujuh hari; dua brand tidak tertukar; semua perubahan tersimpan tanpa posting eksternal.

### Fase 2 — Pembuatan konten dan approval

- AI adapter menghasilkan output terstruktur (brief, caption tiap platform, storyboard, CTA dan sumber fakta).
- Templating visual dasar atau impor media yang telah disiapkan; validasi format per platform.
- Review teks/media, regenerate terkontrol, approval per konten, pelacakan versi dan biaya.

**Kriteria lulus:** satu ide 1stnear dan satu ide 1stdev menghasilkan materi sesuai brand dan tidak otomatis terbit sebelum disetujui.

### Fase 3 — Integrasi Meta dan scheduler

- OAuth resmi Threads dan Instagram; penyimpanan dan rotasi/refresh token; cek scope dan health akun.
- Alur upload/create container, polling bila diperlukan, publish, verifikasi ID/url hasil, rate limiting dan retry.
- Cron terjadwal dengan klaim job atomik, idempotensi, observabilitas, dry-run, dan error alert.

**Kriteria lulus:** satu posting **uji yang disetujui** berhasil di masing-masing kanal pada akun tes, tidak dobel walaupun Cron/retry terulang, dan histori benar.

### Fase 4 — Paket TikTok manual, evaluasi dan hardening

- Ekspor video atau storyboard, caption, tag, thumbnail, dan tautan aset dari satu tempat; notifikasi tindakan manual.
- Laporan dasar: jumlah konten siap, scheduled, berhasil, gagal, dan dipublikasikan manual.
- Uji beban kecil, audit keamanan, recovery setelah API gagal, dan pemantauan biaya.

**Kriteria lulus:** kalender 7 hari dapat disetujui di awal minggu; sistem menjalankan posting otomatis pada platform yang didukung dan mengingatkan saat TikTok perlu tindakan manual.

## 7. Pengujian wajib

- Batas **maksimum 3 konten utama per tanggal WIB**; edit/tukar slot tidak melebihi kuota.
- Pemilihan brand per slot tidak membocorkan konten, CTA, atau token brand lain.
- Konversi WIB↔UTC, terutama pergantian hari dan eksekusi Cron yang terlambat.
- Dry-run tidak mengirim posting; persetujuan wajib; pause/resume; konten dibatalkan tidak diterbitkan.
- Idempotensi saat Cron overlap, timeout, koneksi putus, dan token expired.
- Validasi MIME, ukuran dan media sesuai syarat masing-masing platform; tidak menjalankan fetch URL arbitrer tanpa pembatasan.
- Pengamanan OAuth `state`, CSRF, session, enkripsi token, pembatasan log, kontrol akses endpoint.
- Status sukses hanya muncul setelah respons dan verifikasi ID dari provider; gagal tidak menghilangkan draft/media.
- Budget cap dan alarm kuota API/infrastruktur; no silent paid upgrade.

## 8. Risiko dan batasan operasional

1. **Meta App dan permission** bisa membutuhkan konfigurasi, review, dan otorisasi yang berbeda menurut account type dan cara login; integrasi tidak dijamin sampai diuji.
2. **TikTok** tidak boleh dipaksa auto-publication lewat bot/cookie. Untuk tool internal ini, jalur aman MVP adalah ekspor manual.
3. **Cloudflare Cron dijalankan UTC**, bukan WIB. Worker Free memiliki batas CPU dan jumlah Cron; arsitektur ini harus diuji terhadap limit aktual.
4. **Produksi video** mungkin memerlukan tool/service tambahan. Hindari memproses encoding video berat di request Worker.
5. **Gratis tidak berarti tanpa batas:** kuota Cloudflare (termasuk D1), penyimpanan, model AI, dan pemrosesan media bisa menghasilkan biaya atau penghentian sementara. Terapkan budget cap dan monitoring sebelum auto-post.
6. Konten AI membutuhkan pemeriksaan fakta dan kualitas. Jangan mengklaim pengguna aktif, testimonial, fitur POS, atau harga yang belum diverifikasi.

## 9. Definisi MVP berhasil

- Dashboard terpisah berfungsi untuk **dua brand** dan bisa mengelola jadwal **7 hari**.
- Pembuatan/penyesuaian caption per platform bekerja; media dapat dilampirkan.
- **Satu konten per hari** selama masa pilot terbit pada Instagram/Threads yang sudah diotorisasi; TikTok memperoleh paket manual.
- **Tidak ada publikasi tanpa approval**, tidak ada posting dobel, kegagalan tercatat dan bisa diulang secara aman.
- Batas tiga konten utama per hari tersedia untuk peningkatan volume kelak.
- Data dan infrastructure proyek 1stnear dan 1stdev tetap tidak berubah.
- Konfirmasi pemilik diperlukan sebelum deployment atau koneksi API produksi.

## 10. Prompt awal untuk Codex (saat siap mulai implementasi)

> Buat proyek baru terpisah bernama `brand-content-agent` berdasarkan dokumen RENCANA_AI_CONTENT_AGENT_1STNEAR_1STDEV.md. Jangan menyentuh repo `edgelink` atau repo `1stnear`. Mulai dari Fase 0 dan Fase 1 saja. Gunakan Vite/React/TypeScript/Tailwind untuk dashboard; Cloudflare Workers/Hono, D1 database BARU, R2 bucket BARU, dan Cron yang belum diaktifkan di produksi. Buat satu admin dengan auth aman, brand profiles terpisah, kalender WIB maksimal 3 konten utama/hari, draft+approval, upload media, audit log, validasi input, dan tes otomatis. Jangan menanam token, mengambil kredensial, mengakses akun media sosial, deploy, atau membeli layanan tanpa izin. Tampilkan diff dan hasil tes. Desain mobile-first, zero decorative border/shadow. Untuk fase berikutnya, tulis adaptor Instagram/Threads dengan API resmi dan TikTok manual export; jangan mengimplementasikan login bot TikTok.

## 11. Sumber teknis yang dicek pada 29 Oktober 2026

- Cloudflare Cron UTC: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 free tier limit enforcement: https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Instagram API, dokumentasi resmi Meta melalui Postman: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- Threads API, dokumentasi resmi Meta melalui Postman: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- TikTok Content Sharing Guidelines: https://developers.tiktok.com/docs/en/content-sharing-guidelines

**Status akhir dokumen:** hanya rencana. Belum ada repo dibuat, kode ditulis, akun dihubungkan, atau posting dijadwalkan.
