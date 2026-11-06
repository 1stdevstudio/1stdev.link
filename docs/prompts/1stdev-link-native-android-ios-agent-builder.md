# Prompt Agent Builder — 1stdev.link Native Android & iOS

Tanggal konteks: 30 Oktober 2026. Dokumen ini adalah instruksi implementasi untuk agent builder; bukan pernyataan bahwa aplikasi native sudah tersedia.

---

## 1. Peran dan hasil yang diminta

Anda adalah Senior Native Mobile Engineer, Product Designer, dan Security Engineer. Bangun aplikasi mobile **1stdev.link** untuk **Android dan iOS** berdasarkan monorepo yang sudah berjalan. Implementasikan, jalankan, dan verifikasi sampai tersedia build yang dapat ditinjau. Jangan berhenti pada konsep, mockup, atau scaffold kosong.

Aplikasi membantu **kreator, UMKM lintas industri, profesional, dan affiliate** mengelola halaman bio, shortlink, katalog produk/layanan, informasi usaha, serta statistik klik dari satu workspace.

Hasil utama:

1. Android native menggunakan **Kotlin + Jetpack Compose**.
2. iOS native menggunakan **Swift + SwiftUI**.
3. Memakai backend Cloudflare yang sudah ada; akun, data, tautan, dan halaman publik tetap satu ekosistem dengan web.
4. Pengalaman native yang matang, cepat, mudah dipahami, dapat diakses, dan sesuai identitas visual produk.
5. Dokumentasi setup, konfigurasi lingkungan, pengujian, distribusi, batasan, dan perubahan API yang nyata.

**Native berarti layar utama dan interaksi memakai UI native.** Jangan membungkus dashboard web dalam WebView, PWA, Capacitor, atau mengganti implementasi dengan Flutter/React Native. WebView terisolasi boleh dipakai khusus untuk preview HTML publik yang akurat, bukan sebagai shell aplikasi.

## 2. Konteks proyek dan batas akses

- Pemilik/pengelola: Yogi Iskandar (@1stdev), 1stdev.space.
- Nama produk: **1stdev.link**, sebelumnya EdgeLink / 1stnear.
- Root monorepo: `/Users/spixelsdev/edgelink`.
- Web: `/Users/spixelsdev/edgelink/web` — Vite, React, TypeScript, Tailwind.
- Worker: `/Users/spixelsdev/edgelink/worker` — Cloudflare Workers, Hono, D1, KV, R2.
- Kontrak dan renderer bersama: `/Users/spixelsdev/edgelink/shared`.
- Referensi portfolio: `/Users/spixelsdev/Documents/Codex/PortFolio` — **jangan diubah**.
- Domain aplikasi/API/publik: `https://1stdev.link`.
- Situs operator: `https://1stdev.space`.
- Worker: `edgelink-worker`.
- Pages produksi: `edgelink`; staging/mirror: `edgelink-design`.
- D1: `edgelink-db`; KV: `EDGELINK_CACHE`; R2: `edgelink-media`.

Baca AGENTS.md yang berlaku. Periksa status Git sebelum mengubah file. Working tree dapat berisi pekerjaan yang belum commit; jangan reset, menimpa, membersihkan, atau mengikutsertakan perubahan yang tidak relevan tanpa memahami asalnya. Jangan membaca kredensial hanya untuk eksplorasi atau mencetaknya ke log.

Buat sumber native di `mobile/android/` dan `mobile/ios/`, dokumentasi lintas platform di `mobile/docs/`. Jika folder sudah ada, lanjutkan strukturnya secara konsisten. Jangan membuat repo terpisah atau merombak backend hanya demi preferensi arsitektur.

## 3. Discovery wajib sebelum implementasi

Baca secara terarah:

- `web/src/api.ts`: body request, envelope respons, autentikasi, transformasi data, penanganan error.
- `web/src/types.ts`, `shared/types.ts`, `shared/business.ts`: enum, nullable field, versi schema, validasi dan kuota sebenarnya.
- `web/src/App.tsx`, `web/src/state/`: alur guest, sesi, autosave, mutasi dan pencegahan respons usang.
- `web/src/components/screens/`: struktur navigasi dan fitur aktif.
- `web/src/components/business/`: katalog dan blok usaha.
- `web/src/components/ImageCropperModal.tsx`: crop dan batas gambar.
- `shared/renderBioPage.ts`, `shared/renderBusiness.ts`, `shared/bio.ts`: kebenaran rendering publik, tema dan mode usaha.
- `worker/src/index.ts`, `security.ts`, `profileValidation.ts`, `authChallenges.ts`, `media.ts`: kontrak dan perlindungan server.
- `web/src/legal/content.ts`: dokumen legal ID/EN dan kontak resmi.
- `worker/test/` dan catatan review yang relevan di `reviews/2026-10-30/`.

Jangan membaca lockfile, bundle minified, sourcemap, atau seluruh repository sekaligus. Gunakan pencarian sempit. Buat matriks fitur/API yang membedakan **tersedia**, **perlu penambahan backend**, dan **ditunda**. Jangan mengarang response field atau endpoint.

Verifikasi dokumentasi resmi versi SDK, ketentuan distribusi toko aplikasi, dan kemampuan toolchain saat mulai bekerja. Catat versi aktual; jangan menyalin persyaratan toko dari ingatan.

## 4. Prinsip produk dan batas fitur

- Mendukung kreator, usaha, dan affiliate tanpa memaksa semua pengguna menjadi toko.
- Onboarding singkat: pilih tujuan, mulai workspace, tautkan email untuk membantu pemulihan.
- F&B pada tahap awal adalah **katalog menu dan informasi kedai**.
- Usaha lain memakai blok yang sama: retail, jasa/studio, profesional, hospitality/kos, properti, kelas/kursus, dan lainnya.
- Jangan membuat checkout, pembayaran, keranjang, pemrosesan pesanan, reservasi, komisi affiliate otomatis, ulasan terverifikasi, atau auto-post media sosial seolah fitur tersebut sudah ada.
- Jangan menambahkan navigasi donasi; implementasinya pernah ditunda pengguna.
- Label gratis harus mengikuti penawaran yang nyata. Jangan menambahkan paywall, iklan, langganan atau SDK monetisasi tanpa instruksi baru.
- Jangan mengklaim penyimpanan permanen, pemulihan akun terjamin, tracking konversi, atau jumlah pengunjung unik jika sistem hanya mencatat agregat klik.

## 5. Arsitektur native

### Android

Gunakan Kotlin, Jetpack Compose, Material 3 yang diberi design tokens produk, structured concurrency dengan coroutines/Flow, navigasi native, state holder/ViewModel, repository untuk data, dan HTTP client yang terawat. Tentukan versi minimum Android dari kebutuhan SDK dan target pengguna, lalu dokumentasikan alasan.

### iOS

Gunakan Swift, SwiftUI, Swift Concurrency, URLSession, navigasi native, state model yang sesuai versi minimum iOS, dan repository untuk data. Pilih deployment target secara sadar dan dokumentasikan.

### Keduanya

- Pisahkan presentation, domain yang benar-benar diperlukan, networking, persistence dan secure storage.
- Hindari lapisan abstraksi yang hanya menambah boilerplate.
- Konfigurasi base URL debug/staging/production terpisah; production hanya HTTPS.
- Token tidak dibundel ke aplikasi. Secret penyedia hanya di backend.
- Model decode harus menerima field tambahan dan menangani data lama secara defensif.
- Bedakan `null`, field tidak dikirim, string kosong, dan nilai `false` agar PATCH/PUT tidak menghapus data tanpa sengaja.
- Gunakan identifier server sebagai sumber identitas item; jangan mengandalkan posisi list.
- Format mata uang dan tanggal menurut locale, tetapi pertahankan semantik hari analitik UTC.
- Ambil dependency seminimal mungkin, pin versi, sertakan lisensi dan alasan penggunaannya.

## 6. Navigasi dan rancangan layar

Navigasi utama: **Beranda, Halaman, Link, Statistik**. Akun/pengaturan mudah ditemukan; buat blok lewat aksi tambah yang jelas.

### A. Onboarding dan akses

- Pilihan tujuan: Kreator, Usaha/UMKM, Afiliasi & Rekomendasi, atau shortlink saja.
- Guest workspace sesuai API yang sudah ada.
- Login email OTP; tautkan email untuk menyimpan akses workspace guest sesuai alur server.
- Input OTP mudah diisi/paste, mendukung autofill platform bila format email mendukungnya.
- Resend cooldown berdasarkan respons server dan state permintaan, bukan timer palsu yang mengizinkan bypass.
- Jelaskan kegagalan email 503 dengan pesan dapat ditindaklanjuti; jangan tampilkan OTP debug.
- Transfer perangkat melalui handoff single-use kedaluwarsa, bukan QR berisi API key permanen.
- Tidak mengklaim logout mencabut semua sesi server jika belum ada fitur revocation.

### B. Beranda

Ringkasan profil, handle dan URL publik; kelengkapan profil; status penyimpanan; pintasan edit, bagikan, tambah tautan/blok, serta ringkasan statistik nyata. Empty state yang berguna tanpa angka fiktif.

### C. Halaman — Isi

Daftar blok aktif, urutan drag/reorder, tambah/edit, aktif/nonaktif, lepas dari bio, hapus dengan konfirmasi sesuai dampak. Bedakan menghapus shortlink dari sekadar melepasnya dari halaman. Mendukung tipe blok yang benar-benar dirender server; untuk tipe lama yang belum didukung renderer, pertahankan data dan jelaskan batasnya, jangan menampilkan preview palsu.

### D. Halaman — Tampilan

Nama, handle, bio, avatar, cover/header, wallpaper, tema, bentuk avatar, efek atmosfer, pengaturan yang memang didukung schema. Crop avatar 1:1, cover 3:1, wallpaper 9:16. Terapkan batas ukuran, jenis file, kompresi dan orientasi EXIF sesuai kontrak upload.

**Invarian wajib:**

- Mengganti tema **tidak menghapus wallpaper, header, blur, dim atau efek**.
- Gambar hanya dihapus melalui aksi hapus yang jelas.
- Mode usaha tidak menyembunyikan wallpaper, lapisan dim, Aurora atau Grain lewat override CSS/native.
- Bentuk avatar mengikuti `profile.avatar_shape`, lalu fallback `style.av_shape` untuk data lama.
- Gunakan semantik `circle`, `squircle`, `rounded` dari renderer; jangan menganggap label “Kotak” berarti radius nol jika kontraknya berbeda.
- Perubahan terpilih terlihat jelas, dapat diakses, dan tersinkron ke preview.
- Hormati Reduce Motion; efek tidak mengganggu teks atau konsumsi baterai.

### E. Preview

Sediakan preview native cepat untuk interaksi jika diperlukan, serta **preview otoritatif dari renderer publik yang sama** untuk hasil akhir. Jangan menulis renderer kedua lalu mengklaim paritas tanpa pengujian.

Pilihan implementasi: gunakan HTML hasil renderer bersama yang dibundel secara reproducible, atau endpoint preview yang aman dan terautentikasi jika benar-benar perlu. Jangan mengirim draft atau token melalui query URL publik. Bila memakai WebView/WKWebView: konten terisolasi, tidak ada JS bridge luas, cegah navigasi tak tepercaya, buka tujuan eksternal secara terkontrol, dan jangan menyisipkan token ke HTML. Preview data tidak boleh membuat fetch ke host lokal/private tanpa validasi.

Paritas mencakup badge pilihan dan ikon panah, rata kiri tautan, kapsul sosial, cover, wallpaper, blur/dim, efek, bentuk avatar, urutan, blok tersembunyi, serta katalog usaha. Tidak ada scrollbar dekoratif pada mockup, tetapi konten tetap dapat digulir dan diakses.

### F. Link

Daftar, pencarian, pengurutan, filter aktif/nonaktif/di halaman; buat/edit judul, slug, URL tujuan, deep-link platform bila tersedia; salin, bagikan, QR, analytics per link. Validasi client membantu pengguna; server tetap memvalidasi. URL berbahaya ditolak tanpa retry loop.

### G. Statistik

Total klik, tren per hari, estimasi negara, performa per tautan, dan ekspor jika API mendukung atau dapat dibentuk dari data pengguna yang sah. Grafik punya label aksesibilitas dan alternatif tabel. Jelaskan statistik agregat, UTC, keterbatasan bot filtering, dan bahwa tindakan katalog eksternal langsung tidak otomatis menjadi event shortlink.
b
### H. Akun

Status guest/email, simpan akun, transfer perangkat, bahasa ID/EN, dokumen legal, kontak dukungan, dan logout. Tampilkan API key hanya bila dibutuhkan fitur yang jelas, tersembunyi secara default, dengan peringatan dan tindakan salin sadar. Jangan tampilkan token di screenshot/log/error.

## 7. Mode usaha dan affiliate

Ikuti `BusinessSettings` versi 1:

- `mode`: `personal | business`.
- `purpose`: `creator | business | affiliate`, opsional.
- `skin`: `paper | ink`.
- `industry`: `fnb | retail | services | professional | hospitality | property | education | other`.

Blok usaha:

1. `catalog`: layout list/grid; presentasi products/services; kategori; item; WhatsApp; disclosure.
2. `business_info`: timezone; jam operasional termasuk melewati tengah malam; catatan; penutupan sementara.
3. `location`: alamat dan URL peta.
4. `contact`: WhatsApp, telepon, email, website.
5. `announcement`: teks pengumuman.

Item katalog mempertahankan `id`, nama, deskripsi, kategori, gambar, harga nullable, `price_kind: fixed|from|ask`, unit, `status: available|unavailable|hidden`, durasi nullable, `action_url` dan `action_label` opsional. Jangan menganggap harga null sebagai nol atau gratis.

Contoh pemetaan:

- F&B: menu, kategori minuman/makanan, ketersediaan, lokasi, jam kedai.
- Retail: produk, kategori, harga, kontak dan tautan marketplace.
- Jasa: layanan, durasi, harga mulai/tanyakan, konsultasi WhatsApp.
- Profesional: portofolio/penawaran layanan dan kontak.
- Hospitality/properti: informasi unit/fasilitas dan kontak; tidak membuat booking engine.
- Pendidikan: kelas, jadwal berupa informasi, harga dan tautan pendaftaran eksternal.
- Affiliate: katalog kurasi, tautan tujuan, CTA, disclosure; tidak menjanjikan sinkronisasi komisi atau stok marketplace.

Preset harus idempotent, tidak menimpa konten lama tanpa persetujuan, dan mematuhi kuota server. Jangan menerbitkan alamat atau nomor contoh sebagai data bisnis asli.

## 8. API yang harus diintegrasikan

Base URL produksi: `https://1stdev.link`. Rute berikut teridentifikasi pada saat penyusunan; **baca implementasi terbaru untuk body dan respons persisnya**:

| Area | Metode dan rute |
|---|---|
| Health | `GET /health` |
| Guest | `POST /api/auth/guest` |
| Kirim OTP | `POST /api/auth/send-otp` |
| Verifikasi OTP | `POST /api/auth/verify-otp` |
| Klaim guest | `POST /api/auth/claim` |
| Login | `POST /api/auth/login` |
| Sesi | `GET /api/auth/me` |
| Buat handoff | `POST /api/auth/handoff` |
| Klaim handoff | `POST /api/auth/handoff/claim` |
| Profil | `GET /api/bio-profile`, `PUT /api/bio-profile` |
| Link | `GET /api/links`, `POST /api/links` |
| Edit/hapus | `PATCH /api/links/:id`, `DELETE /api/links/:id` |
| Urutan | `PUT /api/links/reorder` |
| Statistik | `GET /api/analytics/summary`, `GET /api/links/:id/analytics` |
| Preset usaha | `POST /api/business/preset` |
| Media | `POST /api/media/:type` |
| Bio publik | `GET /@:handle` |
| Shortlink | `GET /:slug` — pengalihan publik |

Autentikasi privat memakai Bearer token sesuai API. Jangan menyamakan endpoint OTP/claim/login yang berbeda; ikuti binding purpose dan sesi guest server. Handoff sekarang berlaku 120 detik dan single-use; OTP 10 menit. Server dapat mengubah detail; jangan menjadikannya batas keamanan yang hanya ditegakkan client.

Untuk media, periksa tipe rute yang diizinkan, payload multipart, MIME, ukuran dan nama field dari kode. Jangan mengasumsikan upload katalog memiliki endpoint baru.

Tangani minimal 400, 401, 403, 404, 409, 410, 413, 429 dan 503 sesuai respons aktual. Hormati Retry-After bila tersedia. Jangan menganggap semua 403 harus logout. Jangan mengirim token ke redirect eksternal, image host, analytics, atau sistem crash reporting.

## 9. Sinkronisasi, autosave dan offline

- Cache lokal dibatasi per akun/workspace; jangan tampilkan data akun sebelumnya saat ganti akun.
- Hydrate cache agar UI tidak berkedip, lalu validasi sesi dengan server.
- Serialize save per workspace atau pakai mekanisme revisi yang benar-benar didukung; cegah respons request lama mengganti state baru.
- Saat sesi berubah, abaikan completion request akun lama.
- Merge field yang tidak diedit, termasuk schema versi lama yang belum diedit layar native.
- Autosave debounced; tampilkan Menyimpan, Tersimpan, dan Gagal—coba lagi berdasarkan hasil nyata.
- Jangan retry otomatis POST create, claim OTP, handoff single-use atau mutasi berisiko duplikasi saat hasil request tidak pasti. Rekonsiliasi dahulu atau tambahkan idempotency server secara teruji.
- Offline boleh membaca cache dan menyimpan draft lokal. Jangan menyatakan konten sudah terbit sebelum server mengonfirmasi.
- Draft belum tersinkron dibedakan dari data server; ketika reconnect, tangani konflik secara eksplisit.
- Jika belum ada revisi/ETag pada API, jangan menjanjikan resolusi konflik lintas perangkat yang tidak didukung.
- Logout membersihkan kredensial dan cache sensitif workspace di perangkat. Jangan mengklaim mencabut semua sesi server jika tidak dilakukan.

## 10. Keamanan dan privasi

- Android: simpan kredensial menggunakan fasilitas aman berbasis Keystore; iOS: Keychain dengan aksesibilitas yang sesuai. Jangan gunakan preferences/UserDefaults/plaintext database untuk token.
- Jangan masukkan kredensial ke backup, clipboard otomatis, deep link, telemetry, crash log, atau screenshot fixture.
- Tidak ada secret Cloudflare/Resend di aplikasi. Build config bukan secure storage untuk secret.
- Validasi Universal/App Links, skema, host, parameter dan expiry; jangan mengeksekusi URL arbitrer sebagai instruksi autentikasi.
- Public bio dan shortlink adalah URL berbagi untuk browser. Jangan otomatis mengambil alih seluruh tautan tersebut menjadi editor aplikasi. Rancang path app-link khusus jika diperlukan dan verifikasi kepemilikannya.
- Biometric lock boleh sebagai perlindungan lokal opsional, tidak menggantikan verifikasi server.
- Photo picker sistem lebih diutamakan daripada izin seluruh galeri. Kamera hanya saat pengguna memilih scan/ambil foto; lokasi tidak diperlukan untuk mengisi alamat manual.
- Tanpa tracker iklan, fingerprinting, atau SDK analitik pihak ketiga secara default.
- Bila backend diubah: query tenant harus dibatasi kepemilikan; URL divalidasi anti-SSRF; SSR escape semua input; endpoint publik mutasi memakai rate limit server. Jangan menonaktifkan kontrol untuk mempermudah native client.
- Jangan mengandalkan CORS sebagai kontrol akses aplikasi native.
- Tidak ada OTP debug/dev_code pada produksi, dan log request/response harus meredaksi rahasia.

## 11. Desain dan aksesibilitas

Tokens utama:

```text
Background  #070e0c
Surface 1   #0d1b16
Surface 2   #142821
Accent      #e9be54
```

Gunakan surface stacking solid, ruang yang lapang, hierarki teks jelas, tanpa border 1px dekoratif dan tanpa drop shadow berat. Ikon vektor native yang konsisten; tanpa emoji sebagai ikon UI. Jangan menyalin tampilan website desktop ke layar kecil.

- Touch target mengikuti pedoman native, minimal setara 44pt iOS/48dp Android.
- Dynamic Type/font scaling, VoiceOver, TalkBack, contrast, landscape dan safe area.
- Fokus pindah ke kontrol yang terlihat; tidak ada kontrol tersembunyi yang dapat menerima fokus.
- Picker/dropdown memakai komponen native atau implementasi accessible; pilihannya diumumkan screen reader.
- State selected tidak hanya bergantung warna; gunakan label/indikator semantik.
- Keyboard tidak menutupi input/CTA; paste, selection, autofill dan back gesture bekerja.
- Tema editor produk dan tema halaman publik adalah dua konteks berbeda. Mengubah tema halaman tidak boleh menghapus media atau mengubah preferensi sistem pengguna.
- Teks ringkas dan Bahasa Indonesia natural; EN tersedia dan preferensi tersimpan.

## 12. Legal, dukungan, dan distribusi toko

Pakai substansi Terms/Privacy ID/EN yang sudah ada di `web/src/legal/content.ts`; jangan membuat salinan yang berbeda tanpa mekanisme pembaruan versi. Kontak resmi:

- Privasi, penghapusan, abuse, keberatan: **support@1stdev.link**.
- Kontak umum: **hallo@1stdev.link**.
- WhatsApp alternatif: **+62 851-5796-5588**.
- Domain pengirim OTP: `otp.1stdev.link`; bukan alamat dukungan.

Jangan mengklaim menutup modal berarti consent baru. Bila diperlukan pencatatan penerimaan versi ketentuan, desain flow dan penyimpanan server yang eksplisit, dengan migrasi serta audit yang proporsional.

**Penghapusan akun saat ini manual melalui dukungan.** Sebelum pengajuan App Store/Google Play, verifikasi persyaratan penghapusan akun, privasi, konten pengguna, laporan penyalahgunaan, serta pengungkapan data yang berlaku saat itu. Jika perlu fitur delete-account native, implementasikan alur backend yang aman terlebih dahulu; jangan menampilkan tombol selesai palsu atau menganggap email bantuan selalu cukup untuk review toko.

Jangan mengklaim compliant hanya karena dokumen tersedia. Periksa siklus penghapusan D1/KV/R2, media bersama, kredensial, analytics, cache dan data yang wajib ditahan. Tampilkan dampak dan verifikasi ulang pemilik sebelum tindakan permanen.

Siapkan draft store listing, support/privacy URLs yang benar-benar dapat dibuka, app icon dan screenshot dari aplikasi nyata, permission rationale, serta daftar data untuk formulir privasi. Jangan menerbitkan listing, membuat akun berbayar, mengubah DNS, atau melakukan pengeluaran tanpa otorisasi yang sesuai.

## 13. Infrastruktur dan biaya

Backend tetap Cloudflare edge/serverless dengan prinsip biaya minimal. Jangan menambah VPS, daemon, backend berbayar, layanan realtime, SDK berbayar, atau sistem antrean eksternal hanya untuk native app.

Jangan menganggap semua penggunaan pasti gratis; baca kuota paket aktual dan rancang polling/cache secara hemat. Biaya akun developer Apple/Google, signing, CI, domain, dan penyedia pihak ketiga adalah komponen terpisah. Jangan mengada-adakan angka tarif; verifikasi jika dibutuhkan.

Push notification bukan syarat MVP. Jangan menambah APNs/FCM token collection sebelum ada use case, consent/permission flow dan backend pendukung yang jelas.

## 14. Urutan pelaksanaan

1. Audit kontrak, fitur aktif, toolchain dan signing yang tersedia. Hasilkan daftar gap konkret.
2. Bangun satu alur vertikal Android dan iOS: akses yang sah → baca profil/link → edit draft → simpan → lihat hasil publik.
3. Implementasikan navigasi, secure storage, login/guest/claim dan error handling.
4. Implementasikan editor isi, shortlink, upload/crop, tampilan dan preview akurat.
5. Implementasikan blok usaha/affiliate serta analytics.
6. Tangani autosave, race, pergantian akun, offline draft, dan konflik.
7. Selesaikan aksesibilitas, legal/contact, deletion gap, app links dan izin.
8. Uji regresi, build debug dan release, lalu berikan artifact dan laporan yang dapat diverifikasi.

Maju secara mandiri pada pekerjaan yang sudah jelas. Tanyakan hanya hal yang sungguh menghalangi, seperti signing/team ID yang tidak tersedia. Tetap bangun simulator/emulator jika perangkat atau signing release belum tersedia. Jangan mengklaim archive/store release berhasil tanpa bukti.

## 15. Pengujian dan acceptance criteria

Wajib menguji perilaku nyata, bukan hanya kompilasi:

- Guest dibuat sesuai API; OTP salah/kedaluwarsa/terkirim gagal ditangani tanpa membocorkan kode.
- Handoff hanya dapat diklaim sekali dan tidak membagikan token permanen.
- Pemisahan akun dan tenant, logout/cache cleanup, request lama setelah account switch.
- CRUD dan reorder, duplicate-tap, jaringan lambat, timeout dengan hasil mutasi tidak pasti.
- Semua shape avatar, tema terang/gelap, wallpaper dan header tetap ada setelah theme switch.
- Mode usaha paper/ink menampilkan background, blur/dim, Aurora/Grain dan bentuk avatar sesuai pengaturan.
- Crop benar, upload gagal dapat diulang, gambar berorientasi EXIF benar.
- Katalog hidden/unavailable, nullable price, kategori, disclosure, timezone dan overnight hours.
- Preview/public parity untuk profil contoh kreator, F&B, jasa dan affiliate; data contoh tidak diterbitkan ke akun pengguna tanpa izin.
- Empty/loading/error/offline, 401/429/503, accessibility labels, ukuran font besar, Reduce Motion, rotasi dan safe area.
- Tidak ada secret di repository, log, APK/IPA resources atau screenshot.
- Unit/model/repository tests, integration tests API staging/mock, Compose UI tests dan XCTest/UI tests sesuai kebutuhan.

Jika mengubah shared/backend/web, jalankan dari direktori masing-masing:

```bash
cd /Users/spixelsdev/edgelink/worker
npm run typecheck && npm test
cd /Users/spixelsdev/edgelink/web
npm run build
```

Untuk native, gunakan Gradle dan xcodebuild sesuai project/scheme yang benar-benar dibuat. Jangan menulis perintah scheme/path fiktif. Catat emulator/simulator, versi OS, hasil dan limitasi. Endpoint auth/redirect yang dimodifikasi wajib mendapat regression security test.

## 16. Deliverables dan format laporan akhir

Serahkan:

- Source Android/iOS yang dapat dibangun, bukan hanya gambar atau ZIP scaffold.
- README setup dengan versi toolchain, langkah menjalankan, konfigurasi base URL dan secure credential flow.
- Matriks fitur native vs web dan daftar gap yang masih terbuka.
- Dokumentasi kontrak API serta migrasi/perubahan backend jika ada.
- Bukti build/test dan screenshot/video pendek alur utama pada kedua platform.
- APK debug; iOS simulator build atau archive sesuai signing yang tersedia. Jangan menjanjikan IPA terdistribusi tanpa provisioning yang sah.
- Checklist kesiapan distribusi dengan blocker aktual, bukan klaim siap toko tanpa review.
- Daftar file berubah, konsekuensi kompatibilitas, risiko tersisa dan langkah rollback.

Laporkan singkat: apa yang selesai, apa yang terverifikasi, apa yang belum, serta alasan konkret. Jangan menyebut data dummy sebagai live atau mengklaim fitur berfungsi hanya karena tombolnya ada. Jangan commit/push, deploy, publish, atau membeli sesuatu tanpa otorisasi yang berlaku untuk tindakan tersebut.

Mulai dari discovery terarah, tampilkan temuan utama dan struktur implementasi, lalu langsung kerjakan alur vertikal pertama untuk kedua platform.
