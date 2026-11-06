# Navigasi Donasi → WhatsApp

Status: rencana, belum diimplementasikan atau dideploy. Tanggal: 28 Oktober 2026.

## Tujuan dan penerima

Donasi sukarela untuk pengembangan 1stdev.link, mengarah ke WhatsApp pemilik proyek. Nomor diberikan langsung oleh pengguna: `085157965588`, dinormalisasi menjadi `6285157965588` untuk URL `wa.me`. Bukan nomor kontak milik tenant dan tidak diambil dari profil usaha yang sedang dibuka.

## Navigasi dan tampilan

- Desktop lebar: item **Donasi** setelah Statistik pada navigasi utama, ikon Lucide `HeartHandshake` atau `Gift`, stroke 1.75. Gunakan tautan sekunder dengan aksen gold, tanpa badge berkedip, border, atau shadow.
- Desktop sempit/tablet: jika ruang navigasi tidak cukup, akses Donasi tetap tersedia di **Akun → Lainnya**. Uji batas 1024px agar navigasi tidak bertabrakan dengan Simpan akun/Buat.
- Mobile: baris **Donasi** pada **Akun → Lainnya**, dengan deskripsi **Dukung pengembangan 1stdev.link**. Dock bawah mempertahankan jumlah item saat ini.
- Welcome: tautan teks **Dukung 1stdev.link** pada footer, agar dapat diakses tanpa login.
- Gunakan label Inggris **Donate** / **Support 1stdev.link** mengikuti i18n yang ada.
- Tidak memasukkan CTA donasi platform ke daftar blok atau navigasi profil publik tenant. Pengunjung halaman usaha tetap diarahkan ke penawaran dan kontak usaha tersebut.

## Alur klik

1. Pengguna memilih Donasi.
2. Tautan membuka `https://wa.me/6285157965588` dengan pesan yang sudah diisi melalui parameter `text`.
3. WhatsApp/aplikasi atau WhatsApp Web menangani pembukaan sesuai perangkat. Browser tetap memiliki akses ke dashboard asal.
4. Pengguna menekan Kirim sendiri; aplikasi tidak mengirim chat, memulai pembayaran, atau menganggap donasi sudah diterima.

Pesan awal:

> Halo, saya ingin berdonasi untuk pengembangan 1stdev.link. Mohon info cara donasinya.

Pesan hanya berisi teks umum. Jangan menambahkan API key, email akun, nomor telepon pengguna, handle tenant, nominal donasi, atau informasi sesi secara otomatis.

## Implementasi yang direncanakan

- Tambahkan satu konfigurasi frontend, misalnya `web/src/config/donation.ts`: nomor penerima dan helper pembentuk URL dengan `encodeURIComponent(message)`.
- Reuse helper yang sama di `AppShell.tsx`, `screens/AccountScreen.tsx`, dan `Welcome.tsx`; hindari menyalin nomor/URL ke beberapa komponen.
- Gunakan elemen `<a>` untuk navigasi keluar, bukan tombol yang mengandalkan `window.open()` atau callback kosong. Tambahkan `target="_blank"` dan `rel="noopener noreferrer"`.
- Gunakan komponen baris tautan untuk menu Akun yang saat ini memiliki komponen Row berbasis button/onClick; jangan menyarangkan `<a>` di dalam `<button>`.
- Label aksesibel harus menjelaskan **Donasi via WhatsApp**; ikon dekoratif diberi `aria-hidden`.
- Tautan langsung tanpa modal atau formulir tambahan, karena tindakan pengguna hanya membuka draft percakapan.
- Tidak memerlukan endpoint, migrasi D1, WhatsApp API berbayar, analytics klik, skrip pihak ketiga, atau perubahan CSP. Link HTTPS keluar tidak memerlukan allowlist `connect-src` baru.

## Verifikasi

- Nomor URL hanya digit, menggunakan kode negara, tanpa awalan `0`, `+`, spasi, atau tanda baca. Nomor konfigurasi harus cocok tepat dengan penerima yang diberikan pengguna.
- URL terbentuk memakai encoding pesan yang benar; tidak dapat diubah melalui query parameter/tenant profile menjadi penerima lain.
- Uji keyboard/focus, i18n ID/EN, serta layout 320/390/430/1024/1440px. Tidak ada overflow atau tab navigasi yang saling menutupi.
- Klik membuka draft WhatsApp pada nomor benar; pengujian berhenti sebelum mengirim pesan atau melakukan pembayaran. Konfirmasi ketersediaan akun WhatsApp baru bisa dinilai saat membuka tujuan tersebut, bukan dari format nomor saja.
- Jalankan gate proyek setelah implementasi: Worker typecheck + unit tests dan build web. Tidak perlu pengujian pembayaran karena fitur ini hanya tautan percakapan.
- Deploy setelah implementasi dan verifikasi; rencana ini belum mengubah produksi.
