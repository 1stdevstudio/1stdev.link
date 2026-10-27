# PRD-03: System Architecture & Technical Specifications

Dokumen ini merinci arsitektur komponen, alur data edge, dan keputusan teknis implementasi EdgeLink.

---

## 1. High-Level Architecture Diagram

```
                 +--------------------------------+
                 |       Incoming Traffic         |
                 |     (Browser / Client App)     |
                 +---------------+----------------+
                                 |
                                 v
                 +--------------------------------+
                 |  Cloudflare Global Anycast PoP |
                 |  (WAF, DDoS, SSL/TLS, Caching) |
                 +---------------+----------------+
                                 |
        +------------------------+------------------------+
        |                                                 |
[Route: /dashboard/*, /assets/*]             [Route: /:slug, /@:handle, /api/*]
        |                                                 |
        v                                                 v
+-----------------------+                     +-----------------------+
|   Cloudflare Pages    |                     |   Cloudflare Worker   |
|   (SPA Dashboard)     |                     |    (Hono.js Engine)   |
+-----------------------+                     +-----------+-----------+
                                                          |
                 +----------------------------------------+-------------------+
                 |                                                            |
                 v                                                            v
      +--------------------+                                       +--------------------+
      |   Cloudflare KV    |                                       |   Cloudflare D1    |
      | (Hot Routing Cache)|                                       | (Persistent SQLite)|
      +--------------------+                                       +--------------------+
```

---

## 2. Tech Stack Detail

| Layer | Pilihan Teknologi | Alasan Pemilihan |
|---|---|---|
| **Edge Framework** | Hono.js v4 | Runtime overhead minimal (~15KB bundle), routing super cepat di V8 Isolate, support standar Web Fetch API natively. |
| **Database** | Cloudflare D1 (SQLite) | Terintegrasi langsung dengan ekosistem Workers tanpa perlu koneksi TCP pool eksternal. |
| **ORM / Query** | Drizzle ORM | Zero-overhead, type-safe, migrasi deklaratif otomatis via D1 driver. |
| **Cache Layer** | Cloudflare KV | Key-value store terdistribusi global untuk look up target URL berbasis slug. |
| **Dashboard Frontend** | Vite + SvelteKit / React SPA | Single-page application yang di-host di Cloudflare Pages; komunikasi ke worker via REST API `/api/*`. |
| **Bot Protection** | Cloudflare Turnstile | Menangkal bot pendaftaran akun dan spam shortlink creation tanpa CAPTCHA gambar menjengkelkan. |

---

## 3. End-to-End Execution Flows

### Alur 1: Redirect Execution (<15ms SLA)
1. Request masuk: `GET https://edgelink.id/summer-sale`
2. Worker mengekstrak slug `summer-sale`.
3. Worker mengecek cache KV: `await env.KV_LINKS.get("slug:summer-sale")`.
   * **Case Hit:** Nilai JSON ditemukan `{ "url": "https://target.com", "id": "link_123" }`.
   * **Case Miss:** Query ke D1 Database -> Simpan ke KV dengan TTL 24 jam.
4. Worker mengembalikan HTTP 302 Redirect dengan header `Location: target_url`.
5. Worker memicu `ctx.waitUntil(trackClick(env.D1, linkId, country, userAgent))` secara background tanpa menahan response redirect.

### Alur 2: Bio Profile Render (Server-Side at Edge)
1. Request masuk: `GET https://edgelink.id/@yogi`
2. Worker mengekstrak handle `yogi`.
3. Worker membaca data profil dan daftar link dari KV / D1.
4. Worker menyusun dokumen HTML semantik minimalis dengan CSS inline (tanpa external render library).
5. Response dikirim dengan header `Cache-Control: public, max-age=60, s-maxage=300`.
