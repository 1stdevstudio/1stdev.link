# PRD-02: Cloudflare Free Tier Guardrails & Limits Budget

Dokumen ini mendefinisikan batas kuota Cloudflare Free Tier dan strategi arsitektur agar sistem tidak terkena hard-block limit atau overage.

---

## 1. Resource Limits Matrix

| Service | Free Tier Limit | EdgeLink Usage Profile | Safety Margin |
|---|---|---|---|
| **Cloudflare Workers** | 100.000 request/hari | Eksekusi route redirect, API, SSR bio-profile | 30.000 req buffer / hari |
| **Worker CPU Time** | 10ms per request | Routing sederhana Hono + KV lookup (~1.5ms CPU) | Sangat aman (>80% headroom) |
| **Cloudflare Pages** | Unlimited static bandwidth, 500 builds/bln | Dashboard app SPA, assets | Unlimited |
| **Cloudflare D1 (SQLite)** | 5.000.000 read/bulan, 100.000 write/bulan, 5 GB storage | Metadata user, link catalog, agregat analitik | Critical constraint: **Writes** |
| **Cloudflare KV** | 100.000 read/hari, 1.000 write/hari, 1 GB storage | Read cache routing slug -> URL | Critical constraint: **Writes** |
| **Cloudflare Turnstile** | Unlimited requests pada profil non-enterprise | Form bot protection (auth & shortlink creation) | Unlimited |
| **Email Routing** | Unlimited forwarding rules | Magic-link login routing ke inbox admin/user | Unlimited |

---

## 2. Mitigasi Batasan Kritis (Critical Constraints Mitigation)

### A. D1 Database Write Limit (100.000 write/bulan ~ 3.300 write/hari)
* **Bahaya:** Jika tiap redirect menulis event klik ke D1, kuota bulanan habis dalam hitungan jam.
* **Strategi Mitigasi:**
  1. D1 **DILARANG** mencatat raw event log per request.
  2. Gunakan query agregasi `UPSERT` per tanggal dan negara:
     ```sql
     INSERT INTO link_analytics (link_id, date, country, clicks)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(link_id, date, country) DO UPDATE SET clicks = clicks + 1;
     ```
  3. Gunakan non-blocking execution via `ctx.waitUntil()` agar latency redirect tidak menunggu query write DB.

### B. KV Write Limit (1.000 write/hari)
* **Bahaya:** Sinkronisasi slug terlalu sering atau update massal akan membentur limit 1.000 write harian.
* **Strategi Mitigasi:**
  1. KV hanya ditulis saat link baru dibuat, diubah, atau dihapus (Write-Through on mutation).
  2. Tetapkan TTL 24 jam (`expirationTtl: 86400`) agar key tidak menumpuk melebihi storage 1 GB.

### C. Worker Request Limit (100.000 req/hari)
* **Bahaya:** Viral traffic menyebabkan link redirect terhenti karena kuota 100k habis.
* **Strategi Mitigasi:**
  1. Berdayakan Cloudflare Cache API (`caches.default`) untuk bio profile statis sehingga hit di layer CDN Cloudflare tidak mengonsumsi kuota invocation Worker.
