# AGENTS.md — Protocol for AI Agents Working on EdgeLink

Dokumen ini adalah aturan mutlak bagi agen AI yang memodifikasi codebase EdgeLink.

## 1. Aturan Arsitektur & Biaya ($0 Cost Principle)
- **Zero VPS / Serverless Only**: Jangan pernah menambahkan dependency yang membutuhkan server long-running, daemon container, atau background worker berbasis server berbayar.
- **Cloudflare Edge Native**: Semua fungsionalitas harus beroperasi di dalam batas gratis Cloudflare Workers (100k req/hari), D1 (5M read, 100k write/bulan), KV (100k read, 1k write/hari), dan Pages (unlimited bandwidth).
- **Zero Third-Party Trackers**: Jangan pernah menyematkan skrip Google Analytics, Meta Pixel, atau tracking cookie pihak ketiga apapun pada halaman profil bio publik (`/@handle`).

## 2. Aturan Keamanan & Multi-Tenant (Non-Negotiable)
1. **Multi-Tenant Isolation**: Setiap query mutasi database (`SELECT`, `UPDATE`, `DELETE`) pada data tenant WAJIB menyertakan `WHERE id = ? AND user_id = ?` untuk mencegah celah IDOR.
2. **SSRF Protection**: Sebelum menyimpan `destination_url`, `ios_url`, atau `android_url`, panggil `validateDestinationUrl(url)` dari `src/security.ts`. Jangan bypass validasi ini.
3. **HTML Escaping**: Semua input teks pengguna pada halaman SSR bio publik (`displayName`, `bio`, `title`, `handle`) WAJIB di-escape menggunakan fungsi `escapeHtml()` sebelum di-render ke dokumen HTML.
4. **KV Rate Limiting**: Endpoint mutasi publik (`/api/auth/guest`, `/api/auth/send-otp`, `/api/auth/login`, `/api/links`) wajib dilindungi oleh rate limiter berbasis IP di KV.

## 3. Standar Kualitas Desain UI (Modern Luxury, No Border)
- **Zero 1px Borders**: Jangan menambahkan kelas `border` atau `border-neutral-800` pada kartu panel dan laman bio. Gunakan elevasi warna latar transparan (`bg-white/[0.035]`), backdrop blur, dan bayangan lembut (`shadow-2xl shadow-black/40`).
- **Mobile First Responsiveness**: Panel dashboard dan editor bio harus responsif sempurna di perangkat mobile (<430px) hingga desktop layar lebar.

## 4. Protokol Verifikasi Mandiri Sebelum Selesai
Setiap perubahan kode WAJIB melewati langkah verifikasi berikut:
1. `cd worker && npm run typecheck && npm test` $\rightarrow$ Wajib 0 type error & semua unit test pass.
2. `cd web && npm run build` $\rightarrow$ Wajib build sukses menghasilkan `dist/`.
3. Lakukan pentest mandiri pada setiap endpoint auth dan redirect yang dimodifikasi.
