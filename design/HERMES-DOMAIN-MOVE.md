# Hermes — Lanjutkan pindah domain ke 1stdev.link (+ perbaikan keamanan auth)

Kamu melanjutkan pekerjaan Claude yang terhenti di tengah. Baca seluruh dokumen ini sebelum menyentuh apa pun.
Project: `/Users/spixelsdev/edgelink`. Brand: **1stdev.link by 1stdev.space**.

## 0. Wajib sebelum mulai
1. `cd /Users/spixelsdev/edgelink && git fetch && git status --short && git log --oneline -5`
   - Commit terakhir harus `45eaacf feat: layout halaman Akun baru + dialog konfirmasi dalam aplikasi (0.7.3)`.
   - Harus ada 7 file belum di-commit (lihat bagian 2). Kalau berbeda, **berhenti dan laporkan**. Jangan menimpa kerja orang lain.
2. Baca `AGENTS.md` dan `.claude/CLAUDE.md`. Aturannya mutlak.

## 1. Tujuan
- Domain utama pindah dari `link.1stnear.com` ke **`https://1stdev.link`** (apex). `www.1stdev.link` → 301 ke apex.
- `link.1stnear.com` **tetap hidup**:
  - GET/HEAD halaman, link pendek, dan bio → **301** ke path yang sama di 1stdev.link (link lama yang sudah tersebar tetap jalan).
  - `/api/*` dan `/m/*` tetap dilayani langsung, **tanpa redirect**. Integrasi API lama tetap jalan, dan URL foto profil lama di database tetap valid.
  - `/` dan `/assets/*` tetap dilayani. Dashboard di domain lama membawa sesi pengguna ke domain baru lewat **kode handoff sekali pakai**.
- **Perbaikan keamanan kritis**, ikut di batch ini dan sudah dikerjakan:
  - (a) `authenticateUser` dulu menerima **id user** sebagai token (`WHERE id = ? OR api_key = ?`). Id user tampil publik di URL foto (`/m/avatars/{uid}/…`), artinya akun bisa diambil alih.
  - (b) `POST /api/auth/login` dengan **email saja** mengembalikan `api_key` tanpa OTP. Login dengan id user juga bisa.
  - Sekarang keduanya hanya menerima `api_key`. Login dengan email ditolak dengan 400 (email wajib lewat OTP).

## 2. Status sekarang (belum di-commit, belum di-deploy)
| File | Isi perubahan |
|---|---|
| `worker/src/index.ts` | Middleware domain (`PRIMARY_HOST`, `LEGACY_HOSTS`), auth hanya `api_key`, login menolak email/id, endpoint `POST /api/auth/handoff` (auth, KV `handoff:{code}` TTL 120 dtk, rate limit 10/jam per user) dan `POST /api/auth/handoff/claim` (publik, rate limit IP 20/5 mnt, sekali pakai, 400 kode salah, 410 kedaluwarsa) |
| `worker/wrangler.toml` | `routes` custom domain: `1stdev.link`, `www.1stdev.link`, `link.1stnear.com`; `BASE_URL = "https://1stdev.link"` |
| `worker/test/index.test.ts`, `worker/test/mocks.ts` | Token tes diganti ke api_key (`sec_key_456`, `k_guest`); tes baru untuk auth hardening, handoff, dan domain move. **25/25 pass** |
| `web/.env.production` | `VITE_API_URL=https://1stdev.link` |
| `web/src/api.ts` | Di 1stdev.link/link.1stnear.com, API same-origin (CSP Worker `connect-src 'self'`); mock mode tetap dari env; `createHandoff()`; klaim `?handoff=` di `getExistingSession()` |
| `web/src/main.tsx` | Host lama (link.1stnear.com, *.pages.dev): tanpa token → redirect ke 1stdev.link; dengan token → handoff lalu redirect; handoff gagal → app tetap render di domain lama |

`web/dist` sudah di-build (`index-D8a15ZMD.js`), tetapi **jangan di-deploy dulu**, karena urutan deploy penting (bagian 4).

Fakta infrastruktur (sudah dicek):
- Zone `1stdev.link` aktif di akun yang sama (`51aa41d46b787cff23bbf8f31a7c4800`), zone id `51b0e72f357271b76a748551ec462075`. DNS publik kosong, jadi tidak ada record yang bentrok.
- `link.1stnear.com` sudah menjadi **Worker custom domain** untuk `edgelink-worker`. Domain ini **harus tetap ada di `routes`**, kalau tidak wrangler akan melepasnya.
- Login OAuth wrangler tidak punya izin DNS (tidak bisa membaca record). Itu normal; wrangler tetap bisa membuat custom domain.

## 3. Sisa pekerjaan (urut)

### 3.1 Gate redirect (tambahkan dulu, wajib)
Kalau Worker langsung di-deploy dengan redirect aktif sementara sertifikat 1stdev.link belum siap, semua pengunjung link.1stnear.com akan diarahkan ke domain mati. 301 juga di-cache browser secara permanen.
- Di middleware domain di `worker/src/index.ts`, tambahkan syarat: redirect hanya jika `c.env.DOMAIN_REDIRECT === 'on'`. Kalau tidak, `return next()`.
- Tambahkan `DOMAIN_REDIRECT?: string` ke `Env` di `worker/src/types.ts`.
- `wrangler.toml` `[vars]`: `DOMAIN_REDIRECT = "off"`, dan untuk sementara kembalikan `BASE_URL = "https://link.1stnear.com"`.
- Tes: set `env.DOMAIN_REDIRECT = 'on'` di describe `domain move to 1stdev.link`, lalu tambah satu tes bahwa tanpa flag tidak ada 301.

### 3.2 Ganti teks domain (statis/SEO/docs)
Ganti `https://link.1stnear.com` → `https://1stdev.link`, lalu `link.1stnear.com` → `1stdev.link`, **hanya** di:
`web/index.html`, `web/public/llms.txt`, `web/public/llms-full.txt`, `worker/src/docs.ts`, `docs/API.md`.

Lalu:
- `worker/src/seo.ts`: komentar robots `diatur di level zona 1stnear.com.` → `diatur di level zona domain.`
- `web/src/main.tsx` sudah benar.
- `PROJECT-HANDOFF.md`: perbarui baris URL frontend.

**JANGAN diubah:**
- Theme id `'1stnear'`: tersimpan di D1, mengubahnya merusak profil.
- Pengirim email `auth@1stnear.com` di `security.ts`: domain itu yang terverifikasi di Resend.
- Contoh `destination_url` `https://1stnear.com/...` di docs.
- `PAGES_ORIGIN` (`edgelink-afl.pages.dev`).
- `design/*` (mockup lama).
- `CHANGELOG.md` riwayat lama.

### 3.3 Verifikasi lokal
```
cd worker && npm run typecheck && timeout 100 node --import tsx/esm --test --test-timeout=10000 test/index.test.ts
cd ../web && npx tsc --noEmit -p . && npm run build
```
Wajib 0 error dan semua tes pass.

## 4. Deploy (2 fase, jangan dibalik)

**Fase 1: pasang domain, redirect mati**
1. `cd worker && npx wrangler deploy < /dev/null`. Pastikan output menyebut ketiga custom domain. Kalau ada error bentrok DNS, **berhenti dan laporkan**. Jangan menghapus record DNS apa pun.
2. Tunggu sampai lolos (ulangi tiap ~30 dtk, maksimal ~10 menit):
   - `curl -sI https://1stdev.link/health` → 200
   - `curl -sI https://www.1stdev.link/health` → 200
   - `curl -sI https://link.1stnear.com/health` → 200
3. Pentest keamanan di live (tanpa membuat akun):
   - `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer usr_xxx" https://link.1stnear.com/api/auth/me` → 401
   - `curl -s -X POST -H "Content-Type: application/json" -d '{"credential":"a@b.co"}' https://link.1stnear.com/api/auth/login` → 400, tanpa `api_key` di body
   - `curl -s -X POST -H "Content-Type: application/json" -d '{"code":"bad"}' https://1stdev.link/api/auth/handoff/claim` → 400
   - `curl -s -X POST -H "Content-Type: application/json" -d "{\"code\":\"$(printf 'a%.0s' {1..64})\"}" https://1stdev.link/api/auth/handoff/claim` → 410
4. Commit lokal: `fix(security): token hanya api_key, login email wajib OTP; pasang domain 1stdev.link`.

**Fase 2: aktifkan pindah domain**
1. `wrangler.toml`: `DOMAIN_REDIRECT = "on"`, `BASE_URL = "https://1stdev.link"`. Jalankan ulang tes, lalu `npx wrangler deploy < /dev/null`.
2. `cd web && npm run build && npx wrangler pages deploy /Users/spixelsdev/edgelink/web/dist --project-name=edgelink --commit-dirty=true < /dev/null`
3. Cek live:
   - `curl -sI https://link.1stnear.com/abc?x=1` → 301 `location: https://1stdev.link/abc?x=1`
   - `curl -sI https://link.1stnear.com/@yogi_iskandar` → 301 ke `https://1stdev.link/@yogi_iskandar`
   - `curl -sI https://www.1stdev.link/` → 301 ke `https://1stdev.link/`
   - `curl -sI https://link.1stnear.com/` → 200 (SPA, tidak redirect)
   - `curl -sI https://link.1stnear.com/api/docs` → 200 (tidak redirect)
   - `curl -s https://1stdev.link/ | grep -o 'assets/index-[^"]*\.js'` sama dengan `ls web/dist/assets/*.js`
   - `curl -s https://1stdev.link/ | grep -o 'rel="canonical" href="[^"]*"'` → `https://1stdev.link/`
   - `curl -s https://1stdev.link/robots.txt | grep -i sitemap` → `https://1stdev.link/sitemap.xml`
4. Browser (in-app, **tanpa membuat akun**):
   - Buka https://link.1stnear.com di 375px dan 1280px. Harus pindah ke 1stdev.link dan tampil Welcome.
   - Buka https://edgelink-afl.pages.dev. Harus pindah ke 1stdev.link.
   - Cek console bersih (tidak ada error CSP).
5. `CHANGELOG.md`: tambahkan `## [0.8.0] - <tanggal>`:
   - Diubah: domain utama 1stdev.link; link.1stnear.com dialihkan 301; API dan media lama tetap jalan; sesi dibawa otomatis.
   - Keamanan: id user tidak lagi diterima sebagai token; login dengan email saja ditolak (wajib OTP).
6. Commit lokal: `feat: pindah domain utama ke 1stdev.link (0.8.0)`.
7. Tambahkan 1–2 baris ke `.claude/CLAUDE.md`:
   - Domain utama 1stdev.link, link.1stnear.com legacy (301, kecuali `/`, `/assets`, `/api`, `/m`).
   - Token hanya api_key.
   - Handoff `/api/auth/handoff(/claim)`.

## 5. Larangan (jangan dilanggar)
- **Jangan** query/tulis D1 remote, jangan migrasi, jangan rotasi api_key tanpa izin eksplisit pemilik.
  - Catatan: bug login-email sudah ada di production sebelumnya. Rotasi semua api_key bisa dipertimbangkan, tetapi itu akan me-logout semua orang. **Itu keputusan pemilik**: tanyakan, jangan kerjakan.
- **Jangan** membuat akun (termasuk guest) di production, dan jangan memasukkan secret apa pun.
- **Jangan** mengubah pengaturan zone/DNS/SSL/akun Cloudflare selain custom domain lewat `wrangler deploy`.
- **Jangan** menghapus `link.1stnear.com` dari `routes`.
- **Jangan** push ke remote kecuali pemilik minta. Commit lokal saja.
- UI: tanpa emoji, tanpa border 1px, tanpa kata "Cloudflare" di UI, aksen `#e9be54`, tampilkan "100% gratis".

## 6. Kalau ragu
Berhenti, tulis status (apa yang sudah, apa yang gagal, output error persis), lalu tanya pemilik. Jangan menebak, terutama soal DNS, D1, dan deploy.

## 7. Laporan akhir ke pemilik (Bahasa Indonesia, ringkas)
- Hash bundle live = lokal.
- Hasil setiap cek curl di bagian 4.
- Commit yang dibuat.
- Pertanyaan terbuka: rotasi api_key?
- Follow-up opsional, jangan dikerjakan tanpa izin: `DeviceTransferSheet` masih memakai `?sync_key=<api_key>` di URL; sebaiknya diganti ke mekanisme handoff.
