# UX3-00: browser + visual evidence QA

This is the first quality gate for the 1stdev.link UI/UX 3.0 redesign.
It does **not** run against production and does **not** create accounts or
modify user data in Cloudflare. A local Vite server is launched with
VITE_USE_MOCK=true, and tests run only against 127.0.0.1:4173.

## Local setup (Node 22)

    cd web
    npm ci
    cd e2e
    npm install --no-package-lock
    npx playwright install chromium
    npm test

Playwright is isolated under web/e2e with an exact pinned dependency,
so installing browser QA does not affect the Vite production bundle.
A separate dependency lockfile should be committed during the next
test-infrastructure hardening pass if reproducibility requires it.

## Coverage in UX3-00

- Guest Welcome at 320, 390, 768, 1024, 1440 and 1920 pixels.
- English and Indonesian first-visit copy; purpose selection.
- Light-mode surface and document horizontal overflow.
- Keyboard dismisses a login dialog.
- Guest shortlink flow with empty data; Add Link modal.
- Desktop full-width workspace + sidebar navigation.
- Mobile dock and stacked empty state.
- Builder uses the SSR HTML preview renderer.
- Additional screenshot evidence for /landing at mobile and desktop widths.

Tests intentionally do not mutate production D1/KV/R2/Worker.
They also do not claim to validate OTP email delivery, SEO SSR on
the live domain, or actual public URL redirects.

## Screenshot acceptance process

Screenshots attached by the browser tests are **evidence**, not yet
approved golden snapshots. In GitHub Actions, open the UI Browser QA
workflow run and download the ui-qa-evidence artifact. Inspect the
responsive images and compare to the agreed layout references.

Only after visual approval should a later PR introduce screenshot
baselines and Playwright toHaveScreenshot comparisons. Do not run
automatic snapshot updates in CI: a broken layout must not become
the new baseline just because a build passed.

A failing test is a release blocker. If a failure reveals a preexisting
bug, record the root cause and fix it in the relevant UX3 phase rather
than deleting the assertion.

## Release gates still to be added in later phases

- Accessibility scan + manual screen reader audit.
- Dedicated staging Worker with isolated D1/KV/R2 for real mutations.
- Cross-browser WebKit/mobile test matrix.
- Auth/OTP/account handoff, link analytics, upload and public SSR E2E.
- Screenshot goldens after stakeholder approval.
- Production smoke verification of both Pages and Worker custom domains.
