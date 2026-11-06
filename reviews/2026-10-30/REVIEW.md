# Review 1stdev.link — Creator, UMKM, dan Affiliate

Tanggal: 30 Oktober 2026, Asia/Jakarta. Basis: **working tree saat ini**, termasuk implementasi yang belum di-commit; HEAD `563d5f8`.

Tindak lanjut: perbaikan dan redesign sudah dirilis. Lihat [catatan rilis](/Users/spixelsdev/edgelink/reviews/2026-10-30/RELEASE.md) untuk status akhir; temuan di bawah merupakan snapshot sebelum perbaikan.

## Keputusan produk

Bangun **satu halaman publik yang membantu pengunjung mengambil tindakan**, dengan tiga preset tujuan: Creator, UMKM, dan Affiliate. Ketiganya menggunakan editor, sistem blok, dan renderer yang sama. Pengguna dapat menggabungkan kebutuhan, misalnya kreator kuliner yang sekaligus menjual produk dan merekomendasikan perlengkapan.

Urutan perbaikan: **keamanan data dan angka → alur konten sampai tindakan → optimasi pertumbuhan**. Warna dan animasi tambahan memberi dampak lebih kecil selama statistik belum lengkap, penghapusan masih ambigu, dan katalog belum memiliki aksi per item.

Review ini menghasilkan temuan dan spesifikasi pengerjaan. Tidak ada perubahan source aplikasi atau rilis produksi pada review ini.

## Bukti dan batas pemeriksaan

| Pemeriksaan | Hasil saat review |
| --- | --- |
| Worker `npm run typecheck` | Lulus |
| Worker `npm test` | 60 lulus, 0 gagal |
| Web `npm run build` | Lulus |
| JavaScript produksi | 385,46 kB; gzip 114,16 kB |
| Audit dependensi Web, termasuk development | 0 advisory |
| Audit dependensi Worker, produksi saja | 0 advisory |
| Audit seluruh dependensi Worker | 8 paket terdampak: 7 high, 1 moderate; rantai tooling development Wrangler |
| Editor di 390 × 844 | Tidak ada overflow horizontal |
| Contoh publik `@1stnear` di 320, 390, dan 1280 px | Tidak ada overflow horizontal; gambar pada pemeriksaan desktop termuat |
| Reproduksi backend | Mock D1/KV/R2, akses jaringan dimatikan |

Angka audit dependensi menunjukkan advisory paket, bukan bukti eksploitasi Worker produksi. Upgrade Wrangler merupakan pekerjaan tersendiri yang memerlukan uji kompatibilitas dan deploy dry-run; jangan memakai `npm audit fix --force` secara otomatis.

Hermes lokal memakai rute model `ag/gemini-3.8-flash-high` dengan reasoning `high` untuk pemetaan persona. Hasilnya diperiksa kembali terhadap source. Klaim normalisasi WhatsApp rusak ditolak karena kode sudah membuang karakter non-angka; QR sudah tersedia, sehingga kebutuhan sebenarnya adalah mengganti generator eksternal dan memperbaiki ekspornya. Target CTR 15% dari usulan awal juga tidak dipakai tanpa baseline.

Belum mencakup load test produksi, pengujian Safari/iOS, seluruh kombinasi tema/bahasa, penetrasi menyeluruh, maupun wawancara pengguna. Tes yang lulus saat ini belum mencakup seluruh temuan berikut.

## Temuan kode yang perlu ditangani

P1 = risiko kehilangan data atau penyalahgunaan layanan yang didahulukan. P2 = perilaku salah yang memengaruhi penggunaan, konsistensi, visibilitas, atau kuota. Seluruh temuan di tabel masih terbuka.

| ID | Prioritas | Temuan dan dampak | Perbaikan serta bukti selesai |
| --- | --- | --- | --- |
| R01 | P1 | **“Hapus dari profil” menghapus record link.** [ProfileScreen.tsx:443](/Users/spixelsdev/edgelink/web/src/components/screens/ProfileScreen.tsx:443) memanggil delete; [App.tsx:313](/Users/spixelsdev/edgelink/web/src/App.tsx:313) menghapus lewat API. Analytics mengikuti `ON DELETE CASCADE` di [schema.sql:57](/Users/spixelsdev/edgelink/worker/schema.sql:57). | Pisahkan “Lepas dari halaman”, “Sembunyikan”, dan “Hapus permanen”. Lepas cukup mengubah `is_bio_entry`. Penghapusan permanen harus jelas dan dikonfirmasi; rancang soft delete/undo. Buktikan shortlink dan statistik tetap berfungsi setelah dilepas dari halaman. |
| R02 | P1 | **Limiter KV tidak atomik.** [security.ts:110](/Users/spixelsdev/edgelink/worker/src/security.ts:110): 40 panggilan paralel dengan limit 5 seluruhnya diizinkan; counter akhir 1. Kegagalan write KV buatan pada login menghasilkan 500 umum. | Pertahankan KV sesuai aturan proyek sebagai lapisan best effort, tambahkan penegakan atomik untuk operasi sensitif dan cooldown kirim email. Uji paralel, kuota provider, dan storage failure. Ini risiko spam/kuota; bukan bukti bypass OTP, karena percobaan OTP sendiri memakai D1 atomik. |
| R03 | P2 | **“Total klik” hanya dari 10 link teratas berdasarkan klik sepanjang waktu.** [StatsScreen.tsx:46](/Users/spixelsdev/edgelink/web/src/components/screens/StatsScreen.tsx:46). Kampanye baru dengan performa tinggi pada minggu ini bisa terabaikan. | Endpoint agregasi tenant berdasarkan rentang tanggal untuk semua link yang relevan. Ranking memakai rentang yang sama. Uji >10 link, link baru, data kosong, dan pergantian rentang; hindari mengganti 10 request menjadi 100 request. |
| R04 | P2 | **Blok informasi diperlakukan sebagai shortlink.** [LinksScreen.tsx:139](/Users/spixelsdev/edgelink/web/src/components/screens/LinksScreen.tsx:139) menyediakan salin/buka untuk teks, judul, dan katalog, padahal redirect menolaknya di [index.ts:439](/Users/spixelsdev/edgelink/worker/src/index.ts:439). KPI Beranda juga menghitung seluruh record sebagai link pendek. | Gunakan klasifikasi bersama `isContentBlock`. Daftar Link hanya menampilkan entri yang benar-benar bisa diarahkan; blok informasi ada di Halaman. Uji daftar, salin, buka, filter, dan KPI. |
| R05 | P2 | **GET awal yang lambat dapat menimpa mutasi link baru di editor.** [App.tsx:150](/Users/spixelsdev/edgelink/web/src/App.tsx:150) melindungi revisi profil tetapi tetap menjalankan `setLinks(fetchedLinks)` tanpa revisi link. | Tambahkan revision guard koleksi link dan koordinasikan refresh dengan antrean mutasi. Uji GET lama selesai setelah create, edit, delete, reorder, dan perubahan sesi. Dampak utama: state/preview mundur; bukan bukti record server terhapus. |
| R06 | P2 | **Body upload dibaca penuh sebelum ukuran aktual ditolak.** [index.ts:201](/Users/spixelsdev/edgelink/worker/src/index.ts:201). Upload streaming 2 MiB tanpa Content-Length dibaca seluruhnya sebelum 413, meski batas avatar 512 KiB. | Pembacaan stream berbatas, hentikan pembacaan saat melewati batas. Tetap cek magic bytes. Uji stream besar tanpa header; tidak menyimpan objek dan tidak terus membaca seluruh body. |
| R07 | P2 | **Batas 100 blok hanya ditegakkan pada blok usaha.** [index.ts:1005](/Users/spixelsdev/edgelink/worker/src/index.ts:1005). Link biasa ke-101 diterima dengan 201. Dashboard hanya meminta 100 record di [api.ts:381](/Users/spixelsdev/edgelink/web/src/api.ts:381), sementara SSR mengambil seluruh blok aktif. | Tetapkan kuota konsisten semua tipe dan shortlink, cegah race count–insert, serta definisikan pagination. Uji batas dengan request paralel dan pastikan preview tidak terpotong dibanding publik. |
| R08 | P2 | **Usaha dengan blok terstruktur saja mendapat `noindex`.** [publicSeo.ts:55](/Users/spixelsdev/edgelink/shared/publicSeo.ts:55) mensyaratkan URL HTTP, sedangkan katalog/kontak memakai `#`. SQL sitemap di [publicSeo.ts:110](/Users/spixelsdev/edgelink/shared/publicSeo.ts:110) juga mengecualikannya. | Satu kebijakan kelayakan indeks yang mengenali isi usaha valid, status akun, dan publikasi. Tetap kecualikan halaman kosong/guest bawaan. Uji meta robots dan sitemap bersama. Ini perbaikan eligibility, bukan jaminan ranking/terindeks Google. |
| R09 | P2 | **Foto katalog dipotong persegi otomatis.** [BusinessBlockSheet.tsx:24](/Users/spixelsdev/edgelink/web/src/components/business/BusinessBlockSheet.tsx:24) memakai `prepareAvatar`, yang memotong tengah gambar di [avatarImage.ts:36](/Users/spixelsdev/edgelink/web/src/avatarImage.ts:36). | Pisahkan kompresi foto katalog dari avatar. Pertahankan rasio, beri pilihan crop dan pratinjau; display dapat memakai contain/cover sesuai konteks. Uji poster vertikal, kemasan, produk lebar, dan foto layanan. |
| R10 | P2 | **Setiap slug acak yang 404 menambah write KV.** [index.ts:450](/Users/spixelsdev/edgelink/worker/src/index.ts:450). Cache hanya membantu pengulangan path sama; scanner dengan path unik tetap memakai D1 dan KV. | Tolak pola/panjang slug tidak valid sebelum storage; pakai cache negatif edge berumur pendek dan budget miss. Jangan menulis KV global untuk setiap path acak. Cache negatif harus tetap bisa diinvalidasi saat slug dibuat. |
| R11 | P2 | **Cover/background dan upload batal tidak memiliki cleanup.** [index.ts:214](/Users/spixelsdev/edgelink/worker/src/index.ts:214) membuat objek baru, tetapi [index.ts:1528](/Users/spixelsdev/edgelink/worker/src/index.ts:1528) hanya memanggil cleanup avatar. | Inventaris referensi media bertenant, masa tenggang, lalu cleanup objek tanpa referensi. Jangan menghapus foto katalog yang dipakai blok lain. Uji ganti gambar, batal upload, serta save yang terlambat. |
| R12 | P2 | **Fokus keyboard dapat keluar dari dialog konfirmasi.** [ConfirmDialog.tsx:45](/Users/spixelsdev/edgelink/web/src/components/ConfirmDialog.tsx:45) hanya menangani Escape; `aria-modal` sendiri tidak menahan Tab. | Gunakan primitive fokus bersama dengan `Sheet`; latar tidak menerima fokus. Uji Tab/Shift+Tab, Escape, tombol Batal, dan pemulihan fokus. |

Bukti reproduksi: [backend-repro.json](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/backend-repro.json). Skrip dapat dijalankan kembali dari direktori Worker; hanya memakai data fixture dan mock.

## Fondasi yang dipertahankan

- Renderer SSR dan preview bersumber dari `shared/renderBioPage.ts`, bukan dibuat tiga kali untuk tiga persona.
- Validasi URL, escaping teks, tenant guard, pembatas payload, serta respons auth tanpa OTP produksi sudah memiliki perlindungan dan tes.
- Konsumsi OTP/handoff atomik dan antrean save profil layak dipertahankan sambil menutup celah koleksi link.
- Lima blok usaha dan delapan industri sudah tersedia. Sebagian kebutuhan creator juga sudah ada melalui video, sorotan, rate card, portofolio, dukungan, dan template WhatsApp.
- Palet hijau gelap/gold, Paper/Ink publik, serta pemisahan Isi/Tampilan/Pratinjau sudah memberikan kerangka visual yang cukup.

## Desain yang diusulkan

**Tujuan:** pengguna mengetahui apa yang perlu dibuat, melihat hasilnya, lalu membagikan halaman dengan yakin. Arah visual: sederhana, tenang, mudah dipindai, dengan foto produk/karya sebagai unsur utama.

### Onboarding dan navigasi

1. Pilih tujuan awal: **Creator / Usaha / Affiliate / Mulai kosong**. Pilihan menentukan saran blok dan checklist, bukan mengunci kemampuan akun.
2. Untuk Usaha, pilih bidang. Isi nama, kontak utama, serta satu karya/produk/tautan. Tambahan dapat menyusul.
3. Tampilkan pratinjau dan aksi berbagi setelah ada isi valid. Ajakan menyimpan akun tetap jelas untuk guest.

Navigasi utama tetap ringkas: **Beranda · Halaman · Link · Statistik**, dengan Akun pada header dan tombol tambah yang kontekstual. Di Link tersedia koleksi/kampanye ketika fitur tersebut ditambahkan. Di Halaman tetap ada **Isi · Tampilan · Pratinjau**. Hindari satu menu besar berisi semua fitur semua persona.

| Area | Perubahan desain | Hasil yang diharapkan |
| --- | --- | --- |
| Beranda | Satu prioritas berikutnya sesuai tujuan, ringkasan halaman, dan metrik yang benar | Pengguna tahu tindakan berikutnya |
| Editor desktop | Daftar blok di area kerja; form satu blok saat dipilih; preview di samping ketika ruang cukup | Lebih sedikit perpindahan dan form bertumpuk |
| Editor mobile | Daftar ringkas; buka satu editor item; tombol simpan terlihat tanpa menutupi field | Katalog besar tetap dapat dikelola dari HP |
| Katalog | Search, filter kategori, foto, harga, status; aksi ubah/duplikat/sembunyikan | Tidak membuka hingga 50 form sekaligus |
| Halaman publik | Identitas singkat, satu CTA utama, bagian yang jelas, label tindakan spesifik | Pengunjung lebih cepat menemukan tujuan |
| Penghapusan | Bedakan lepas/sembunyikan/hapus; konfirmasi sesuai dampak | Shortlink dan riwayat tidak hilang karena salah tafsir |
| Feedback | Status saving/saved/error di dekat aksi; kegagalan dapat dicoba ulang | Pengguna tahu apa yang sudah tersimpan |

Gunakan token yang sudah ditetapkan: `--bg #070e0c`, `--s1 #0d1b16`, `--s2 #142821`, `--ac #e9be54`; gold untuk aksi utama, bukan semua tombol. Radius konsisten 12/16 px, body 14–16 px, kontrol utama sekitar 44 px. Nol border/shadow dekoratif pada panel; indikator fokus aksesibilitas tetap dipertahankan. Semua ikon UI menggunakan Lucide SVG.

Landing opsional saat ini memakai stylesheet portfolio tersendiri dan memasukkan token ke `:root` ([portfolio-landing.css:1](/Users/spixelsdev/edgelink/web/src/components/portfolio-landing.css:1)). Scope token ke `.portfolio-landing` agar tidak memengaruhi editor. Arah landing sebaiknya menunjukkan contoh nyata tiga persona; klaim latency sub-15ms harus didukung pengukuran yang menjelaskan apakah CPU, TTFB, atau waktu muat, bukan mengambil angka startup deploy sebagai waktu respons pengguna.

### Alur lengkap tiap target

| Target | Kebutuhan inti | Preset awal yang disarankan | Tambahan yang bernilai |
| --- | --- | --- | --- |
| Creator | Tampilkan karya → beri konteks → terima pertanyaan kerja sama | Identitas, konten unggulan, portofolio, sosial, kerja sama | Media kit/rate card terstruktur, galeri, FAQ, tautan dukungan, formulir inquiry ringan setelah pengamanan spam siap |
| UMKM | Cari produk/jasa → pahami harga/ketersediaan → hubungi usaha | Katalog, jam buka, alamat/area layanan, kontak, pengumuman | CTA tanya produk ke WhatsApp, FAQ, galeri, QR untuk meja/kemasan; tetap dapat dipakai hanya sebagai katalog dan informasi |
| Affiliate | Temukan rekomendasi → baca alasan/ketentuan → buka marketplace | Koleksi rekomendasi, produk unggulan, label afiliasi, tautan tujuan | Product card bertautan, kategori, pencarian, campaign tags, ekspor klik, pembanding kampanye |

Katalog saat ini **belum memiliki URL/CTA per item**, lihat [business.ts:13](/Users/spixelsdev/edgelink/shared/business.ts:13) dan [renderBusiness.ts:18](/Users/spixelsdev/edgelink/shared/renderBusiness.ts:18). Ini kebutuhan baru, bukan bug terhadap MVP katalog/informasi yang dahulu dipilih pengguna.

Untuk WhatsApp, tahap awal cukup tombol **“Tanya produk ini”** dengan nama item dan pesan yang dapat diedit. Tidak diperlukan cart, pemesanan, pembayaran, atau checkout untuk membuat katalog berguna.

Untuk affiliate, pertahankan parameter referral/sub-ID dan tautan asli. Jangan otomatis menambahkan UTM atau menulis ulang URL bertanda tangan. Perbandingan sumber dapat dimulai dari shortlink berbeda per kampanye; UTM builder saja tidak otomatis membuat dashboard dapat mengukur sumber trafik. **Klik keluar bukan transaksi, komisi, pengunjung unik, atau chat terkirim.**

### UMKM lintas bidang

| Bidang | Isi khusus yang membantu | Tindakan awal |
| --- | --- | --- |
| F&B | Menu, kategori, harga, ketersediaan, jam/alamat | Tanya menu / hubungi kedai |
| Retail | Produk, ukuran/varian sebagai informasi, harga, toko online | Tanya produk / buka toko |
| Jasa | Paket, durasi, area layanan, portofolio | Tanyakan ketersediaan |
| Profesional | Layanan, pengalaman terverifikasi, studi kasus, kontak | Ajukan konsultasi |
| Penginapan/kos | Tipe kamar, fasilitas, lokasi, harga mulai | Tanya kamar tersedia |
| Properti | Listing, foto, lokasi, ringkasan spesifikasi | Jadwalkan kunjungan lewat kontak |
| Pendidikan | Program, jadwal, pengajar, biaya | Tanya kelas / buka pendaftaran |
| Lainnya | Katalog fleksibel dan informasi dasar | Pilih CTA sendiri |

Atribut khusus pada tabel adalah usulan bertahap; model saat ini masih katalog/informasi umum. Kalender ketersediaan, reservasi otomatis, stok real-time, POS, payroll, dan marketplace pembayaran memerlukan produk/operasi tambahan. Integrasi dapat berupa tautan ke layanan yang sudah dipakai usaha.

## Struktur kode yang disarankan

Pisahkan tanggung jawab setelah perilakunya dilindungi tes:

- Worker: route `auth`, `links`, `profiles`, `media`, `analytics`; helper otorisasi dan kuota bersama. `index.ts` tetap menjadi komposisi route.
- Web: hook sesi, draft profil, koleksi blok, dan statistik; revision guard dan antrean mutasi menjadi bagian kontrak state, bukan callback tersebar.
- Shared: kontrak blok versioned, validator, klasifikasi content/redirect, preset tujuan, eligibility SEO, dan renderer publik. Jangan duplikasi renderer berdasarkan persona.
- Tambahkan endpoint statistik tenant beragregasi dengan query berindeks dan rentang tanggal terbatas. Jadikan batas blok/item/media sebagai konstanta bersama yang ditegakkan server.
- Tambahkan CI untuk native gates dan tes perilaku browser penting. Tidak ada konfigurasi `.github` pada checkout yang diperiksa; integrasi CI lain belum diaudit.

Draft/Publish dan riwayat revisi adalah fitur lanjutan. Saat ini perubahan tersimpan dapat langsung memengaruhi publik. Tombol “Publish” baru baru bermakna setelah ada pemisahan snapshot draft dan publik, pengendalian konflik, serta invalidasi cache yang sesuai.

## Batas biaya dan keamanan operasional

KV Free memiliki 1.000 write/hari dan satu write/detik pada key yang sama. Karena itu limiter read–increment–write dan cache 404 per URL bukan fondasi kuota yang kuat. [Dokumentasi Cloudflare KV](https://developers.cloudflare.com/kv/platform/limits/).

D1 Free saat diperiksa menyediakan 5 juta row read/hari dan 100.000 row write/hari; catatan proyek yang menyebut per bulan perlu diselaraskan. Budget diukur sebagai row yang dibaca/ditulis, bukan sekadar jumlah query. [Dokumentasi harga D1](https://developers.cloudflare.com/d1/platform/pricing/).

Workers Rate Limiting binding juga bersifat perkiraan per lokasi, bukan counter atomik global, dan dokumentasi saat ini memerlukan Wrangler ≥4.36. Jangan menganggap penggantian ke binding langsung menyelesaikan batas ketat pengiriman email. Pilih penegakan atomik yang terukur untuk operasi sensitif; evaluasi biaya/dukungan sebelum menambahkan layanan. [Dokumentasi Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

- Simpan agregat analytics seperlunya, hindari cookie atau tracker pihak ketiga di halaman publik. Jangan menyimpan IP mentah, referrer lengkap, atau query URL tanpa tujuan dan retensi yang jelas.
- QR berbagi sudah ada lewat layanan eksternal di [ShareSheet.tsx:24](/Users/spixelsdev/edgelink/web/src/components/sheets/ShareSheet.tsx:24). Ganti dengan pembangkitan lokal dan ekspor SVG/PNG untuk mengurangi dependensi; ini berada di dashboard, bukan bukti adanya tracker publik.
- Sesi perangkat, revoke/rotate kunci, dan “keluar dari perangkat lain” adalah gap kemampuan pemulihan akun. Logout browser saat ini tidak mencabut kunci server; tidak ditemukan bukti kebocoran kunci pada review ini.
- Form lead, email otomatis, checkout, custom domain tenant, dan auto-post sosial membutuhkan kontrol penyalahgunaan, kredensial/izin, atau provider. Jangan menjanjikannya gratis tanpa batas. Auto-post dibahas sebagai integrasi terpisah, bukan syarat rilis inti.

## Roadmap pengerjaan

### Tahap 1 — Dasar yang dapat dipercaya

1. R01: pisahkan lepas/sembunyikan/hapus dan amankan aksi destruktif.
2. R02/R06/R07/R10: limiter, upload berbatas, kuota semua tipe, negative-cache budget.
3. R03/R04/R05/R08: agregasi statistik, klasifikasi link, race revalidasi, SEO usaha.
4. R09/R11/R12: foto katalog, lifecycle media, akses keyboard.
5. Perbarui tooling development pada perubahan terisolasi; rapikan dokumentasi deploy dan CI.

**Lulus tahap:** seluruh reproduksi memiliki tes regresi yang memverifikasi perilaku benar; tidak ada kehilangan riwayat saat melepas blok; angka untuk >10 link lengkap; preview dan publik konsisten; native gates lulus. Lakukan smoke auth/redirect terkontrol di staging, tanpa mengirim email atau memutasi tenant produksi sembarangan.

### Tahap 2 — Tiga perjalanan pengguna yang selesai

1. Preset Creator/UMKM/Affiliate yang dapat digabung dan tidak menimpa isi lama.
2. Editor katalog satu item, pencarian/filter, dan persiapan foto yang menjaga rasio.
3. Aksi tanya produk/jasa ke WhatsApp opsional; tautan keluar per rekomendasi affiliate.
4. Koleksi kampanye sederhana dan label afiliasi; ekspor QR lokal dan CSV statistik.
5. Template creator untuk portofolio, rate card, dukungan, dan kerja sama dengan isi contoh yang tidak otomatis diterbitkan.

**Lulus tahap:** masing-masing persona dapat membuat isi pertama, melihat preview, membagikan halaman, dan mencapai tindakan utama tanpa integrasi OAuth baru. Periksa 320/390/768/1440 px, ID/EN, keyboard, teks panjang, gambar gagal, error jaringan, dan seluruh tema yang didukung.

### Tahap 3 — Pertumbuhan yang terukur

1. Agregat view dan outbound click pihak pertama dengan filter bot, definisi tanggal/zona waktu, batas cardinality, serta retensi. Baru tampilkan CTR ketika penyebut view tersedia dan dapat dijelaskan.
2. Draft/Publish, revisi/rollback, dan deteksi konflik lintas perangkat.
3. Pemulihan/revokasi sesi perangkat; lead/inquiry dengan kontrol spam bila kebutuhan terbukti.
4. Integrasi booking, payment, newsletter atau publikasi sosial berdasarkan kebutuhan nyata dan izin provider.

**Lulus tahap:** angka mempunyai definisi yang dapat diuji; tidak mengklaim penjualan tanpa integrasi transaksi; pemakaian kuota mempunyai batas dan penanganan saat habis; koneksi provider dapat dicabut.

## Metrik keberhasilan yang diusulkan

Metrik berikut belum merupakan hasil produksi:

- Waktu dari mulai hingga isi valid pertama dan halaman pertama dibagikan.
- Persentase pengguna yang menyelesaikan tujuan awal per persona.
- Keberhasilan save, kegagalan upload/auth, dan jumlah konflik/retry.
- Klik per CTA/produk/kampanye pada rentang waktu yang sama.
- Setelah view tersedia: outbound CTR dengan definisi bot dan refresh yang jelas, tanpa menyebutnya konversi penjualan.
- Pemakaian Workers, row D1, operasi KV, dan media R2 dibanding budget harian.

Ambil baseline terlebih dahulu sebelum menetapkan sasaran angka. Gunakan wawancara beberapa pengguna tiap persona untuk menilai apakah mereka berhasil menyelesaikan tugas, bukan hanya menyukai tampilannya.

## Bukti dan perintah verifikasi

- [Ringkasan verifikasi](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/verification.json)
- [Reproduksi backend](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/backend-repro.mts)
- [Editor 390 px](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/editor-390.png)
- [Halaman publik 320 px](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/public-320.png)
- [Halaman publik 390 px](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/public-390.png)
- [Halaman publik desktop](/Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/public-1280.png)

```sh
cd /Users/spixelsdev/edgelink/worker
npm run typecheck && npm test
node --import tsx/esm /Users/spixelsdev/edgelink/reviews/2026-10-30/evidence/backend-repro.mts

cd /Users/spixelsdev/edgelink/web
npm run build
```

Skrip reproduksi saat ini menguji dan mengharapkan perilaku bug yang ditemukan; skrip tersebut adalah bukti audit, bukan acceptance suite pascaperbaikan.
