/**
 * Developer API Documentation HTML Renderer
 * Hosted live on https://link.1stnear.com/docs
 */

export function renderDocsHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EdgeLink Developer API — by 1stnear.com</title>
  <meta name="description" content="Dokumentasi resmi API EdgeLink v1 untuk integrasi bot, shortlink, dan bio generator.">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e9be54' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0e1f1b;
      --card: rgba(255, 255, 255, 0.04);
      --card-hover: rgba(255, 255, 255, 0.07);
      --border: rgba(255, 255, 255, 0.08);
      --tx: #e8efea;
      --tx2: #a9b8b0;
      --tx3: #8a9d94;
      --ac: #e9be54;
      --ink: #182822;
      --ok: #4ade80;
      --blue: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--tx);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      padding: 0 16px 80px;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .container { max-width: 900px; margin: 0 auto; }
    header {
      padding: 48px 0 32px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 40px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(233, 190, 84, 0.15);
      color: var(--ac);
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    h1 { font-size: 32px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 8px; }
    .subtitle { color: var(--tx2); font-size: 16px; }
    h2 { font-size: 22px; font-weight: 600; color: #fff; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    h3 { font-size: 17px; font-weight: 600; color: var(--ac); margin: 24px 0 10px; }
    p, ul { color: var(--tx2); margin-bottom: 16px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    a { color: var(--ac); text-decoration: none; }
    a:hover { text-decoration: underline; }
    
    .ep {
      background: var(--card);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    .ep-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .method {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .method.get { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .method.post { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .method.put { background: rgba(233, 190, 84, 0.15); color: #e9be54; }
    .method.patch { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .method.delete { background: rgba(248, 113, 113, 0.15); color: #f87171; }
    .path { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: #fff; }
    .auth-badge {
      font-size: 11px;
      color: var(--tx3);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: auto;
    }

    pre {
      background: #060c0a;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #bff3d8;
      margin: 12px 0;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--tx3); font-weight: 600; }
    td { color: var(--tx2); }
    code { font-family: 'JetBrains Mono', monospace; color: var(--ac); font-size: 13px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">API v1.0 • Cloudflare Edge Sub-15ms</div>
      <h1>EdgeLink Developer API</h1>
      <div class="subtitle">Dokumentasi integrasi resmi untuk shortlink, bio profil, dan sistem otomasi di <strong>link.1stnear.com</strong></div>
    </header>

    <h2>1. Otentikasi</h2>
    <p>Sertakan API Key atau Token Anda pada setiap permintaan API yang membutuhkan hak akses:</p>
    <pre>Authorization: Bearer &lt;api_key_atau_token&gt;
# Atau
X-API-Key: &lt;api_key&gt;</pre>
    <p>API Key dapat ditemukan di Dashboard menu <strong>Akun &gt; Pengembang &gt; Kunci API</strong>.</p>

    <h2>2. Endpoint Utama</h2>

    <div class="ep">
      <div class="ep-header">
        <span class="method post">POST</span>
        <span class="path">/api/links</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Buat tautan pendek baru atau tambahkan blok ke halaman profil bio.</p>
      <h3>Permintaan:</h3>
      <pre>POST /api/links
Content-Type: application/json

{
  "title": "Katalog Menu Kopi",
  "destination_url": "https://1stnear.com/fitur",
  "slug": "katalog-kopi",
  "is_bio_entry": true,
  "block_type": "featured"
}</pre>
      <h3>Respon (201 Created):</h3>
      <pre>{
  "status": "success",
  "data": {
    "id": "lnk_9a8b7c6d5e",
    "slug": "katalog-kopi",
    "short_url": "https://link.1stnear.com/katalog-kopi",
    "destination_url": "https://1stnear.com/fitur",
    "title": "Katalog Menu Kopi",
    "is_bio_entry": 1,
    "block_type": "featured",
    "clicks": 0
  }
}</pre>
    </div>

    <div class="ep">
      <div class="ep-header">
        <span class="method get">GET</span>
        <span class="path">/api/links</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Ambil seluruh daftar link dan blok bio milik pengguna aktif.</p>
      <h3>Respon (200 OK):</h3>
      <pre>{
  "status": "success",
  "data": [
    {
      "id": "lnk_9a8b7c6d5e",
      "slug": "katalog-kopi",
      "short_url": "https://link.1stnear.com/katalog-kopi",
      "destination_url": "https://1stnear.com/fitur",
      "title": "Katalog Menu Kopi",
      "is_bio_entry": 1,
      "block_type": "featured",
      "clicks": 42
    }
  ]
}</pre>
    </div>

    <div class="ep">
      <div class="ep-header">
        <span class="method patch">PATCH</span>
        <span class="path">/api/links/{id}</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Perbarui judul, URL tujuan, status aktif, atau tipe blok.</p>
    </div>

    <div class="ep">
      <div class="ep-header">
        <span class="method delete">DELETE</span>
        <span class="path">/api/links/{id}</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Hapus tautan dan bersihkan cache KV secara instan.</p>
    </div>

    <div class="ep">
      <div class="ep-header">
        <span class="method get">GET</span>
        <span class="path">/api/links/{id}/analytics</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Ambil metrik total klik, grafik kunjungan 30 hari, dan distribusi negara pengunjung.</p>
    </div>

    <div class="ep">
      <div class="ep-header">
        <span class="method put">PUT</span>
        <span class="path">/api/bio-profile</span>
        <span class="auth-badge">Wajib API Key</span>
      </div>
      <p>Simpan konfigurasi profil bio (display name, handle, bio, avatar, tema, dan efek kartu).</p>
    </div>

    <h2>3. Tipe Blok Bio (block_type)</h2>
    <table>
      <thead>
        <tr>
          <th>Tipe</th>
          <th>Keterangan</th>
          <th>Destination URL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>link</code></td>
          <td>Tombol link biasa</td>
          <td>URL https://...</td>
        </tr>
        <tr>
          <td><code>featured</code></td>
          <td>Tombol sorotan warna emas 1stNear</td>
          <td>URL https://...</td>
        </tr>
        <tr>
          <td><code>header</code></td>
          <td>Judul seksi / kategori</td>
          <td><code>#</code></td>
        </tr>
        <tr>
          <td><code>text</code></td>
          <td>Paragraf catatan / info</td>
          <td><code>#</code></td>
        </tr>
        <tr>
          <td><code>divider</code></td>
          <td>Garis pemisah visual</td>
          <td><code>#</code></td>
        </tr>
        <tr>
          <td><code>whatsapp</code></td>
          <td>Tombol WhatsApp instan</td>
          <td><code>https://wa.me/...</code></td>
        </tr>
      </tbody>
    </table>

    <h2>4. Contoh cURL</h2>
    <pre>curl -X POST https://link.1stnear.com/api/links \\
  -H "Authorization: Bearer &lt;API_KEY&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Daftar Outlet",
    "destination_url": "https://1stnear.com/jelajah",
    "is_bio_entry": true
  }'</pre>

    <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); color: var(--tx3); font-size: 13px;">
      © 2026 EdgeLink by 1stnear.com • 100% Free Forever • Global Serverless Edge
    </footer>
  </div>
</body>
</html>`;
}
