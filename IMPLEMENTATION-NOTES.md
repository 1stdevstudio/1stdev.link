# Implementasi dan rilis produksi — 28 Oktober 2026

## Perubahan

- Validasi payload profil dipisahkan; JSON social rusak/null/array, tipe salah, URL privat dan input berlebihan ditolak sebelum write. Renderer menoleransi JSON lama yang rusak.
- Validator URL menutup trailing-dot localhost, IPv4-mapped IPv6, alamat non-global IPv6, CGNAT/multicast dan credential URL.
- OTP produksi tidak pernah dikembalikan ke klien saat provider gagal/tidak dikonfigurasi. Preview hanya untuk `ENVIRONMENT=development`; claim email langsung ditutup dan badge verifikasi menjadi milik platform.
- OTP diikat ke purpose/sesi dan expiry absolut. D1 conditional UPDATE membatasi tiga percobaan dan memutuskan konsumsi OTP/handoff secara atomik, meskipun KV masih menampilkan record lama.
- Transfer perangkat memakai tautan sekali pakai dua menit; tidak ada access key dalam URL QR pihak ketiga. Pembacaan `sync_key` lama dihapus.
- Profil autosave dan mutasi link diantrekan. Response lama tidak mengganti draft baru atau state akun lain. Ada status save/retry; cache dipisahkan per akun; pergantian token antartab memuat ulang sesi.
- Renderer HTML bio, SEO, model data dan palet dipindahkan ke `shared/`. Preview memakai dokumen SSR yang sama di iframe sandbox tanpa script/same-origin, sehingga tidak ada renderer React kedua yang perlu disinkronkan.
- Token surface dashboard mengikuti `#070e0c`, `#0d1b16`, `#142821`, gold `#e9be54`. Drop shadow dekoratif dashboard/bio dihapus, focus outline dipertahankan. Sheet memiliki focus trap/restoration.
- Schema fresh-install dilengkapi kolom style/avatar/badge/block yang sudah dipakai runtime. Helper cache sesi dan validasi dipisahkan dari entrypoint.

## Validasi

- Worker typecheck dan 41 tes lulus, termasuk endpoint pentest lokal, tenant isolation, malformed input, provider rejection, replay paralel, batas percobaan OTP, dan urutan mutasi setelah jaringan gagal.
- Conditional SQL diuji di SQLite asli; migrasi auth berhasil diterapkan ke D1 lokal melalui Wrangler `--local`.
- Build web dan `wrangler deploy --dry-run` lulus (tidak upload/deploy). Browser lokal memakai data mock development; mobile 320/390/430px dan desktop 1440px tidak memiliki overflow horizontal; preview SSR tampil; tidak ada console error pada pemeriksaan desktop.
- Migrasi auth dan deployment produksi dijalankan setelah instruksi deploy dari pengguna; lihat catatan rilis di bawah.

## Persiapan deploy

Migration additive wajib diterapkan sebelum Worker baru:

```sh
cd /Users/spixelsdev/edgelink/worker
npx wrangler d1 execute edgelink-db --remote --file=migrations/0001_auth_challenges.sql
```

Command remote di atas sudah dijalankan pada rilis 28 Oktober 2026. Setelah itu deploy Worker dan frontend dari revision yang sama. OTP yang diterbitkan versi lama harus diminta ulang; tautan transfer `sync_key` lama tidak lagi mengimpor access key. API claim legacy sekarang mengembalikan 403 dan mengarahkan ke alur OTP. Pastikan pengiriman email produksi berfungsi sebelum rilis, karena tidak ada lagi fallback OTP terbuka.

Untuk rollback, kembalikan bundle Worker/frontend sebelumnya; tabel auth tambahan boleh tetap ada. Ketahui bahwa rollback auth juga mengembalikan kelemahan keamanan versi lama.

## Batas yang masih perlu ditangani dalam tahap lanjutan

- Rate limit IP di KV tetap best-effort, bukan penghitung atomik. Keputusan single-use auth sudah dipindahkan ke D1; batas global biaya/free-tier belum dijamin oleh limiter per-IP.
- Invalidation bio sekarang ditunggu sebelum response save profil, tetapi KV tetap tidak menjamin konsistensi global seketika atau mencegah semua stale refill. Versioned cache dan pengujian lintas region masih diperlukan.
- Revision server untuk konflik edit dua perangkat belum ditambahkan. Antrean ini menjaga urutan dalam satu aplikasi/tab.
- Ekstraksi seluruh route/repository, audit visual lengkap semua tema/media, dan staging dengan resource D1/KV/R2 terisolasi masih merupakan tahap lanjutan dalam REDESIGN-PLAN.md.
- Bundle web bertambah karena memuat renderer SSR: sekitar 356 kB JS / 104.8 kB gzip. Belum ada pengukuran latency produksi atau klaim sub-15ms.
- Shared memory recall/handoff tidak tersedia karena PostgreSQL lokal menolak koneksi; catatan ini menjadi handoff lokal.

## Rilis produksi — 28 Oktober 2026, sekitar 19:22 WIB

- D1 `0001_auth_challenges.sql`: berhasil, 2 query; schema profil/link produksi juga diperiksa sebelum deploy.
- Worker baru: `17222f9b-d41b-4f1a-a179-acf94cc596d8`.
- Pages `edgelink`, production branch `main`: https://ad838564.edgelink-afl.pages.dev
- Domain utama https://1stdev.link menyajikan bundle JS yang sama dengan build lokal.
- Smoke check produksi: dashboard, JS asset, health, sitemap dan satu bio publik 200; login/verify/handoff invalid 400; profil tanpa token 401.
- Pengiriman OTP email nyata belum diuji; secret RESEND_API_KEY terpasang (nilainya tidak dibaca).
- Titik rollback sebelum rilis: Worker `7b094efb-422a-43b3-af16-3fa7cd8e0b79`; Pages `d1ba494d-f1ac-4bd4-96a9-1eb461aeefae`.
- `edgelink-design` dan situs PortFolio tidak dideploy dalam rilis ini.
