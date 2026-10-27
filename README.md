# EdgeLink — Serverless Shortlink & Bio-Link Platform

100% Cloudflare Native ($0 Infrastructure Cost).

## Project Structure
- `/worker`: Cloudflare Worker (Hono.js edge API, D1 SQLite, KV cache, SSR bio-profile, SSRF guard).
- `/web`: Cloudflare Pages SPA (Vite + React + TypeScript + Tailwind CSS).
- `/edgelink-docs`: Complete PRD documentation (01 to 07).

---

## 1. Quick Deploy: Cloudflare Worker (Backend)

```bash
cd /Users/spixelsdev/edgelink/worker

# 1. Create D1 database & KV namespace (first time only)
npx wrangler d1 create edgelink-db
npx wrangler kv:namespace create EDGELINK_CACHE

# 2. Run initial database migration
npx wrangler d1 execute edgelink-db --local --file=./schema.sql
# For remote production:
# npx wrangler d1 execute edgelink-db --remote --file=./schema.sql

# 3. Test & Typecheck locally
npm test
npm run typecheck

# 4. Deploy to Cloudflare Edge
npm run deploy
```

---

## 2. Quick Deploy: Cloudflare Pages (Frontend Dashboard)

```bash
cd /Users/spixelsdev/edgelink/web

# 1. Build production bundle
npm run build

# 2. Deploy dist/ directly to Cloudflare Pages
npx wrangler pages deploy dist --project-name=edgelink-dashboard
```

---

## Verification Summary
- **Backend Tests:** 6/6 tests passing (`node --test`), TypeScript 0 errors.
- **Frontend Build:** Clean Vite build -> `dist/` (0 errors).
- **Latency Target:** Sub-15ms edge redirects via KV cache + non-blocking `ctx.waitUntil()` D1 analytics UPSERT.
