# PRD-06: Security & Abuse Prevention Guidelines

Dokumen ini mendefinisikan aturan pertahanan keamanan, sanitasi URL, dan mitigasi eksploitasi pada layanan publik EdgeLink.

---

## 1. Malicious Destination & SSRF Guard

Shortlink publik sangat rawan dijadikan sarana redirect phishing, malware distribution, atau Server-Side Request Forgery (SSRF) internal scanning.

### Aturan Validasi URL Destinasi:
1. **Skema URL yang Diizinkan:** Wajib hanya `http://` dan `https://`. Skema berbahaya seperti `file://`, `gopher://`, `javascript:`, `data:`, `ftp://` langsung di-reject.
2. **Private & Loopback IP Blocking:**
   Worker memvalidasi hostname destinasi agar tidak mengarah ke private IP subnet:
   * `127.0.0.0/8` (Localhost)
   * `10.0.0.0/8` (Private LAN)
   * `172.16.0.0/12` (Private LAN)
   * `192.168.0.0/16` (Private LAN)
   * `169.254.0.0/16` (Cloud Instance Metadata Service e.g. AWS 169.254.169.254)
   * `::1`, `fc00::/7` (IPv6 Private)

---

## 2. Reserved Slugs Blocklist
Untuk mencegah konflik rute internal platform, sistem wajib mem-blacklist slug berikut:

```
admin, api, app, auth, login, logout, register, signup,
dashboard, settings, account, profile, static, assets,
cdn, status, ping, health, robots.txt, sitemap.xml,
terms, privacy, docs, help, support, edgelink
```

---

## 3. Rate Limiting & Bot Protection
* **Cloudflare Turnstile:** Wajib dilewati pada endpoint registrasi user dan pembuatan link publik tanpa login.
* **Worker In-Memory Rate Limiting:**
  * Free User: Maksimal 10 create link / menit per User ID.
  * IP Anonim: Maksimal 3 create link / menit per IP address.
* **DDoS & Scraping:** Aktifkan Cloudflare Managed Challenge otomatis jika anomali request ke endpoint redirect melebihi 500 req/detik dari 1 ASN.

---

## 4. Header Keamanan Standar Edge
Worker menginjeksi security header pada halaman profil bio-link dan API:
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; img-src * data:;`
