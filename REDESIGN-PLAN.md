# 1stdev.link — Rencana redesain dan perbaikan

Tanggal: 28 Oktober 2026. Status: implementasi inti lokal tersedia; lihat IMPLEMENTATION-NOTES.md untuk perubahan, verifikasi, dan pekerjaan lanjutan.
Lingkup: dashboard, editor profil, preview, SSR bio, API, auth, cache, dan struktur proyek.
PortFolio hanya referensi. Seluruh runtime tetap Cloudflare serverless; tanpa tracker pihak ketiga.

## Baseline yang sudah diverifikasi

- Working tree bersih sebelum audit.
- Worker: `npm run typecheck` lulus; `npm test` lulus 26/26.
- Web: `npm run build` lulus, menghasilkan `dist/`.
- Audit ini memakai kode lokal dan reproduksi fungsi. Belum merupakan pentest produksi atau audit visual browser.
- Shared memory gagal diakses: PostgreSQL lokal `127.0.0.1:5432` menolak koneksi.

## Temuan dan prioritas

| Prioritas | Bukti lokal | Dampak / tindakan |
| --- | --- | --- |
| P1 | `worker/src/index.ts`, PUT bio menerima `social_links` string tanpa memastikan JSON object; `worker/src/bio.ts` langsung `Object.entries()` setelah parse | `social_links: "null"` mereproduksi exception renderer. JSON rusak juga dapat tersimpan sebelum response gagal. Validasi seluruh payload sebelum write; normalisasi object; renderer defensif untuk data lama. |
| P1 | `worker/src/security.ts`, `validateDestinationUrl()` menerima `http://localhost.` dan `http://[::ffff:127.0.0.1]` dalam reproduksi lokal | Bypass kebijakan URL privat. Normalisasi hostname, blok IPv4-mapped IPv6 dan varian alamat privat. Temuan ini bukan bukti server melakukan fetch SSRF; bedakan redirect dengan fetch server. |
| P1 | `web/src/App.tsx`, `handleUpdateProfile()` langsung mengirim setiap perubahan dan menerapkan setiap response | Request tumpang tindih berpotensi menimpa perubahan terbaru. Tambahkan antrean autosave, merge patch, urutan revision, rollback/retry dan status tersimpan. |
| P1 | `worker/src/security.ts` limiter menggunakan read lalu write; OTP/handoff juga read lalu tombstone/delete | Operasi tersebut tidak memberi konsumsi atomik pada request bersamaan. Tambahkan uji concurrency; gunakan konsumsi token atomik melalui conditional D1 statement dan audit perubahan row. KV tetap lapisan pembatas IP sesuai aturan proyek; hitung biaya D1/KV sebelum penerapan. |
| P1 | `worker/src/index.ts`, verify-otp memilih target dari sesi aktif atau record dan percabangan purpose dari request atau record | Audit pengikatan purpose, email, user dan sesi; jangan mengasumsikan account takeover sudah terbukti. Tambahkan kasus sesi berbeda, purpose berbeda dan replay sebelum mengubah flow. |
| P2 | `web/src/api.ts`, `useMock = ... || !envBase` meskipun origin Worker telah terdeteksi | Build tanpa VITE_API_URL dapat memakai data mock pada domain nyata. Mock harus opt-in untuk development/demo; hapus fallback token literal dari request nyata. |
| P2 | `web/src/api.ts` masih menerima access key jangka panjang melalui `sync_key` | Migrasikan transfer perangkat ke kode sekali pakai; cek generator QR/tautan dan kompatibilitas migrasi sebelum menghapus jalur lama. |
| P2 | `web/src/App.tsx`, cache memakai key global; logout tidak mereset profile; hasil load tidak diikat ke sesi peminta | Risiko UI menampilkan profil lama setelah pergantian akun atau response terlambat. Namespace cache per user; reset state dan batalkan/abaikan response sesi lama. |
| P2 | Palet tema terpisah di preview dan `bio.ts`; preview memakai `profile.avatar_shape`, SSR memprioritaskan `style.av_shape`; SSR menerapkan font style | Paritas belum terjamin. Satukan kontrak tema, style resolver, normalisasi social dan block model; validasi semua kontrol editor terhadap preview dan SSR. |
| P2 | PUT profil menginvalidasi cache melalui background task; GET bio mengisi cache melalui background task | Ada potensi stale refill saat GET dan PUT beririsan. Uji interleaving, invalidasi handle lama/baru, versioning dan batas keterlambatan cache; jangan menjanjikan konsistensi global seketika dari KV. |
| P2 | `worker/src/index.ts` 1.591 baris; `web/src/App.tsx` 549 baris; mock fixture bercampur client API | Ekstraksi bertahap berdasarkan domain agar auth, validasi dan mutasi lebih mudah diuji. Hindari rewrite besar sebelum tes regresi. |
| P2 | `web/src/index.css` masih memiliki drop shadow; preview memakai `shadow-lg` dan karakter bintang teks | Selaraskan standar terbaru: surface solid tanpa border dekoratif/drop shadow; ikon Lucide. Jangan hapus focus indicator aksesibilitas. |

## Tahap 1 — Perbaikan keamanan dan integritas input

1. Buat validator runtime bertipe untuk auth, link, profil, media dan style; batasi tipe, panjang string, ukuran payload, enum dan jumlah social links.
2. Perbaiki validasi URL dan pertahankan `validateDestinationUrl()` pada destination, iOS dan Android, termasuk jalur update. URL avatar/cover/background/social memiliki kebijakan eksplisit sesuai pemakaiannya.
3. Amankan OTP/handoff: binding sesi/purpose, expiry absolut, konsumsi atomik, rate limit verifikasi dan error publik yang tidak membocorkan detail internal.
4. Audit setiap operasi tenant; resource milik user wajib terikat resource ID dan user ID. Query publik handle/slug dipisahkan secara eksplisit dari akses dashboard.
5. Tinjau kebijakan `verified_badge` yang saat ini bisa diubah pemilik profil: jika berarti verifikasi platform, pindahkan ke otorisasi platform; jangan tampilkan klaim verifikasi tanpa dasar.
6. Pertahankan integrasi API yang sah ketika meninjau CORS; CORS wildcard sendiri bukan bukti bypass auth. Audit CSP, escaping HTML, konteks CSS/URL, API cache-control dan token exposure.

Lulus ketika: malformed payload selalu 4xx sebelum write; dua tenant tidak dapat saling mengakses resource; OTP/handoff hanya sukses sekali pada request paralel; payload XSS dan URL privat ditolak sesuai konteks.

## Tahap 2 — Sinkronisasi data dan sesi

1. Pisahkan `useSession`, cache per user dan `useProfileAutosave` dari App.
2. Autosave mengantrekan perubahan; tampilkan `Menyimpan`, `Tersimpan`, `Gagal — coba lagi`. Perubahan cepat tidak boleh hilang atau dipulihkan oleh response lama.
3. Tambahkan generation/session guard untuk semua response; reset profile, links dan pending mutations saat akun berubah.
4. Sinkronkan reorder, edit, delete, aktif/nonaktif, pergantian handle serta cache redirect/bio; tangani kegagalan invalidasi secara terukur.
5. Tentukan perilaku offline, refresh, dua tab dan dua perangkat. Bila perlu, tambahkan revision server untuk mendeteksi konflik antarperangkat.

Lulus ketika: perubahan cepat, jaringan lambat, save gagal, logout saat request berjalan dan perpindahan akun menghasilkan state benar tanpa data akun lama.

## Tahap 3 — Kontrak bersama dan struktur

Struktur sasaran, diekstrak bertahap:

```text
shared/                 # types, themes, style resolver, block definitions; tanpa browser/Worker API
worker/src/routes/      # auth, links, profiles, media, public pages
worker/src/middleware/  # auth, security headers, request validation
worker/src/services/    # cache, OTP/handoff, profile/link mutations
worker/src/repositories/# query D1 dan pembatas tenant
web/src/features/       # session, profile editor, links, analytics
web/src/components/ui/  # field, button, sheet, dialog, status
web/src/api/            # transport, DTO normalization, domain clients
```

Tetapkan konfigurasi TypeScript/build agar shared source tersedia bagi Vite dan Wrangler. Pertahankan route, bentuk response dan data lama selama ekstraksi. Migration D1 hanya bila diperlukan, kompatibel dengan rilis sebelumnya dan diuji pada database lokal.

## Tahap 4 — Redesain dashboard dan bio

- Token wajib: `--bg: #070e0c`, `--s1: #0d1b16`, `--s2: #142821`, `--ac: #e9be54`.
- Desktop: navigasi ringkas, editor utama, preview sticky. Mobile: satu kolom dengan akses preview yang jelas; tidak ada scroll horizontal pada lebar 320–430px.
- Editor profil: identitas, konten, desain, berbagi; posisi navigasi mengikuti hash dan tetap benar setelah refresh/back/forward.
- Gunakan surface solid untuk hierarki; tanpa border dekoratif dan drop shadow. Pertahankan focus-visible, kontras, target sentuh dan reduced-motion.
- Semua ikon UI di `web/src/` menggunakan Lucide stroke 1.75/2, termasuk bintang Pilihan dan panah.
- Preview dan SSR menggunakan model presentasi serta stylesheet bio bersama bila memungkinkan, dengan renderer sesuai runtime. Badge, urutan blok aktif, social capsules, font, radius, gap, cover, wallpaper, blur/dim dan efek harus cocok.
- Profil publik tetap SSR ringan; jangan kirim React dashboard untuk merender bio. Ukur latency sebelum menetapkan target sub-15ms, pisahkan cache hit/miss dan lokasi pengukuran.

Lulus ketika: audit browser desktop/mobile, keyboard dan visual comparison tujuh tema lulus; setiap kontrol desain punya hasil sesuai pada preview dan halaman publik; scrollbar preview tersembunyi dengan konten tetap dapat digulir.

## Tahap 5 — Verifikasi dan rilis

1. Tambahkan tes regresi untuk temuan nyata sebelum fix: social JSON rusak/null/array, URL privat, autosave race, account switch, OTP/handoff concurrency dan tenant isolation.
2. Uji query/migration penting pada D1 lokal selain mock; mock sekarang tidak membuktikan perilaku transaksi atau konsistensi KV produksi.
3. Jalankan gate wajib setiap batch perubahan:

```sh
cd /Users/spixelsdev/edgelink/worker && npm run typecheck && npm test
cd /Users/spixelsdev/edgelink/web && npm run build
```

4. Pentest lokal/staging pada auth dan redirect yang berubah; tidak melakukan brute force produksi. Cek redirect perangkat, inactive/deleted links, expired/replayed codes dan escaping SSR.
5. Rilis ke `edgelink-design` dengan backend staging yang terisolasi dari D1/KV/R2 produksi; preview frontend saja tidak cukup mengisolasi mutasi backend.
6. Setelah validasi, siapkan perubahan production yang reviewable, catatan rollback dan estimasi request/read/write/storage terhadap paket gratis. Jangan menambah server, daemon atau worker berbayar.

Urutan pelaksanaan: Tahap 1 → 2 → 3 → 4 → 5; gate verifikasi tetap dijalankan sepanjang implementasi. Pecah menjadi batch kecil: keamanan profil/URL, auth, sinkronisasi, ekstraksi, lalu visual.
