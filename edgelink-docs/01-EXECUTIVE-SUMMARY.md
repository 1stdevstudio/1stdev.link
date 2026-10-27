# PRD-01: Executive Summary & Product Vision

## 1. Metadata
* **Product Name:** EdgeLink
* **Category:** Edge-Native URL Management & Link-in-Bio Platform
* **Hosting Model:** 100% Serverless Edge (Cloudflare Ecosystem)
* **Status:** Planning / Ready for Build

---

## 2. Problem Statement
* Layanan shortlink konvensional (Bitly, Linktree) membatasi fitur dasar di paywall, lambat di edge network (>150ms round-trip latency), dan menyisipkan tracking cookie berat.
* Solusi self-hosted tradisional (Shlink, Kutt) butuh VPS, Docker container, setup reverse proxy, dan pemeliharaan server database PostgreSQL/MySQL yang boros biaya ($5-$15/bulan).

---

## 3. Product Vision & Value Proposition
* **Zero Infrastructure Cost ($0):** Beroperasi murni dalam limit Cloudflare Free Tier tanpa server tetap.
* **Ultra-Low Latency (<15ms):** Eksekusi redirect dan bio profile render terjadi langsung di 300+ PoP Cloudflare edge node global tanpa cold start.
* **Privacy-First & Zero-Bloat:** Cookieless analytics, payload HTML di bawah 15 KB, tanpa JS framework berat di sisi publik.

---

## 4. Target Personas
1. **Content Creator & Influencer:** Butuh 1 halaman bio-link yang responsif, minimalis, dan tidak lambat dibuka via in-app browser (Instagram, TikTok).
2. **Affiliate & Digital Marketer:** Butuh shortlink kencang dengan parameter UTM passthrough dan metrik real-time negara/perangkat.
3. **Developer & Indie Hacker:** Butuh URL shortener dengan API terbuka yang bisa dideploy gratis selamanya.

---

## 5. Success Metrics (KPIs)
* **Redirect Latency:** P95 < 20ms, P99 < 50ms di semua region global.
* **Infrastructure Cost:** $0.00/bulan pada skala s.d. 100.000 request/hari.
* **Page Weight (Bio-link):** < 20 KB total payload HTML + CSS inline.
