# Public asset/media cache — 29 Oktober 2026

Deployed Worker version: `9c28b1ba-e511-4027-8631-f5f9ff8760fd`.

`worker/src/publicCache.ts` implements Cache API for public Pages assets, R2 images, SEO files and sitemap. Browser TTL86400/edge2592000 seconds; sitemap browser1800/edge3600 seconds. Cache key preserves host/path/query with reserved `__edgelink_public_cache=v1` marker. Purge the full synthetic URL (or bump key version) when invalidating this cache. Content-hashed filenames remain immutable.

On production, JS/CSS, media, manifest, icon and sitemap changed MISS→HIT. Both `X-Edge-Cache:HIT` and provider-generated `CF-Cache-Status:HIT` observed. JS/CSS SHA256 match local production bundles. HEAD returns no body; ETag304 validated for assets and media. Credential/range requests bypass cache; unknown assets/media404 no-store. Root/dashboard/API/SSR excluded. Health200, unauthenticated protected endpoints401no-store, scanners403, WWW301 preserves path/query. 1stdev.space remains HIT.

59 tests pass; Worker typecheck, webbuild and deployment dry-run pass. No auth/redirect endpoint code changed. No migrations, Wrangler upgrade, paid services or frontend deploy. Changes remain uncommitted alongside pre-existing work.

Cache API still invokes Worker for each request. It reduces Pages/R2/D1 origin reads; do not claim elimination of Worker requests or a measured aggregate traffic reduction. Per-PoP entries are eventually filled and may be evicted.

Tests cover full-byte HEAD cache fills, conditional304, host/query separation, cache failure fallback, credential/range bypass, private/Set-Cookie/Vary/error/partial/HTML rejection, proxy credential stripping, R2 read avoidance and sitemap DB errors. Existing business, security and tenant tests remain green.

Evidence: `/tmp/edgelink-cache-fix/results.json` and `~/Downloads/cloudflare-optimization-2026-10-29/worker-cache-fix/`.


Follow-up profile QA: fixed business cover overflow with width/max-width100% and Paper WhatsApp contrast in shared/renderBusiness.ts. Final Worker59812ab8-dbd1-4d28-a9f0-a275c8e93d5b; Pagesd8b11226.edgelink-afl.pages.dev; frontend JSindex-r7l6OeJ9.js. Rechecked59tests/typecheck/build. Publicprofile@1stnear created with25blocks/6plans. Account claim blocked by Resend sender-domain verification; credentials remain private locally.
