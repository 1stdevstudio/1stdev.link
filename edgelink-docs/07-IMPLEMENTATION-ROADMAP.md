# PRD-07: Step-by-Step Implementation Roadmap

Dokumen ini membagi tahap eksekusi teknis dari setup awal hingga production deploy.

---

## Phase 1: Edge Engine & Database Foundation (Hari 1-2)
- [ ] Inisialisasi monorepo / worker project: `npm create cloudflare@latest edgelink -- --template hono`.
- [ ] Buat Cloudflare D1 database: `npx wrangler d1 create edgelink-db`.
- [ ] Buat Cloudflare KV namespace: `npx wrangler kv:namespace create EDGELINK_CACHE`.
- [ ] Konfigurasi binding di `wrangler.toml` (D1, KV, Environment Variables).
- [ ] Tulis migrasi schema D1 (`schema.sql`) dan jalankan migrasi lokal: `npx wrangler d1 execute edgelink-db --local --file=./schema.sql`.

---

## Phase 2: Core Redirect Engine & Analytics Aggregation (Hari 3-4)
- [ ] Implementasi routing redirect `GET /:slug` di Hono:
  - Cache lookup KV (`slug:<slug>`).
  - Fallback query D1 SQLite.
  - Return HTTP 302 Redirect.
- [ ] Integrasi `ctx.waitUntil()` untuk aggregated click counter:
  - Ekstrak negara via `c.req.raw.cf?.country || 'XX'`.
  - Format tanggal `YYYY-MM-DD`.
  - Eksekusi SQL `UPSERT` ke tabel `link_analytics`.
- [ ] Benchmark latency lokal & staging menggunakan `wrangler dev` dan `curl`/k6. Target: <15ms response edge.

---

## Phase 3: Minimalist Bio-Profile SSR (Hari 5)
- [ ] Implementasi endpoint `GET /@:handle`.
- [ ] Fetch data profil dan link items aktif dari D1 / KV.
- [ ] Render semantic HTML + CSS inline (Dark/Light minimal mode) tanpa runtime client JS berat.
- [ ] Pasang caching header `Cache-Control: public, max-age=60, s-maxage=300`.

---

## Phase 4: Management API & Auth Layer (Hari 6-7)
- [ ] Integrasi Cloudflare Turnstile token validation middleware.
- [ ] Implementasi API routes:
  - `POST /api/links` (dengan sanitizer URL & SSRF blocker).
  - `GET /api/links` (list link & filter).
  - `GET /api/links/:id/analytics` (metrik harian & negara).
  - `PUT /api/bio-profile` (update bio profile).

---

## Phase 5: Dashboard Frontend & Deployment (Hari 8-9)
- [ ] Scaffold SPA Dashboard di folder `/web` menggunakan Vite + Tailwind CSS.
- [ ] Sambungkan Pages build output dengan Cloudflare Pages.
- [ ] Custom domain DNS routing di Cloudflare Dashboard:
  - Apex domain `edgelink.id` -> Worker.
  - Subdomain `app.edgelink.id` -> Cloudflare Pages.
- [ ] Smoke test & load testing menyeluruh sebelum rilis publik.
