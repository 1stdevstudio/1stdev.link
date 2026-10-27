# PLAN: EdgeLink vs Linktree (The Edge-Native Disruptor)

## 1. Value Proposition & Moat
* **Core Pitch:** "Layanan identity & routing tertipis di dunia: <15ms cold start, zero tracking cookies, dan siap pakai dalam 2 detik tanpa wajib registrasi."
* **Cost Advantage:** $0 infra berkat Cloudflare Free Tier (Workers + D1 + KV + Pages). Linktree membakar jutaan dolar untuk server AWS dan cookie trackers.

---

## 2. The 3 Core Attack Vectors (Killer Features)

### Vector 1: Zero-Friction Guest-to-Claim Workspace
* **Current Linktree friction:** Buka landing page -> Register form -> Isi email & password -> OTP -> Onboarding quiz 5 pertanyaan -> Baru bisa input 1 link. (Waktu: ~3 menit).
* **EdgeLink Attack:** 
  1. Pengunjung masuk `edgelink-afl.pages.dev`.
  2. Frontend mendeteksi ketiadaan session, memanggil `POST /api/auth/guest`.
  3. Worker langsung mengalokasikan `user_id` unik dan handle acak (misal: `@edge_8f2a`) serta API Key rahasia di `localStorage`.
  4. Pengguna langsung bisa mengetik link dan melihat halaman live mereka dalam **3 detik**.
  5. Tersedia banner non-intrusif: *"Klaim bio-link ini dengan email Anda untuk menyimpannya permanen"*.

### Vector 2: Smart Edge Device Routing (iOS / Android / Desktop)
* Fitur berbayar mahal di Linktree ($24/bln Pro Plan).
* **EdgeLink Attack ($0 Free Tier):**
  - Schema link ditambahkan field opsional: `ios_url`, `android_url`.
  - Worker membaca header `user-agent` di edge secara native (<0.1ms compute):
    - Jika UA mengandung `iPhone`/`iPad` dan `ios_url` terisi -> Redirect ke `ios_url`.
    - Jika UA mengandung `Android` dan `android_url` terisi -> Redirect ke `android_url`.
    - Default fallback -> Redirect ke `destination_url`.
  - Satu link untuk aplikasi, game, atau link download tanpa perlu logic bercabang di client.

### Vector 3: Sub-15ms In-App Browser Experience (Anti-Bounce)
* **Kelemahan Linktree:** In-app browser Instagram/TikTok sering mencekik JavaScript eksternal sehingga halaman Linktree blank putih selama 1-2 detik.
* **EdgeLink Attack:**
  - Payload HTML bio profile di bawah 12 KB murni string template Hono di edge.
  - Zero external JavaScript, zero Google Tag Manager bloat, zero tracking pixel.
  - First Contentful Paint (FCP) di bawah 30ms langsung dari Cloudflare PoP terdekat di Jakarta/Singapura.

---

## 3. Database & Schema Upgrades (`edgelink-db`)

```sql
-- 1. Support Guest vs Claimed Users
ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN claim_token TEXT;

-- 2. Smart Device Routing on Links
ALTER TABLE links ADD COLUMN ios_url TEXT;
ALTER TABLE links ADD COLUMN android_url TEXT;
```

---

## 4. API Endpoints Roadmap

1. `POST /api/auth/guest`:
   - Membuat guest user baru (`usr_guest_xxxx`) + initial bio profile.
   - Return API key untuk disimpan di client `localStorage`.
2. `POST /api/auth/claim`:
   - Memvalidasi email user & mengonversi guest account menjadi permanent account.
3. `POST /api/links` & `PUT /api/links/:id`:
   - Tambahan payload: `ios_url`, `android_url`.
4. `GET /:slug`:
   - Edge logic deteksi User-Agent untuk redirect bersyarat.

---

## 5. UI/UX Enhancements (Dashboard)

1. **Guest Workspace Notice**:
   - Status badge di header: *"Guest Workspace (Device Isolated)"* + tombol *"Simpan Akun"*.
2. **Smart Routing Tab pada Form Link**:
   - Toggle: *"Aktifkan Smart Device Routing"*.
   - Input opsional: App Store URL (iOS) dan Google Play URL (Android).
3. **Speed Benchmark Badge**:
   - Di halaman bio profile ditambahkan badge micro: *"⚡ 12ms Edge Render (0.0s Load Time)"*.

---

## 6. Execution Steps (Phased Delivery)

* **Phase 1 (Backend Core):** Migrasi skema D1 (device routes + guest auth) & update redirect engine di Worker.
* **Phase 2 (Auth Flow):** Implementasi endpoint guest session & claim token.
* **Phase 3 (Dashboard UI):** Tambah field device routing di LinkManager dan guest banner di App.
* **Phase 4 (Live Deploy & Verification):** Deploy ke remote Cloudflare Edge & smoke testing end-to-end.
