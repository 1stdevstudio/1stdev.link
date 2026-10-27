# PRD-05: API Endpoints & Core Contracts

Dokumen ini merinci spesifikasi endpoint REST API yang dilayani oleh Cloudflare Worker menggunakan Hono.js.

---

## 1. Authentication Strategy
* **Session Auth:** Header `Authorization: Bearer <JWT>` untuk request dari dashboard browser.
* **API Key Auth:** Header `X-API-Key: <key>` untuk integrasi developer eksternal.

---

## 2. Public / Redirect Endpoints

### `GET /:slug`
* **Deskripsi:** Menangani redirect URL cepat.
* **Parameter:** `slug` (path parameter).
* **Response:**
  * `302 Found` dengan header `Location: <destination_url>` jika slug valid.
  * `404 Not Found` (HTML sederhana) jika slug tidak terdaftar atau non-aktif.

### `GET /@:handle`
* **Deskripsi:** Merender bio-link profile page dalam bentuk clean HTML.
* **Parameter:** `handle` (path parameter).
* **Response:**
  * `200 OK` (Content-Type: `text/html; charset=utf-8`).
  * `404 Not Found` jika handle tidak terdaftar.

---

## 3. Management API Endpoints (`/api/*`)

### `POST /api/links`
* **Deskripsi:** Membuat shortlink baru atau bio card item.
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "destination_url": "https://spixels.id/products/mastery",
    "slug": "mastery",          // Opsional: jika kosong, generate Base62 otomatis
    "title": "Mastery Course",   // Opsional
    "is_bio_entry": true,        // Apakah tampil di bio profile?
    "sort_order": 1
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "lnk_01HXYZ1234567890",
      "slug": "mastery",
      "short_url": "https://edgelink.id/mastery",
      "destination_url": "https://spixels.id/products/mastery",
      "created_at": 1772188800
    }
  }
  ```

### `GET /api/links`
* **Deskripsi:** Mengambil daftar link milik user yang sedang terautentikasi.
* **Query Parameters:** `page=1`, `limit=20`, `filter=bio|shortlink`
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "lnk_01HXYZ1234567890",
        "slug": "mastery",
        "destination_url": "https://spixels.id/products/mastery",
        "clicks": 1420,
        "is_active": 1
      }
    ]
  }
  ```

### `GET /api/links/:id/analytics`
* **Deskripsi:** Mendapatkan metrik performa klik berdasarkan tanggal dan negara.
* **Query Parameters:** `range=7d|30d`
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "total_clicks": 1420,
      "by_date": [
        { "date": "2026-10-25", "clicks": 310 },
        { "date": "2026-10-26", "clicks": 450 }
      ],
      "by_country": [
        { "country": "ID", "clicks": 1200 },
        { "country": "SG", "clicks": 150 },
        { "country": "MY", "clicks": 70 }
      ]
    }
  }
  ```

### `PUT /api/bio-profile`
* **Deskripsi:** Update konfigurasi halaman profil bio-link pengguna.
* **Request Body:**
  ```json
  {
    "display_name": "Yogi Iskandar",
    "bio": "Security Researcher & Architect",
    "avatar_url": "https://assets.edgelink.id/avatars/yogi.png",
    "theme": "minimal-dark",
    "social_links": {
      "github": "https://github.com/spixels",
      "twitter": "https://x.com/spixels"
    }
  }
  ```
