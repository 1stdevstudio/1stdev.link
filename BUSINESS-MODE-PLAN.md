# 1stdev.link — Desain baru dan Mode Usaha

Status: fondasi MVP sudah diimplementasikan dan dirilis; lihat BUSINESS-MODE-IMPLEMENTATION.md. Fitur lanjutan tetap mengikuti tahapan di bawah. Tanggal: 28 Oktober 2026.
Keputusan pengguna: katalog dan informasi usaha; mencakup usaha lain, bukan hanya F&B.

## Arah produk

Satu halaman untuk memahami sebuah usaha: apa yang dijual, kisaran harga, lokasinya, kapan bisa dikunjungi, dan cara menghubunginya.

Ada dua susunan awal halaman: Personal dan Usaha. Mode Usaha menyediakan preset bidang, bukan akun baru atau dashboard terpisah. Pengguna tetap bebas mencampur blok; sebuah kedai boleh menambah produk kemasan, sebuah salon boleh menampilkan layanan dan produk.

Tema mengatur tampilan. Preset usaha mengatur jenis dan urutan konten. Mengganti tema tidak mengubah data; mengganti preset menawarkan blok tambahan tanpa menghapus konten yang sudah ada.

## Bentuk visual baru

- Dashboard memakai palette wajib: `#070e0c`, `#0d1b16`, `#142821`, aksen `#e9be54`. Surface solid, tanpa border dekoratif atau drop shadow; fokus keyboard tetap terlihat.
- Hierarki lebih ringan: judul singkat, satu aksi utama per bagian, ruang kosong cukup, tombol sekunder tenang. Radius panel 16px, input/tombol 12px, label kecil tidak memakai huruf kapital berlebihan.
- Nama usaha menjadi identitas utama; foto profil bundar tidak lagi mendominasi. Cover foto bersifat opsional, rasio 16:9, dapat dimatikan agar katalog langsung terlihat.
- Halaman publik punya dua pilihan tampilan: Paper (krem hangat, teks arang, aksen merek) dan Ink (gelap mengikuti palet merek). Keduanya tetap tanpa border/shadow panel. Paper merupakan tema publik tambahan; dashboard tetap memakai token wajib.
- Katalog ditampilkan sebagai baris yang mudah dipindai: thumbnail, nama, deskripsi pendek, harga dan label ketersediaan. Pengguna bisa memilih grid dua kolom jika produk membutuhkan foto besar.
- Tipografi: satu sans-serif untuk antarmuka dan konten, bobot 400/500/600; serif opsional hanya untuk nama usaha. Tidak menumpuk banyak keluarga font.
- Ikon Lucide stroke 1.75/2. Label tidak bergantung pada warna atau ikon saja. Harga menggunakan `Intl.NumberFormat`, bukan singkatan yang ambigu.
- Gerakan hanya untuk membuka detail dan berpindah kategori; mendukung reduced-motion. Tidak ada carousel otomatis atau efek atmosfer bawaan.

## Editor yang lebih sederhana

Desktop: navigasi ringkas, area editor maksimal sekitar 720px, preview halaman di kanan. Mobile: satu kolom dengan tab Isi / Tampilan / Preview; tombol Tambah blok selalu mudah dijangkau tanpa menutupi konten.

Alur awal:

1. Pilih Personal atau Usaha.
2. Pilih bidang usaha; boleh dilewati.
3. Isi nama dan deskripsi singkat, lalu tambahkan kontak/lokasi bila ada.
4. Sistem menyiapkan daftar blok draft yang sesuai bidang; hanya data yang sudah dilengkapi yang masuk halaman publik.
5. Edit blok langsung dari daftar: nama blok, ringkasan isi, tampil/sembunyi, geser, duplikat, hapus dengan undo.

Tambah blok membuka pustaka yang dikelompokkan menurut fungsi: Penawaran, Informasi, Bukti usaha, Hubungi, dan Dasar. Tampilkan rekomendasi sesuai bidang di bagian pertama; semua blok tetap bisa dicari.

Setiap blok mempunyai form khusus, preview langsung, dan status simpan yang jelas. Hindari meminta pengguna mengisi teks panjang atau URL untuk membuat data yang sebenarnya terstruktur, seperti jam buka dan harga.

## Blok yang dapat digunakan lintas bidang

| Blok | Isi dan perilaku | Tahap |
| --- | --- | --- |
| Identitas usaha | Nama, deskripsi, logo, cover opsional; memakai profil yang ada | MVP |
| Katalog | Kategori, item, foto opsional, deskripsi, harga tetap/mulai dari/tanya harga, tersedia/habis/nonaktif | MVP |
| Layanan | Nama layanan, ringkasan, durasi opsional, harga; memakai model item katalog dengan penyajian layanan | MVP |
| Info usaha | Alamat ringkas, jam buka per hari, zona waktu, catatan kunjungan, pengecualian libur, tutup sementara | MVP |
| Lokasi | Alamat dan tautan Buka peta; tidak memuat embed peta pihak ketiga | MVP |
| Kontak | Telepon, WhatsApp, email dan social; tidak memaksa pengunjung memulai transaksi | MVP |
| Pengumuman | Informasi penting dengan jadwal tampil opsional; tanpa urgensi atau diskon fiktif | MVP |
| Galeri | Foto tempat, hasil pekerjaan, produk atau fasilitas; caption dan alt text | Lanjutan |
| FAQ | Pertanyaan/jawaban singkat, detail bisa dibuka dengan keyboard | Lanjutan |
| Fasilitas | Daftar fasilitas yang diisi pemilik, misalnya parkir, Wi-Fi, akses kursi roda | Lanjutan |
| Detail spesifikasi | Atribut terstruktur: ukuran, bahan, luas, kamar, kapasitas, dan sebagainya | Lanjutan |
| Ulasan | Tautan ke ulasan atau testimoni nyata yang memiliki izin tampil; tidak membuat rating/agregat tanpa sumber | Lanjutan |
| Link / judul / teks / pemisah | Blok lama tetap didukung | Sudah ada |

Tidak semua blok berupa tombol. Katalog dan info usaha harus dapat dibaca langsung di halaman publik. Kontak atau peta muncul sebagai aksi kontekstual yang jelas.

## Preset menurut bidang

| Bidang | Susunan awal | Penyesuaian utama |
| --- | --- | --- |
| F&B: kafe, resto, bakery, katering | Identitas → pengumuman opsional → kategori/menu → jam buka/lokasi → kontak | Kategori menu; harga per porsi/box; label habis; keterangan bahan dari pemilik tanpa mengklaim bebas alergen |
| Retail: fashion, kerajinan, toko produk | Identitas → katalog/kategori → info toko → kontak | Foto produk, bahan/ukuran ringkas, harga dan status tersedia; variasi kompleks menyusul |
| Jasa: salon, bengkel, laundry, studio | Identitas → daftar layanan → cara kunjungan → jam/lokasi → kontak | Durasi layanan opsional; harga mulai dari; area layanan untuk usaha yang datang ke pelanggan |
| Profesional: konsultan, freelancer, agensi | Identitas → layanan/paket → hasil kerja → FAQ → kontak | Paket jasa, lingkup pekerjaan, tautan portofolio; tanpa klaim hasil yang tidak dapat dibuktikan |
| Penginapan: homestay, vila, kos | Identitas → unit/kamar → fasilitas → kebijakan/FAQ → lokasi/kontak | Harga per malam/bulan dengan label jelas; ketersediaan bukan kalender reservasi real-time |
| Properti: agen atau pemilik listing | Identitas → daftar properti → spesifikasi → lokasi/kontak | Harga jual/sewa, luas, kamar, lokasi yang aman ditampilkan; jangan menampilkan alamat privat tanpa izin |
| Kelas dan kursus | Identitas → program/kelas → jadwal → FAQ → kontak | Harga per sesi/paket, format kelas, jadwal dari pemilik; bukan sistem pendaftaran siswa |
| Usaha lainnya | Identitas → katalog atau layanan → informasi → kontak | Kanvas bebas dengan blok yang sama |

Peluncuran pertama: F&B, Retail, dan Jasa. Preset lainnya memakai fondasi yang sama, lalu ditambahkan setelah blok galeri/FAQ/fasilitas/spesifikasi siap. Pustaka blok tetap dapat digunakan oleh bidang lainnya sejak awal.

## Contoh halaman publik

Kedai Sore: nama dan deskripsi → Menu / Minuman / Camilan → Es kopi susu Rp22.000, roti panggang Rp18.000 → jam buka dan alamat → Buka peta / Hubungi.

Studio Nala: nama dan deskripsi → Potong / Perawatan / Paket → Haircut mulai Rp60.000 dengan durasi 45 menit → jadwal dan catatan kunjungan → Buka peta / Hubungi.

Ruang Kayu: nama dan deskripsi → Meja / Kursi / Aksesori → foto, nama produk, bahan singkat dan harga → info toko/showroom → Buka peta / Hubungi.

## Batas MVP

- Katalog informasional. Tidak ada keranjang, checkout, pembayaran, invoice, manajemen stok, atau pencatatan pesanan.
- Harga dan ketersediaan adalah informasi dari pemilik, bukan sinkronisasi POS/marketplace. Jangan menampilkan status inventori real-time.
- Status buka dihitung dari jadwal dan zona waktu serta override tutup sementara. Bila belum diisi, tampilkan Jam buka belum tersedia; jangan mengasumsikan usaha buka.
- Saat jam operasional melewati tengah malam, aturan hari asal tetap berlaku sampai jam tutup berikutnya. Uji pergantian hari dan pengecualian libur.
- Hubungi membuka kanal kontak yang dipilih pemilik. Tidak ada pesan keluar yang dikirim otomatis oleh aplikasi.
- Contoh harga, foto dan alamat dalam preset tetap draft dan tidak pernah diterbitkan sebagai data usaha nyata.

## Struktur data dan integrasi kode

Gunakan registry blok bersama di `shared/`: tipe, label, default, validator runtime, batas payload, dan renderer. Field form editor boleh memiliki komponen React khusus. Preview dan publik tetap memakai renderer HTML yang sama di `shared/renderBioPage.ts`.

Usulan data:

- `bio_profiles`: kolom additive `business_json`, memuat `version`, `page_mode`, `industry`, dan konfigurasi tampilan bisnis yang tervalidasi; jangan menyelipkan data usaha ke field warna/style.
- `links`: kolom additive `data_json`, untuk data bertipe sesuai `block_type`. Nama, harga dan rincian katalog bukan JSON yang disimpan dalam `title` atau `destination_url`.
- Registry awal menambah `catalog`, `business_info`, `location`, `contact`, `announcement`; layanan merupakan variasi presentasi katalog dengan item berjenis layanan.
- Satu blok katalog memuat maksimal 50 item, maksimal 8 kategori; field item: ID stabil, kategori, nama ≤100 karakter, deskripsi ≤240 karakter, foto opsional, harga integer dalam rupiah (IDR untuk MVP), jenis harga, label satuan, ketersediaan, durasi opsional.
- Harga tidak menggunakan float. Nilai MVP disimpan sebagai rupiah utuh, misalnya 22000 untuk Rp22.000; currency IDR dan tampilan tanpa desimal, dan semua nilai harus non-negatif dalam batas yang ditentukan validator. Harga kosong tidak berarti gratis; gunakan jenis harga eksplisit.
- Batasi `data_json` per blok ≤32 KiB dan jumlah blok usaha per profil; validasi ukuran UTF-8, bukan hanya panjang string. Request API tetap mengikuti batas 64 KiB yang ada.
- Harga, kategori, durasi dan jadwal harus merupakan data terstruktur. Jalur create, update dan read memakai kontrak yang sama; backend tidak boleh membuang `data_json` diam-diam.
- Migrasi default adalah Personal untuk semua profil lama. Memilih preset tidak mengganti URL/handle atau mengubah blok lama. Blok informasi tidak memiliki short redirect; route slug harus menolak tipe blok yang bukan navigasi.
- Preset menambahkan draft dalam satu batch transaksi D1 setelah preview perubahan; bisa dibatalkan tanpa menghapus blok lama. Setiap mutasi tetap dibatasi pemilik tenant dan menginvalidasi cache terkait.

Temuan kode saat audit: template usaha saat ini sebagian besar hanya menghasilkan link, teks atau WhatsApp. Renderer belum merender `image`/`gallery` sebagai galeri khusus; create link juga belum menyimpan metadata bisnis terstruktur. Menambah pilihan F&B di UI saja belum cukup membuat katalog yang sesungguhnya.

## Keamanan dan biaya

- Validasi URL tujuan memakai `validateDestinationUrl()`; upload foto memakai pipeline R2 yang ada. Jangan mengambil URL gambar arbitrary dari backend.
- Semua teks SSR di-escape; tidak menerima HTML, CSS atau skrip dari data blok. Rich text dibatasi teks biasa pada MVP.
- Mutasi memakai auth dan isolasi ID/user; batch preset tidak boleh berisi ID milik tenant lain. `business_json` hanya dibaca dari profil pemilik yang benar pada editor.
- Halaman publik tanpa tracker dan embed pihak ketiga. Peta, marketplace dan social hanya tautan keluar.
- Gunakan SSR dan data cache yang ada; filter kategori bisa ditingkatkan dengan script kecil dari origin sendiri, tetap dapat membaca semua item tanpa JavaScript. Tidak perlu aplikasi React publik, layanan pencarian berbayar atau server baru.
- Foto lazy-load di bawah fold, dimensi/aspect-ratio stabil dan kompresi melalui upload yang ada. Jangan mengunggah foto resolusi asli untuk thumbnail.
- Draft edit disimpan dalam antrean/debounce; filter kategori di sisi pembaca tidak menulis D1/KV. Ukur tambahan payload serta operasi read/write sebelum rollout.

## Tahap pelaksanaan dan kriteria selesai

1. Bentuk visual: prototipe editor dan halaman publik untuk F&B/Retail/Jasa. Uji nama panjang, tanpa foto/harga, data kosong, layar 320/390/430/1440px, serta keyboard.
2. Fondasi blok: registry bersama, kontrak JSON versioned, validator, migrasi additive dan compatibility test profil lama. Pastikan rollback rilis masih dapat membaca profil lama; blok baru disembunyikan oleh renderer lama jika rollback diperlukan.
3. Mode Usaha MVP: pemilih mode/preset, editor katalog/layanan, info usaha, lokasi, kontak, pengumuman, add/edit/reorder/show-hide/duplicate/undo. Semua perubahan tersimpan dan muncul identik di preview/publik.
4. Regresi dan keamanan: tes harga/currency, relasi kategori-item, jadwal lintas tengah malam, timezone, cache, payload rusak, XSS, SSRF, IDOR, draft, serta batas ukuran/jumlah item. Jalankan typecheck + semua tes Worker dan build web.
5. Rilis: resource staging terisolasi; verifikasi profil Personal tetap sama dan preset tidak menghapus konten; migrasi produksi dan deploy sesudah rancangan diterima untuk implementasi.
6. Pengembangan berikutnya: galeri, FAQ, fasilitas, spesifikasi dan preset bidang lanjutan. Keranjang/checkout hanya menjadi proyek lain jika diminta kemudian.

Keberhasilan MVP: pemilik usaha dapat menyiapkan katalog atau layanan beserta informasi kedai/toko tanpa menyusun tautan satu per satu; pengunjung memahami penawaran, harga, lokasi dan kontak langsung dari halaman tersebut.
