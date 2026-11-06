# Mode Usaha — implementasi 28 Oktober 2026

## Tersedia

- Pemilih Personal/Usaha dan delapan bidang: F&B, retail, jasa, profesional, penginapan, properti, kelas/kursus, lainnya. Judul katalog dan penyajian produk/layanan mengikuti preset awal; isi tetap dapat diedit bebas.
- Preset membuat empat blok kosong dalam satu batch D1, hanya untuk tipe yang belum ada pada profil pemilik. Menjalankan ulang preset tidak menduplikasi atau mengganti data yang sudah diisi. Tidak menerbitkan harga, alamat atau foto contoh.
- Lima tipe blok terstruktur: katalog, informasi usaha, lokasi, kontak dan pengumuman.
- Katalog: maksimal 50 item, 8 kategori, daftar/grid, foto URL/upload R2, harga rupiah tetap/mulai dari/tanya harga, satuan, durasi layanan dan status tersedia/tidak tersedia/sembunyi.
- Informasi usaha: jadwal mingguan, WIB/WITA/WIT, tutup sementara, catatan libur/kunjungan; status buka dihitung pada SSR termasuk jadwal melewati tengah malam. Catatan libur berupa teks, belum kalender pengecualian tanggal otomatis.
- Kontak: WhatsApp, telepon, email, website. Peta berupa tautan keluar. Tidak ada embed, pemesanan, checkout atau pesan otomatis.
- Tema publik Paper/Ink; editor memakai surface hijau gelap/gold dan radius yang lebih lembut. Wallpaper personal tetap tersimpan, tetapi tidak menutupi tema usaha.
- Edit, duplikasi, tampil/sembunyi dan urutan blok tersedia. Penghapusan masih memakai alur delete yang sudah ada; undo/soft-delete belum ditambahkan.
- Preview memakai renderer SSR bersama. Filter kategori menggunakan radio dan CSS `:has`, tanpa JavaScript publik. Browser yang tidak mendukung `:has` tetap menampilkan seluruh item.

## Struktur

- `shared/business.ts`: kontrak versioned, preset, validator runtime, batas UTF-8 dan perhitungan jadwal.
- `shared/renderBusiness.ts`: renderer dan stylesheet publik; semua teks di-escape, data rusak disembunyikan agar tidak menjatuhkan halaman.
- `web/src/components/business/`: panel mode dan form setiap tipe blok.
- `worker/src/index.ts`: create/read/update data blok, konfigurasi profil, preset tenant scoped dan invalidasi cache. Blok usaha tidak dapat dipromosikan menjadi short redirect.
- `worker/migrations/0002_business_blocks.sql`: penambahan nullable `business_json` pada profil dan `data_json` pada link, dengan CHECK JSON. Semua profil lama default ke Personal.

## Verifikasi

- Worker typecheck dan 52 tes lulus; build web dan Wrangler dry-run lulus.
- Tes mencakup roundtrip create/list/update/SSR, preset idempotent, tenant isolation, URL privat, escaping, data rusak, harga, batas ukuran/jumlah item, jadwal lintas hari, serta migrasi yang mempertahankan data lama.
- Alur browser memakai Vite + Worker/D1/KV lokal terisolasi di `/tmp/edgelink-business-check`, bukan mock API: onboarding, memilih mode, membuat preset, mengedit identitas/katalog, kategori, grid, jadwal, dan render publik berhasil.
- CSS filter kategori terverifikasi pada halaman SSR aktual lokal. Editor, form katalog dan halaman publik dicek pada 320px; editor desktop 1440px tidak overflow.
- Pengujian menemukan dan memperbaiki body POST stream kosong pada onboarding, serta input jam yang berubah di kontrol namun belum tersimpan. Input waktu membaca event input dan nilai form saat submit; jam 21:00 berhasil diverifikasi pada halaman SSR setelah save.
- Data demo Kedai Sore hanya dibuat pada database lokal untuk bukti visual.

## Batas MVP

Antarmuka baru dan halaman usaha memakai Bahasa Indonesia, mata uang IDR, serta zona waktu Indonesia. Bidang lanjutan menggunakan katalog dan informasi umum; fasilitas kamar, atribut properti khusus, galeri, FAQ, kalender reservasi, stok real-time dan konflik edit lintas perangkat belum ditambahkan. Batas global kuota gratis dan konsistensi KV lintas region tetap mengikuti batas yang dicatat pada IMPLEMENTATION-NOTES.md.

## Migrasi dan rollback

Migrasi `0002_business_blocks.sql` dijalankan sekali sebelum Worker baru. Fresh install memakai schema.sql yang sudah mencakup kolom baru; jangan jalankan migrasi yang sama lagi pada fresh schema.

Kolom tambahan tidak perlu dihapus saat rollback. Pilihan paling aman adalah mempertahankan backend baru dan memperbaiki frontend. Jika harus kembali ke Worker sebelum Mode Usaha, sembunyikan blok usaha terlebih dahulu melalui backend baru: renderer lama tidak memahami jenis blok baru dan dapat menghasilkan tombol yang tidak sesuai. Data katalog tetap disimpan untuk pemulihan.

## Rilis produksi

- Migrasi `0002_business_blocks.sql` berhasil diterapkan ke D1 produksi; kedua kolom baru terkonfirmasi lewat query metadata.
- Worker: `48965fcc-a1e6-4c1f-911f-3a1c2174f275`, aktif pada tiga custom domain yang sudah ada.
- Pages: deployment produksi branch main; URL final https://08458e7d.edgelink-afl.pages.dev (production).
- Smoke check produksi: health, sitemap, satu bio lama 200; preset dan create link tanpa token 401; login/handoff malformed 400. Tidak membuat profil demo atau mengirim email pengujian di produksi.
- JS/CSS domain utama dicocokkan SHA-256 dengan build lokal. Frontend meminta sampai 100 record sesuai batas blok usaha, agar preview akun dalam batas tersebut tidak terpotong pada default API 50 record.
- Data contoh screenshot berasal dari D1 lokal. Belum mengubah konfigurasi usaha akun pengguna secara otomatis.
- Worker sebelum fitur ini: `17222f9b-d41b-4f1a-a179-acf94cc596d8`; ikuti catatan rollback di atas karena versi tersebut tidak memahami blok usaha.
