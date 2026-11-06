# OTP email — 29 Oktober 2026

Pengirim produksi: `1stdev.link Security <no-reply@otp.1stdev.link>`.
Domain Resend `otp.1stdev.link` berstatus Verified; domain ID116b3641-a036-4049-a1ac-d6217ddf13bc, Tokyo. Sudah diverifikasi oleh pemilik sebelum perubahan konfigurasi ini; tidak ada perubahan DNS atau paket berbayar.

Penyebab503 sebelumnya: kode memakai auth@1stnear.com yang tidak berada pada domain terverifikasi, kemudian fallback onboarding@resend.dev yang dibatasi ke alamat pemilik akun. Pengirim sekarang berasal dari variabel EMAIL_FROM di wrangler.toml, dengan default yang sama pada sendOtpEmail. Fallback pengujian dihapus. Secret Resend tidak diganti atau dibaca nilainya.

Worker produksi: 9057b18e-3b53-4661-8136-66ca1b664b82.
Pengujian send-otp ke hallo@1stnear.com: HTTP200, tanpa kode/devpreview pada respons. Detail email Resend mengonfirmasi From no-reply@otp.1stdev.link dan event Delivered. Email ID01a18498-bf73-73a6-b851-4f2304b894fa. Jangan menyimpan OTP aktif dalam dokumentasi.

60tesWorker, typecheck, dan webbuild lulus. Native tests dijalankan dari direktori worker; npm --prefix dari root sempat membuat tsx salah meresolusi modul shared dan gagal. Menjalankan npm test di worker lulus tanpa perubahan implementasi.

Pemeriksaan produksi: email tidak valid400, claim tanpa sesi401, verify dengan email tidak valid400; tidak mengirim email pada pemeriksaan negatif ini dan tidak mengekspos kode. OTP tetap terikat purpose/session, memiliki expiry dan pembatasan percobaan. Penolakan provider tetap menghasilkan503, bukan preview kode.

Status akun profil @1stnear saat pemeriksaan: hallo@1stnear.com sudah tersimpan, is_guest0. Session lokal lama tidak lagi diterima401; tidak mengambil/mengganti credential baru dan tidak memvalidasi OTP baru atas nama pengguna.

Keterbatasan: Delivered berarti server email penerima menerima pesan. Penempatan Inbox/Spam tetap ditentukan penerima; pengujian awal domain lama masuk Spam. Tidak mengklaim jaminan Inbox untuk semua penerima.

Kode belum di-commit bersama perubahan sebelumnya. Tidak ada deploy frontend baru karena bundle tidak berubah.
