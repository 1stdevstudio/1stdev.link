# EdgeLink: Redesign Flow & Use Case (v2, mobile-first)

Prototipe: [prototype-v2.html](prototype-v2.html) (klik semua layar, responsive 320px–1920px).
Data, API, dan skema D1 **tidak berubah**. Ini redesign lapisan UI di `web/`.

## Prinsip
1. **Bio dulu, shortlink kedua.** Kebanyakan orang datang untuk bio-link.
2. **Satu layar, satu tugas.** Form lanjutan disembunyikan di "Opsi lanjutan".
3. **Bahasa awam.** Istilah teknis hanya ada di Pengaturan → Developer.
4. **Selalu bisa dibagikan.** Profil baru langsung berisi blok contoh, tombol Bagikan selalu ada.
5. **Jujur soal data guest.** Risiko kehilangan akun dijelaskan dengan satu kalimat.

## Use case
| ID | Persona | Tujuan | Jalur |
|---|---|---|---|
| U1 | Kreator / UMKM | Punya halaman bio untuk Instagram/TikTok | Sambutan → "Halaman profil" → Editor profil → Bagikan |
| U2 | Marketer / affiliate | Link pendek + jumlah klik | Sambutan → "Pendekkan link" → Link → Statistik |
| U3 | Pengguna yang sudah memakai | Simpan akun / pindah HP | Banner "Simpan akun" → Email → OTP 6 digit → Selesai; HP baru: Masuk → Email/QR |
| U4 | Developer | API key | Pengaturan → Developer (tersembunyi dari pengguna umum) |

## Peta layar
```
Sambutan (pertama kali, tanpa sesi)
 ├─ Halaman profil ─┐
 ├─ Pendekkan link ─┤→ auto POST /api/auth/guest → App
 └─ Masuk ──────────→ Email→OTP  |  Scan QR / kode pindah perangkat

App (navigasi: bottom bar di mobile, sidebar di ≥1024px)
 ├─ Profil   : header profil, daftar blok (drag), + Tambah blok (sheet: Link / Sorotan / WhatsApp / Judul), Tampilan (tema, bentuk avatar)
 │             ≥1024px: pratinjau HP live di kolom kanan
 ├─ Link     : daftar shortlink + pencarian, FAB "+" → sheet Tambah link (Link tujuan, Judul, Opsi lanjutan: nama link, App Store/Play Store, tampilkan di profil)
 ├─ Statistik: total klik 7/30 hari, link teratas, negara; ketuk link → detail
 └─ Akun     : Simpan akun / email, Pindah perangkat (QR + kode), Tampilan, Developer (API key), Ketentuan & Privasi
Global: tombol Bagikan (salin, QR, WhatsApp, Instagram), toast "Tersimpan", banner guest
```

## Breakpoint
| Lebar | Layout |
|---|---|
| < 640px | 1 kolom, bottom nav 4 tab, sheet dari bawah, FAB |
| 640–1023px | 1 kolom lebar maks 640px di tengah, bottom nav, sheet berupa dialog tengah |
| ≥ 1024px | Sidebar 240px + konten maks 720px + (Profil) pratinjau HP 360px |

## Kamus istilah
Destination URL → Link tujuan · Custom Slug → Nama link sendiri · Label → Judul tombol ·
Smart Device Routing → Arahkan HP ke App Store / Play Store · Klaim Akun → Simpan akun ·
Secret Sync Key → Kode pindah perangkat · is_bio_entry → Tampilkan di profil ·
block featured → Sorotan · block header → Judul bagian

## Design token
bg `#07080c` · surface `white/4%` · surface-2 `white/7%` · input `white/9%` · text `#f2f3f7` · text-2 `#b4b8c5` ·
accent `#7c8cff` (ink `#0b0d16`) · ok `#4ade80` · warn `#fbbf24` · radius 4/6/8 (minim, tanpa pill) · ikon garis SVG 1.75px stroke, **tanpa emoji** · tap target ≥44px ·
body Inter 15px, minimal 13px · mono JetBrains hanya untuk URL/slug · focus ring 3px accent/55% · tanpa border 1px.

## Positioning: 100% gratis (wajib tampil tegas)
- Teks baku ID: **"100% gratis, selamanya. Semua fitur, foto, dan efek tanpa biaya. Tanpa paket berbayar, tanpa kartu kredit, tanpa iklan."**
- Teks baku EN: **"100% free, forever. Every feature, photo and effect at no cost. No paid plans, no credit card, no ads."**
- Tampil di: layar Sambutan (hero), editor (strip hijau di atas tab), menu Akun, footer halaman bio publik ("Dibuat dengan EdgeLink · gratis 100%" / "Made with EdgeLink · 100% free"), meta description.
- Jangan pernah ada kata "Pro", "Premium", "Upgrade", gembok fitur, atau batas yang dikesankan berbayar.

## Bahasa: Indonesia + English
- Semua teks UI lewat kamus i18n (`web/src/i18n/id.ts`, `en.ts`), default dari `navigator.language`, toggle ID/EN di topbar + menu Akun, simpan di localStorage.
- Halaman bio publik: label sistem (footer, tombol WhatsApp default) ikut `Accept-Language`; isi buatan user tidak diterjemahkan.
- Kamus istilah EN: Link tujuan → Destination link · Sorotan → Highlight · Judul bagian → Section title · Simpan akun → Save account · Kode pindah perangkat → Device transfer code.

## Bio editor v3 (kustomisasi bebas)
Prototipe: [bio-editor-v3.html](bio-editor-v3.html). Tab Isi / Gaya / Efek, pratinjau live.
- Kepala: foto sampul, foto profil (bulat/membulat/kotak, cincin aksen), nama, bio, centang verifikasi.
- Latar: warna / gradien / foto (blur, gelapkan), efek butiran film & aurora.
- Gaya: aksen, huruf (Modern/Klasik/Kode/Bulat), tombol (Lembut/Padat/Kaca/Garis/Bayangan), sudut 0–28px, jarak.
- Efek: masuk (Muncul/Naik/Memantul), sentuh (Terangkat/Bercahaya/Tertekan), per-blok (Kilau/Denyut/Goyang/Miring; gambar: Zoom/Hitam-putih→warna). CSS murni, hormati reduced-motion.
- Blok: Link (+gambar kecil), Sorotan, Gambar (rasio 1:1/4:5/16:9/3:1), Galeri (3–9), Video, Teks, Judul bagian, WhatsApp, Ikon sosial, Garis.
