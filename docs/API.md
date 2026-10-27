# 1stdev.link by 1stdev.space — Developer API Specification

Dokumentasi resmi API 1stdev.link v1 untuk developer, integrasi sistem, dan bot otomasi.

- **Base URL Production**: `https://1stdev.link`
- **Dashboard Web**: `https://1stdev.link/` (mirror: `https://edgelink-afl.pages.dev`)
- **Protokol**: HTTPS / HTTP/2 & HTTP/3
- **Format Payload**: JSON (`Content-Type: application/json`)
- **Arsitektur Edge**: Cloudflare Workers + D1 SQLite + KV Namespace (Global Cache sub-15ms)

---

## 1. Otentikasi & Otorisasi

API EdgeLink menggunakan skema otentikasi fleksibel:

| Header | Format | Keterangan |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | Digunakan untuk JWT session token atau API Key |
| `X-API-Key` | `<api_key>` | Digunakan untuk API Key developer (`el_live_...`) |

### Format Respon Standar
Semua respon JSON mengikuti format konsisten:

```json
// Berhasil
{
  "status": "success",
  "data": { ... }
}

// Gagal
{
  "status": "error",
  "message": "Deskripsi error yang ramah pengembang"
}
```

---

## 2. Ringkasan Endpoint

### A. Publik (Tanpa Otentikasi)
- `GET /health` — Pemeriksaan status serverless edge
- `GET /:slug` — Pengalihan URL pendek (Smart Device Routing + Non-blocking Analytics)
- `GET /@:handle` atau `GET /:handle` — Halaman SSR profil bio lengkap dengan render CSS & efek aurora

### B. Otentikasi & Akun
- `POST /api/auth/guest` — Buat akun instan tanpa password/email
- `POST /api/auth/send-otp` — Kirim kode 6-digit verifikasi ke email
- `POST /api/auth/verify-otp` — Verifikasi kode OTP (klaim akun & simpan permanen)
- `POST /api/auth/login` — Masuk via Secret Sync Key atau token perangkat
- `GET /api/auth/me` — Ambil informasi sesi aktif & API Key

### C. Manajemen Tautan & Blok Bio
- `GET /api/links` — Ambil daftar link & blok profil aktif
- `POST /api/links` — Buat shortlink baru atau tambahkan blok ke bio
- `PATCH /api/links/:id` — Perbarui judul, URL tujuan, atau status aktif
- `PUT /api/links/reorder` — Urutkan ulang posisi urutan blok (disarankan debounce 800ms)
- `DELETE /api/links/:id` — Hapus tautan dan bersihkan cache KV
- `GET /api/links/:id/analytics` — Ambil statistik klik, grafik harian & negara

### D. Manajemen Profil Bio
- `GET /api/bio-profile` — Ambil data profil bio pengguna
- `PUT /api/bio-profile` — Simpan identitas profil, tema, lencana terverifikasi, dan konfigurasi style JSON

---

## 3. Detail Endpoint & Contoh Permintaan

### 3.1. Pemeriksaan Status (Health Check)
```http
GET /health
```
**Respon (200 OK):**
```json
{
  "status": "ok",
  "service": "edgelink-worker"
}
```

---

### 3.2. Redirect Shortlink
```http
GET /{slug}
```
Mengarahkan pengunjung ke URL tujuan (`302 Found`).
- **Fitur Cerdas**:
  - Jika pengunjung menggunakan perangkat iOS dan `ios_url` diisi, diarahkan ke target iOS.
  - Jika pengunjung menggunakan perangkat Android dan `android_url` diisi, diarahkan ke target Android.
  - Memperbarui metrik analitik (`total_clicks`, `clicks_today`, `countries`) secara asinkron tanpa memperlambat latensi redirect.
  - Dilindungi *anti-scan KV 404 cache* (60 detik) untuk memitigasi serangan brute-force.

---

### 3.3. Halaman Bio Publik
```http
GET /@{handle}
GET /{handle}
```
Mengembalikan dokumen HTML utuh (Server-Side Rendered) dengan performa sub-15ms dari cache Cloudflare KV global.

---

### 3.4. Buat Akun Tamu (Guest Onboarding)
Mulai menggunakan sistem secara instan tanpa registrasi.

```http
POST /api/auth/guest
Content-Type: application/json
```
**Respon (201 Created):**
```json
{
  "status": "success",
  "data": {
    "user_id": "usr_gst_abcdef123",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "sync_key": "el_sync_9876543210...",
    "api_key": "el_live_abcdef...",
    "handle": "user_xyz123",
    "is_guest": true
  }
}
```

---

### 3.5. Kirim Kode Verifikasi OTP Email
Kirim 6-digit kode OTP ke email untuk menyimpan workspace tamu atau masuk ke akun.

```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "halo@domain.com",
  "purpose": "claim" // atau "login"
}
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "message": "Verification code sent to halo@domain.com"
}
```

---

### 3.6. Verifikasi OTP Email
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "halo@domain.com",
  "code": "481920",
  "guest_id": "usr_gst_abcdef123" // opsional: jika ingin mengklaim akun tamu aktif
}
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "message": "Workspace claimed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "usr_gst_abcdef123",
    "email": "halo@domain.com",
    "is_guest": false
  }
}
```

---

### 3.7. Buat Tautan / Blok Bio
Membuat shortlink atau blok bio interaktif.

```http
POST /api/links
Authorization: Bearer <token_atau_api_key>
Content-Type: application/json

{
  "title": "Katalog Menu Kopi",
  "destination_url": "https://1stnear.com/fitur",
  "slug": "menu-kopi", // opsional: jika kosong dibuat otomatis 6 karakter Base62
  "is_bio_entry": true, // true jika ingin tampil di halaman bio
  "block_type": "link", // lihat jenis blok di bagian 4
  "ios_url": "https://apps.apple.com/app/id...", // opsional
  "android_url": "https://play.google.com/store/apps/...", // opsional
  "sort_order": 0
}
```

**Respon (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "lnk_1a2b3c4d5e",
    "slug": "menu-kopi",
    "short_url": "https://1stdev.link/menu-kopi",
    "destination_url": "https://1stnear.com/fitur",
    "ios_url": "https://apps.apple.com/app/id...",
    "android_url": "https://play.google.com/store/apps/...",
    "title": "Katalog Menu Kopi",
    "is_bio_entry": 1,
    "sort_order": 0,
    "is_active": 1,
    "block_type": "link",
    "clicks": 0,
    "created_at": 1793113500
  }
}
```

---

### 3.8. Ambil Daftar Tautan
```http
GET /api/links
Authorization: Bearer <token_atau_api_key>
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "lnk_1a2b3c4d5e",
      "slug": "menu-kopi",
      "short_url": "https://1stdev.link/menu-kopi",
      "destination_url": "https://1stnear.com/fitur",
      "title": "Katalog Menu Kopi",
      "is_bio_entry": 1,
      "block_type": "link",
      "is_active": 1,
      "clicks": 142
    }
  ]
}
```

---

### 3.9. Perbarui Blok / Tautan
```http
PATCH /api/links/{id}
Authorization: Bearer <token_atau_api_key>
Content-Type: application/json

{
  "title": "Katalog Menu Baru",
  "destination_url": "https://1stnear.com/menu",
  "is_active": 1,
  "block_type": "featured"
}
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "message": "Link updated"
}
```

---

### 3.10. Urutkan Blok Bio (Batch Reorder)
```http
PUT /api/links/reorder
Authorization: Bearer <token_atau_api_key>
Content-Type: application/json

{
  "order": [
    { "id": "lnk_second_id", "sort_order": 0 },
    { "id": "lnk_first_id", "sort_order": 1 }
  ]
}
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "message": "Links reordered"
}
```

---

### 3.11. Ambil Analitik Tautan
```http
GET /api/links/{id}/analytics
Authorization: Bearer <token_atau_api_key>
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "data": {
    "link_id": "lnk_1a2b3c4d5e",
    "total_clicks": 384,
    "timeline": [
      { "date": "2026-10-21", "clicks": 42 },
      { "date": "2026-10-22", "clicks": 58 }
    ],
    "countries": {
      "ID": 312,
      "SG": 48,
      "MY": 24
    }
  }
}
```

---

### 3.12. Perbarui Profil Bio
```http
PUT /api/bio-profile
Authorization: Bearer <token_atau_api_key>
Content-Type: application/json

{
  "display_name": "Yogi Iskandar",
  "handle": "yogi_iskandar",
  "bio": "Founder & Product Engineer 1stNear.com",
  "avatar_url": "https://example.com/foto.jpg",
  "avatar_shape": "circle", // circle | rounded | square | squircle
  "verified_badge": true,
  "theme": "1stnear", // 1stnear | obsidian | clean-paper | aurora-emerald | midnight-blue | neon-cyber
  "style": {
    "bg": "#0e1f1b",
    "accent": "#e9be54",
    "btn": "soft",
    "card_fx": "glass",
    "aurora": true
  }
}
```
**Respon (200 OK):**
```json
{
  "status": "success",
  "message": "Profile updated",
  "data": {
    "handle": "yogi_iskandar",
    "display_name": "Yogi Iskandar",
    "bio_url": "https://1stdev.link/@yogi_iskandar"
  }
}
```

---

## 4. Spesifikasi Jenis Blok Bio (`block_type`)

Sistem mendukung 14 variasi blok bio:

| `block_type` | Fungsi | `destination_url` | Contoh Penggunaan |
| :--- | :--- | :--- | :--- |
| `link` | Tombol tautan standar | URL valid | Link website, blog, artikel |
| `featured` | Tombol sorotan dengan aksen emas | URL valid | Promo spesial, produk unggulan |
| `header` | Judul seksi pemisah kategori | `#` | Label "Katalog Menu", "Media Sosial" |
| `text` | Paragraf catatan / pengumuman | `#` | Jam operasional, alamat toko |
| `divider` | Garis pemisah visual tipis | `#` | Pemisah antar bagian |
| `whatsapp` | Tombol chat WhatsApp instan | `https://wa.me/...` | Konsultasi, nomor CS, pemesanan |
| `video` | Tombol tonton video | URL YouTube/TikTok | Video promosi, tutorial |
| `social` | Tombol jejaring sosial | Profil Instagram/X/dll | Akun resmi kreator / bisnis |
| `image` | Banner gambar dengan tautan | URL tujuan | Poster promo, flyer diskon |
| `gallery` | Galeri portofolio multi gambar | URL tujuan | Foto katalog outlet |

*Catatan: Untuk blok tipe konten (`header`, `text`, `divider`), isi field `destination_url` dengan string `"#"`.*

---

## 5. Contoh Kode Integrasi

### Contoh Menggunakan cURL
```bash
# Buat link baru
curl -X POST https://1stdev.link/api/links \
  -H "Authorization: Bearer el_live_9876543210abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pesan Meja Online",
    "destination_url": "https://1stnear.com/order",
    "is_bio_entry": true,
    "block_type": "featured"
  }'
```

### Contoh Menggunakan JavaScript / Node.js
```javascript
const API_URL = 'https://1stdev.link';
const API_KEY = 'el_live_9876543210abcdef';

async function createShortlink(title, targetUrl) {
  const response = await fetch(`${API_URL}/api/links`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      destination_url: targetUrl,
      is_bio_entry: true,
      block_type: 'link'
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data.data;
}

// Eksekusi
createShortlink('Website 1stNear', 'https://1stnear.com')
  .then(res => console.log('Link berhasil dibuat:', res.short_url))
  .catch(err => console.error('Gagal:', err.message));
```

### Contoh Menggunakan Python
```python
import requests

API_URL = "https://1stdev.link"
API_KEY = "el_live_9876543210abcdef"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "title": "Promo Akhir Pekan",
    "destination_url": "https://1stnear.com/promo",
    "is_bio_entry": True,
    "block_type": "featured"
}

res = requests.post(f"{API_URL}/api/links", json=payload, headers=headers)
data = res.json()

if res.status_code == 201:
    print("URL Pendek:", data["data"]["short_url"])
else:
    print("Error:", data.get("message"))
```

---

## 6. Daftar Kode Status HTTP

- `200 OK` — Permintaan berhasil diproses.
- `201 Created` — Tautan atau akun baru berhasil dibuat.
- `302 Found` — Pengalihan URL pendek atau link bio tanpa tanda `@`.
- `400 Bad Request` — Parameter wajib tidak diisi atau format JSON tidak valid.
- `401 Unauthorized` — Token atau API Key tidak ditemukan / kadaluwarsa.
- `403 Forbidden` — Akun terkunci karena salah memasukkan OTP 3 kali.
- `404 Not Found` — Slug atau handle profil tidak ditemukan.
- `409 Conflict` — Slug atau handle kustom sudah digunakan oleh pengguna lain.
- `422 Unprocessable Entity` — Format URL tujuan tidak valid (wajib HTTPS untuk redirect).
- `429 Too Many Requests` — Melebihi batas rate limit (cooldown anti-bombing 60 detik).
- `500 Internal Server Error` — Kesalahan pada database D1 atau Cloudflare Worker.
