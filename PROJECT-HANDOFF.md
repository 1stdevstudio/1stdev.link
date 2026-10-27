# EdgeLink — Project Architecture & Agent Handoff

Dokumen ini adalah referensi definitif bagi seluruh AI Agent (Cursor, Claude Code, Hermes, Codex, OMP Fleet) dan developer untuk memahami arsitektur, konfigurasi edge, skema data, endpoint, standar keamanan, dan cara mengoperasikan project **EdgeLink**.

---

## 1. Ringkasan Eksekutif & Filosofi Produk

- **Nama Produk**: EdgeLink
- **Model Biaya**: **$0.00 Operational Cost (100% Cloudflare Free Tier, Zero VPS, Zero External Server)**.
- **Posisi Produk**: Disruptor langsung terhadap Linktree — menggabungkan **High-Speed Smart URL Shortener** dan **Link-in-Bio Profile** dalam 1 platform serverless edge.
- **Prinsip Utama**:
  1. **100% Bebas Iklan & Zero-Tracker**: Tidak ada iklan komersial, tidak ada cookie pelacak pihak ketiga (*cookieless privacy*).
  2. **Sub-15ms Zero-JS SSR Bio**: Halaman profil (`/@handle`) di-render murni sebagai HTML/CSS statis dari Cloudflare Worker (<12KB payload), tanpa pembebanan client-side React runtime.
  3. **Smart Device Routing**: 1 tautan pintar mendeteksi `User-Agent` di Edge — otomatis mengarahkan iOS ke App Store, Android ke Google Play Store, dan laptop/desktop ke Web destination tanpa roundtrip tambahan.
  4. **Frictionless Guest-to-Claim**: Pengunjung langsung memiliki workspace aktif via `localStorage` token tanpa hambatan formulir, dan dapat menautkan email permanen kapan saja via 6-digit OTP.
  5. **Borderless Luxury Design**: Estetika modern obsidian cosmic (`#07080c`), zero 1px borders, elevasi tonal depth, dan liquid glass layering.

---

## 2. Peta Infrastruktur & Bindings Cloudflare

| Komponen | Layanan Cloudflare | ID / Identifier | Alamat URL Produksi |
|---|---|---|---|
| **Frontend Web** | Cloudflare Pages (SPA Vite + React + TS) | Project `edgelink` | `https://edgelink-afl.pages.dev` |
| **Backend API** | Cloudflare Worker (Hono v4 Edge Engine) | Service `edgelink-worker` | `https://edgelink-worker.spixdev.workers.dev` |
| **Relational DB** | Cloudflare D1 (Serverless SQLite) | `b4e3365e-f879-4dcb-bf54-308abcaab3ff` (`edgelink-db`) | Terikat via binding `env.DB` |
| **KV Cache & State** | Cloudflare Workers KV | `3592113e2791453081cb2d9b32a85ffa` (`EDGELINK_CACHE`) | Terikat via binding `env.KV` |

---

## 3. Struktur Direktori Repository

```
edgelink/
├── .gitignore                   # Mengabaikan node_modules, dist, .wrangler
├── README.md                    # Dokumentasi umum project
├── PROJECT-HANDOFF.md           # Handoff master ini
├── AGENTS.md                    # Aturan disiplin eksekusi subagent monorepo
├── worker/                      # Cloudflare Worker Edge Backend (Hono v4)
│   ├── wrangler.toml            # Konfigurasi Cloudflare Worker, D1 & KV bindings
│   ├── schema.sql               # Skema D1 SQLite master
│   ├── package.json             # Scripts & dependencies backend
│   ├── tsconfig.json            # TypeScript config backend
│   ├── src/
│   │   ├── index.ts             # Main router Hono, auth, routing, link & bio handlers
│   │   ├── types.ts             # Interface TypeScript D1, KV, User, Link, BioProfile
│   │   ├── security.ts          # Anti-SSRF, IP KV rate limiter, OTP generator, slug validator
│   │   └── bio.ts               # Generator HTML/CSS SSR zero-JS borderless luxury
│   └── test/
│       ├── index.test.ts        # Unit test suite node:test
│       └── mocks.ts             # Mock D1 & KV memory storage
└── web/                         # Frontend Dashboard SPA (Vite + React + Tailwind)
    ├── package.json             # Scripts & dependencies frontend
    ├── tsconfig.json            # TypeScript config frontend
    ├── vite.config.ts           # Konfigurasi bundler Vite
    ├── .env.production          # VITE_API_URL mengarah ke Worker remote
    └── src/
        ├── App.tsx              # Root dashboard panel, auth modals, metrics, responsive shell
        ├── index.css            # Cosmic obsidian theme, ambient glow, utility classes
        ├── types.ts             # Frontend TypeScript types (LinkItem, BioProfile, etc.)
        ├── api.ts               # Client API (auto guest session, OTP, device sync, CRUD)
        └── components/
            ├── LinkManager.tsx       # Manajemen shortlink & smart device routing
            ├── BioProfileBuilder.tsx # Kustomisasi bio, custom blocks, responsive phone preview
            ├── AnalyticsModal.tsx    # Drawer statistik klik & negara asal
            └── LegalModal.tsx        # Ketentuan Layanan & Kebijakan Privasi lengkap
```

---

## 4. Skema Database D1 SQLite (`schema.sql`)

```sql
-- 1. Tabel Users (Mendukung Guest Workspace & Akun Permanen)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  is_guest INTEGER DEFAULT 0,
  claim_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. Tabel Bio Profiles (Mendukung 6 Tema, Bentuk Avatar, Verified Badge)
CREATE TABLE IF NOT EXISTS bio_profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  social_links TEXT,            -- JSON: {"whatsapp":"...","instagram":"..."}
  theme TEXT DEFAULT 'obsidian', -- obsidian, midnight-neon, aurora-emerald, rose-gold, cyber-matrix, clean-paper
  avatar_shape TEXT DEFAULT 'circle', -- circle, squircle, rounded
  verified_badge INTEGER DEFAULT 0,   -- 1 = centang biru terverifikasi
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel Links (Mendukung Smart Device Routing & Custom Block Types)
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  ios_url TEXT,                 -- URL App Store khusus iPhone/iPad
  android_url TEXT,             -- URL Play Store khusus Android
  title TEXT,
  is_bio_entry INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  block_type TEXT DEFAULT 'link', -- link, featured, whatsapp, header
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Tabel Link Analytics (Atomic Daily Upsert Aggregation)
CREATE TABLE IF NOT EXISTS link_analytics (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- Format: YYYY-MM-DD
  country TEXT NOT NULL,        -- Format: ID, SG, US, etc.
  clicks INTEGER DEFAULT 1,
  UNIQUE(link_id, date, country),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);
```

---

## 5. Ringkasan Endpoint API Worker

| Metode | Rute Endpoint | Autentikasi | Fungsi |
|---|---|---|---|
| `GET` | `/health` | Publik | Health check status sistem |
| `GET` | `/:slug` | Publik | Core redirect engine (Smart Device Routing iOS/Android/Desktop, KV cache, async analytics) |
| `GET` | `/@:handle` | Publik | Server-rendered SSR Bio profile (<12KB zero-JS HTML, 6 themes, custom blocks) |
| `POST` | `/api/auth/guest` | Publik (IP Throttled) | Otomatis membuat guest session baru & API key unik |
| `POST` | `/api/auth/send-otp` | Publik (Rate-limited) | Mengirim kode OTP 6-digit (TTL 10 menit di KV) |
| `POST` | `/api/auth/verify-otp` | Publik / Bearer | Verifikasi OTP (Anti-brute force: 3x salah = self-destruct) |
| `POST` | `/api/auth/login` | Publik (Rate-limited) | Login lintas perangkat via Email terdaftar atau Secret Sync Key |
| `GET` | `/api/auth/me` | Bearer Token | Mengambil detail sesi aktif |
| `GET` | `/api/links` | Bearer Token | Daftar seluruh shortlink milik tenant |
| `POST` | `/api/links` | Bearer Token | Membuat link baru (Anti-SSRF, validasi slug, smart routing) |
| `PATCH` | `/api/links/:id` | Bearer Token | Mengubah status aktif atau mengubah `block_type` |
| `DELETE`| `/api/links/:id` | Bearer Token | Menghapus link permanen & invalidasi KV cache |
| `GET` | `/api/links/:id/analytics` | Bearer Token | Mengambil data analitik historis per tanggal dan negara |
| `GET` | `/api/bio-profile` | Bearer Token | Mengambil data profil bio tenant |
| `PUT` | `/api/bio-profile` | Bearer Token | Menyimpan pembaruan bio, avatar shape, verified badge, tema |

---

## 6. Standar Keamanan & Hasil Pentest

Sistem telah diuji secara menyeluruh melalui script otomatis dan lolos audit keamanan:
1. **Anti-SSRF Engine (`validateDestinationUrl`)**:
   - Memblokir IP privat / loopback (`127.0.0.1`, `localhost`).
   - Memblokir Cloud Metadata endpoint (`169.254.169.254`).
   - Memblokir LAN private subnet (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Memblokir non-HTTP schemes (`file://`, `javascript:`, `ftp://`).
2. **Multi-Tenant Data Isolation (Anti-IDOR)**:
   - Setiap mutasi D1 (`UPDATE`, `DELETE`, `SELECT`) wajib menyertakan klausa `WHERE id = ? AND user_id = ?`. Tenant B tidak bisa membaca atau memodifikasi tautan Tenant A.
3. **Anti-Account Takeover (OTP 6-Digit Verification)**:
   - Kode OTP acak kriptografis (`crypto.getRandomValues`).
   - Tersimpan di Cloudflare KV (`otp:<email>`) dengan masa berlaku 10 menit.
   - Proteksi brute-force: Setelah 3x kesalahan input kode, rekaman OTP langsung dihapus dari KV (*self-destruct*).
   - Single-use: Sekali kode terpakai, rekaman langsung dimusnahkan.
4. **4-Tier Anti-Bot & Denial-of-Wallet Guard**:
   - KV IP Throttling: Maksimal 5 pembuatan guest workspace/jam, 10 OTP request/jam, dan 30 link creation/menit per IP.
   - 404 Negative Cache: Permintaan ke slug yang tidak ditemukan di-cache di KV selama 60 detik untuk meredam brute-force scan ke database D1.
   - Atomic Aggregated Analytics: Jutaan klik redirect bot hanya memicu 1 baris agregasi harian di D1 SQLite, dieksekusi secara non-blocking via `ctx.waitUntil()`.
5. **Security Headers Edge**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - Strict Content Security Policy (CSP).

---

## 7. Prosedur Operasional & Deployment

### Menjalankan / Menguji Backend Worker:
```bash
cd /Users/spixelsdev/edgelink/worker
npm run typecheck    # Validasi tipe TypeScript
npm test             # Jalankan 6 unit test backend
npx wrangler deploy  # Deploy perubahan ke Cloudflare Worker
```

### Menjalankan / Mem-build Frontend Web:
```bash
cd /Users/spixelsdev/edgelink/web
npm run build        # Compile TypeScript & Vite bundle ke dist/
npx wrangler pages deploy dist --project-name=edgelink --commit-dirty=true
```

### Menjalankan Migrasi Database D1 Remote:
```bash
npx wrangler d1 execute edgelink-db --remote --command="<SQL QUERY>" -y
```

---
*Status Terakhir: Semua fitur aktif, 100% lulus uji tipe & pentest, live di Cloudflare Edge.*
