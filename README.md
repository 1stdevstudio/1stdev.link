# 1stdev.link — Halaman Creator, UMKM & Affiliate

Cloudflare native: Workers, D1, KV, R2, dan Pages. Operasi dibatasi agar dapat berjalan dalam kuota gratis; email dan layanan eksternal mengikuti ketentuan penyedianya.

## Project Structure
- `/worker`: Cloudflare Worker (Hono.js edge API, D1 SQLite, KV cache, SSR bio-profile, SSRF guard).
- `/web`: Cloudflare Pages SPA (Vite + React + TypeScript + Tailwind CSS).
- `/shared`: Kontrak blok, validasi, renderer publik/preview, dan koordinasi mutasi.
- `/edgelink-docs`: Complete PRD documentation (01 to 07).
- `/reviews/2026-10-30`: Audit, bukti pengujian, dan catatan rilis redesign.

---

## 1. Quick Deploy: Cloudflare Worker (Backend)

```bash
cd /Users/spixelsdev/edgelink/worker

# 1. Create D1 database & KV namespace (first time only)
npx wrangler d1 create edgelink-db
npx wrangler kv:namespace create EDGELINK_CACHE

# 2. Run initial database migration
npx wrangler d1 execute edgelink-db --local --file=./schema.sql
# schema.sql untuk database baru. Produksi yang sudah ada memakai migrasi
# tambahan yang belum diterapkan; jangan mengulang migrasi ALTER lama.
# Rilis 30 Oktober 2026 memerlukan 0003 sebelum Worker baru:
# npx wrangler d1 execute edgelink-db --remote --file=./migrations/0003_release_hardening.sql

# 3. Test & Typecheck locally
npm run typecheck && npm test

# 4. Deploy to Cloudflare Edge
npm run deploy
```

---

## 2. Quick Deploy: Cloudflare Pages (Frontend Dashboard)

```bash
cd /Users/spixelsdev/edgelink/web

# 1. Build production bundle
npm run build

# 2. Deploy dist/ directly to Cloudflare Pages
../worker/node_modules/.bin/wrangler pages deploy dist --project-name=edgelink --branch=main
```

---

## Guest workspace expiration (automated)

- Apply `worker/migrations/0004_guest_expiration.sql` to production **before** deploying the Worker with the cron trigger. Its one-time `enabled_at` timestamp guarantees existing guest workspaces receive a fresh seven-day grace period. Never reset this timestamp during redeploys.
- Cron runs daily at 03:30 UTC (10:30 Asia/Jakarta). It deletes at most 5 expired, unclaimed guest workspaces per day. Guest edits and new links delay expiration; verified accounts (`is_guest = 0`) are excluded.
- Dependent D1 data is removed by foreign-key cascades; KV redirects and R2 media are cleaned through durable jobs retried on the next run if needed. No new public maintenance endpoint.
- Production rollout: deploy the D1 migration first, run typecheck/tests, then deploy `edgelink-worker`. Monitor scheduled logs and `guest_cleanup_jobs` backlog. Do not manually delete older guests on rollout.

## Verification Summary
- Jalankan tes dari direktori `worker`; build frontend dari direktori `web`.
- CI menjalankan kedua pemeriksaan melalui `.github/workflows/verify.yml`.
- Preview dan halaman publik memakai renderer yang sama. Katalog mendukung CTA opsional, WhatsApp, dan keterangan afiliasi; tidak menjalankan checkout atau mengirim pesan otomatis.
- Statistik merangkum seluruh shortlink terlacak per rentang tanggal UTC. Klik bukan bukti penjualan, komisi, atau chat terkirim; tautan katalog langsung belum dihitung sebagai klik shortlink.
- Pembatas permintaan memakai counter atomik D1 dengan cache penolakan KV. Migrasi `0003_release_hardening.sql` wajib tersedia sebelum deploy.
- Bersihkan media tanpa referensi secara bertenant, setelah masa tenggang 24 jam, dengan satu pemeriksaan berbatas per hari dan cursor tersimpan. Pembersihan berlangsung saat aktivitas berikutnya; bukan penghapusan seketika.
- Pengirim OTP dikonfigurasi melalui `EMAIL_FROM`; kredensial email hanya disimpan sebagai secret Worker.
