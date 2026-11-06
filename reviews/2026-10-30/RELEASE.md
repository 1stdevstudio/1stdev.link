# Rilis redesign 1stdev.link — 30 Oktober 2026

Status: **sudah aktif di produksi dan diperiksa pada domain utama**.

| Komponen | Rilis |
| --- | --- |
| Aplikasi | https://1stdev.link |
| Worker | `83a96167-bf73-4d30-8b74-6fcc897ae80a` |
| Pages | https://0029d55f.edgelink-afl.pages.dev |
| Migrasi | `worker/migrations/0003_release_hardening.sql`, diterapkan sebelum deploy Worker |
| Gates akhir | Typecheck Worker, 92/92 tes, build Web, Wrangler dry-run, diff check lulus |

## Perubahan yang sudah tersedia

- Onboarding dan pengaturan tujuan **Creator, Usaha/UMKM, Affiliate**. Tujuan memberi saran blok dan dapat diubah tanpa mengganti isi halaman.
- Navigasi **Beranda · Halaman · Link · Statistik**; pengaturan tujuan dibuat ringkas agar daftar konten tetap mudah dijangkau.
- Editor katalog berupa daftar item, pencarian/filter kategori, satu editor item aktif, dan pengaturan katalog yang dapat dilipat.
- Foto katalog diperkecil dengan mempertahankan rasio, bukan dipotong menjadi avatar persegi.
- CTA per item: URL produk/referral atau pertanyaan WhatsApp; keterangan afiliasi opsional. Item tidak tersedia tidak menampilkan CTA, item tersembunyi tidak diterbitkan.
- Parameter referral disimpan tanpa penambahan UTM otomatis. Preview dan publik tetap memakai renderer yang sama.
- Ekspor statistik CSV dan QR lokal PNG/SVG. Generator QR dimuat saat dibutuhkan, tanpa layanan QR eksternal.

Untuk statistik per produk affiliate: buat shortlink menuju URL referral di menu **Link**, lalu gunakan shortlink tersebut sebagai URL tombol item katalog. URL yang langsung menuju marketplace tidak melewati penghitung shortlink. Klik bukan bukti transaksi, komisi, pengunjung unik, atau pesan WhatsApp terkirim.

## Tindak lanjut temuan review

| Temuan | Perbaikan yang dirilis |
| --- | --- |
| R01 — penghapusan ambigu | “Lepas dari halaman” hanya mengubah `is_bio_entry`; slug dan statistik dipertahankan. Penghapusan permanen mempunyai konfirmasi jelas. Belum ada recycle bin/soft delete. |
| R02 — limiter paralel | D1 UPSERT bersyarat menegakkan batas secara atomik. KV hanya menyimpan penolakan saat jatah habis; identitas key di-hash. Kegagalan penegakan menghasilkan respons terkontrol. |
| R03 — statistik top 10 | Endpoint ringkasan menghitung seluruh shortlink tenant pada rentang UTC yang dipilih; ranking ditampilkan terpisah dengan batas 20. |
| R04 — blok informasi menjadi shortlink | Halaman Link dan KPI hanya menghitung entri yang bisa diarahkan. |
| R05 — respons lama menimpa perubahan | Revision guard koleksi, antrean mutasi, dan perlindungan draft profil mencegah refresh lama mengganti perubahan yang lebih baru. |
| R06 — buffering upload | Stream dihentikan segera setelah melebihi 512 KiB untuk avatar atau 1 MiB untuk media lain. |
| R07 — kuota tidak konsisten | Pemeriksaan aplikasi dan trigger SQLite membatasi semua jenis link ke 100 per akun secara atomik. Data lama tidak dihapus; frontend memuat halaman lanjutan untuk akun lama. |
| R08 — SEO usaha | Katalog/informasi usaha yang valid dan berisi dapat memenuhi syarat indeks; guest dan konten kosong tetap dikecualikan. |
| R09 — crop katalog | Helper foto katalog tersendiri mempertahankan rasio dan membersihkan metadata lewat canvas. |
| R10 — write KV untuk 404 | Cache negatif berumur 30 detik berada di edge; tidak ada write `slug:nf:*` untuk URL acak. Slug lama satu/dua karakter tetap dapat diarahkan. |
| R11 — media tanpa referensi | Pemeriksaan referensi bertenant, masa tenggang 24 jam, satu pass berbatas per hari, dan cursor tersimpan. Dijalankan pada aktivitas berikutnya, bukan menghapus semua media sekaligus. |
| R12 — fokus dialog | Tab/Shift+Tab tetap di dalam konfirmasi; Escape membatalkan dan fokus kembali ke pemicu. |

Tambahan pemeriksaan integrasi memperbaiki perpindahan sesi: editor dikunci ketika menerima handoff atau belum mempunyai cache profil yang tepercaya; pergantian akun mereset data dan antrean. Draft gagal simpan dipertahankan untuk retry. Status statistik mengikuti respons ringkasan, bukan hanya cache daftar link.

## Bukti verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Native Worker | 92 tes lulus, 0 gagal, typecheck lulus |
| SQL konkuren | 40 percobaan, batas 5: tepat 5 diterima; kuota 99 + 8 insert paralel: total berhenti di 100 |
| Worker + D1/KV lokal | 11 shortlink, 66 klik; detach mempertahankan redirect dan 66 klik |
| Login lokal paralel | 40 request: 10 kredensial ditolak normal, 30 dibatasi, 0 error server |
| Browser lokal | Login fixture, katalog/referral, preview, detach, fokus dialog, CSV, QR SVG berhasil |
| Browser produksi | Editor baru termuat, QR lokal tampil, PNG berhasil diunduh, tidak ada overflow pada 390/1440 px |
| Layar kecil lokal | Editor 320/390 px tidak overflow |
| Aset produksi | Hash JS, CSS, dan chunk QR sama dengan build lokal; pemeriksaan ulang JS/CSS menghasilkan `X-Edge-Cache: HIT` dan `CF-Cache-Status: HIT` |
| Profil produksi | `@1stnear` 200, katalog lama tetap tampil, tanpa script executable publik |
| Sitemap | Query segar 200 XML dan memuat `@1stnear` |
| API tanpa izin/input salah | 9 pemeriksaan 400/401 sesuai kontrak; respons `no-store`, tanpa OTP preview |
| Domain | WWW dan domain lama 301 ke apex dengan path/query tetap |
| Scanner/aset hilang | `/.env` 403; aset tidak ditemukan 404 |

Tidak ada email OTP produksi yang dikirim untuk smoke test ini. Pengirim tetap `no-reply@otp.1stdev.link`. Data pengujian dibuat hanya di storage lokal terisolasi.

- [Pengujian native](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/worker-tests.log)
- [Smoke lokal](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/local-smoke.json)
- [Smoke produksi](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/production-smoke.json)
- [Cache dan sitemap](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/cache-seo-smoke.json)
- [Editor desktop live](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/live-editor-desktop.png)
- [Editor mobile live](/Users/spixelsdev/edgelink/reviews/2026-10-30/release-evidence/live-editor-mobile.png)

## Batas dan catatan operasional

- Sitemap memakai predicate SQL yang ringkas untuk data yang sudah divalidasi API; renderer tetap memvalidasi penuh. Data lama yang rusak secara manual dapat menjadi kandidat sitemap tetapi tetap mendapat `noindex` pada halaman.
- Belum dilakukan matriks Safari/iOS atau load test produksi. Tes konkuren dilakukan di lokal.
- Advisories tooling development Wrangler 3 dari audit awal belum ditangani melalui upgrade mayor pada rilis fitur ini. Audit awal dependensi produksi Worker dan seluruh dependensi Web tidak menemukan advisory; penambahan generator QR juga lolos audit instalasi.
- Draft/Publish, riwayat revisi, pencabutan sesi perangkat, komisi terverifikasi, checkout, dan auto-post sosial tetap merupakan pengembangan terpisah.
- CI native gates ditambahkan. Eksekusi CI remote belum dilakukan; tidak membuat commit atau push Git pada rilis ini. Perubahan lokal yang sudah ada dipertahankan.
- Migrasi bersifat tambahan. Worker sebelum rilis: `9057b18e-3b53-4661-8136-66ca1b664b82`; Pages sebelumnya: `d8b11226.edgelink-afl.pages.dev`. Jangan menghapus kolom/tabel saat rollback rutin. Perhatikan bahwa Worker lama tidak menegakkan limiter atomik baru.

Hermes lokal `ag/gemini-3.8-flash-high` membantu implementasi frontend dan lifecycle media. Integrasi, penegakan limiter, koreksi hasil, seluruh gates akhir, serta deploy diperiksa oleh Codex.
