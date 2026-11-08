# 1stdev.link — Full Panel Redesign (Workspace 3.0)

Status: **PROPOSED / DESIGN SPECIFICATION — NO PRODUCTION CODE CHANGES**  
Audit base: `main` commit `15c51ab8795b937daf95d4aba8caa275bb303ba2`  
Date: 2026-11-09 (WIB)  
Related roadmap: `design/UX3_IMPLEMENTATION_PLAN.md` in Draft PR #5. Browser QA UX3-00 is already in main; the new first-visit homepage is already deployed.

## 0. Goals and non-goals

### Goals

1. Make **the entire authenticated panel** feel like one product: Dashboard, Page Builder, Short Links, Analytics, Settings and UMKM/Affiliate settings.
2. Remove constrained/centered workspace and excessive top spacing; use available width with intentional reading-width limits inside content, not on the whole workspace.
3. Keep controls usable at 320, 360, 390, 768, 1024, 1280, 1440 and 1920 px.
4. Make the builder easier to understand: **Isi → Desain → Pratinjau/Bagikan**, with clear autosave status and one authoritative preview.
5. Keep guest session, email OTP, URL shortener, business catalog, public pages and existing user themes working.
6. Treat browser screenshot + functional tests as merge-blocking checks, not just TypeScript build.
7. Use light UI foundations consistent with the new homepage: green, white/off-white, soft borders, legible text.

### Non-goals

- No new payment, subscription, custom domains, scheduler, AI features or lead inbox.
- No D1 table migration, no new Worker route, no changes to public theme schema.
- No changing public pages from dark to light: theme remains **user-selectable**.
- No immediate rewrite of the auth system, analytics aggregation or business JSON.
- No auto-merge or automatic production deploy from this RFC.

## 1. Verified code mapping and risks

| Existing file | Verified purpose / issue | Intended evolution |
|---|---|---|
| `web/src/components/AppShell.tsx` | Header, sidebar, desktop nav, 5th settings destination, create menu, dock, layout and right preview column | Split layout/header/sidebar/mobile-dock into small reusable pieces; one source of navigation truth |
| `web/src/App.tsx` | Session restore, hash navigation, cached profile/links, mutation queues, autosave, business editor/sheets; passes `previewColumn` and `preview` | Keep data/mutation logic stable; move view composition into a lightweight shell; avoid duplicate active previews |
| `web/src/components/screens/HomeScreen.tsx` | Context-aware next action, public profile card, KPI, quick actions, click charts and recent links | Overview layout with priorities and adaptive KPI; reuse existing computed data |
| `web/src/components/screens/ProfileScreen.tsx` | ~948 lines; content/design/mobile preview tabs, profile hero, sortable blocks, themes, media uploads, Business panel | Extract BuilderHeader, BlockList, StyleInspector, ThemePicker, ProfileDesignSections, BuilderPreview; preserve callbacks |
| `web/src/components/LivePhonePreview.tsx` | Shared HTML renderer via `shared/renderBioPage.ts` | Keep as the **single** rendering component; don't duplicate `previewColumn` and mobile `preview` unnecessarily |
| `web/src/components/screens/LinksScreen.tsx` | Search, filter, sort, cards, copy, toggle and delete; different empty/full layouts | Shared PageHeader + DataToolbar + LinkGrid/List + EmptyState |
| `web/src/components/screens/StatsScreen.tsx` | 7/30d selection; real analytics summary, country/top-link distribution, CSV export | Consistent visual data components; distinguish clicks from conversions; robust loading/errors |
| `web/src/components/screens/AccountScreen.tsx` | Guest/claimed status, device transfer, language, developer API, security and legal | Group into coherent SettingsSections; preserve handling of sensitive key and auth states |
| `web/src/components/business/BusinessModePanel.tsx` and `BusinessBlockSheet.tsx` | Purpose switcher, industry settings, catalog/contact blocks | Contextual business toolbar and reusable editor sections, unchanged persistence |
| `web/src/components/Sheet.tsx`, `Select.tsx`, `ConfirmDialog.tsx` | Existing overlay/focus handling and inputs | Shared overlay behavior, responsive sheets, accessibility contract tests |
| `web/src/index.css` | ~1506 lines; base, workspace, legacy overrides, full-width patches, welcome styles in one file | Introduce panel namespace/tokens; **migrate by area**, remove duplicate selectors only after screenshots pass |
| `web/src/styles/welcome-v3.css` | New homepage stylesheet loaded after legacy CSS | Reference palette, but do not mix marketing selectors with panel selectors |
| `web/e2e/` and `.github/workflows/ui-qa.yml` | Playwright Chromium, 14 flow/viewport tests with screenshots | Extend to authenticated panel and later cross-browser / a11y checks |
| `web/src/state/sessionCache.ts` | Hash/tab caching for App | Preserve tab route behavior and test refresh/back-forward |

### Specific risk controls

- New CSS under `.panel3` or a dedicated root attribute, not generic `.card` overrides scattered through `index.css`.
- Avoid mixing global HTML body styles with public bio themes.
- Verify `AppShell` still mounts account settings correctly; settings is outside the four-item mobile dock, so add an accessible route via header/mobile menu.
- **Do not introduce fake analytics**: values come from existing API, with correct empty/loading semantics.
- Current autosave status is `idle|saving|saved|error`. Preserve behavior and surface it in header; do not imply a draft/publish backend exists.
- The large `ProfileScreen` should be refactored incrementally to avoid breaking reorder, upload, style validation or business blocks.

## 2. Information architecture

Main destinations:
- **Beranda** — Overview, status, next action, quick actions, recent activity.
- **Halaman** — Editor / content / design / preview / share.
- **Link** — Short links, search, sort/filter, create, toggle, copy, analytics entry.
- **Statistik** — 7/30 day summary, dates, countries, top links, CSV.
- **Pengaturan** — Account status, security, device, language information, developer API, legal.

Navigation:
- Desktop sidebar: these 5 destinations and a small guest-account reminder at bottom.
- Tablet: compact header + top navigation or bottom dock based on available area; settings reachable through account entry.
- Mobile: four main destinations in dock (Home, Page, Links, Stats), centered Create action, Settings through header avatar; safe-area padding, no hidden critical actions.
- Secondary controls (Builder Isi/Desain/Pratinjau, Stats 7d/30d) remain **within** their destination, not new top-level routes.

## 3. Design language and tokens

Naming proposal: **Workspace 3.0 / Clean Product Studio**.

Colors:
- app canvas `#F7F9F7`; surface `#FFFFFF`; surface-subtle `#F0F6F1`.
- primary ink `#17362D`; secondary `#52695E`; muted `#6B8073`.
- brand `#18765D`; brand-hover `#125C48`; brand-tint `#E5F3E9`.
- borders `#DFE9E1`; critical `#B42335`; warning `#8F6100`; focus `#18765D`.
- Public profile themes are entirely independent.

Typography:
- DM Sans UI body, with rem-based scale 12 / 13 / 14 / 16 / 20 / 26 / 34.
- Page titles desktop clamp(26px, 2.5vw, 34px), mobile ~26px; clear eyebrow/subtitle hierarchy.
- Font weights 400 / 500 / 650 / 750. Avoid tiny low-contrast captions for essential data.

Spacing / dimensions:
- 4px base scale, gaps 8 / 12 / 16 / 24 / 32.
- Header desktop **64–68px**; desktop sidebar **232–248px**.
- Main desktop outer padding **24–32px**; main top padding **20–24px**.
- Card radius **14–18px**; sheets/modal **18–24px**; input radius **10–12px**.
- Focus ring visible 2–3px; interactive target ideally 44×44px minimum.
- Shadows subtle and used only to communicate layering; avoid overusing large cards.

Layout rules:
- Root workspace `display:grid; grid-template-columns: var(--sidebar-width) minmax(0,1fr)` at >=1024px.
- At widths 1024–1439, builder = editor + right preview only if min width can sustain; preview width 280–340px. If cramped, show Preview tab rather than narrow forms.
- At >=1440px, editor 1fr + sticky preview 340–390px. A third inspector column is **optional**, not a default.
- Tablet 640–1023 and mobile 320–639 use a single main column, responsive toolbar and bottom dock.
- **Never** `max-width` the entire shell to 960px on desktop. Restrict line lengths inside specific prose/forms instead.
- Sidebar sticky below header; `min-width:0` on grid children and long text; `overflow-wrap:anywhere` for user links.
- Respect `env(safe-area-inset-bottom)` and `prefers-reduced-motion`.

## 4. Screen-by-screen wireframes and interactions

### 4.1 Workspace shell

Desktop:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Logo (same sidebar width)  Page title / breadcrumb      Save  +  Avatar│
├──────────────────┬─────────────────────────────────────────────────────┤
│ WORKSPACE        │ Eyebrow / Heading           contextual CTA          │
│  Beranda         │ Subtitle + status                                   │
│  Halaman         │                                                     │
│  Link            │ Fluid grid for current screen                       │
│  Statistik       │                                                     │
│  Pengaturan      │                                                     │
│                  │                                                     │
│ Guest reminder   │                                                     │
└──────────────────┴─────────────────────────────────────────────────────┘
```

Do not leave a huge gap between header and heading. Main takes all available width.

### 4.2 Beranda (Home)

- Greeting and public URL in a compact header; copy/share/edit controls.
- Left primary area: public profile card + contextual next-best-action card, backed by existing `getNextAction()`.
- KPI 4 across on wide screens; 2×2 on tablet; mobile 2×2 with readable values.
- Lower: top links graph + recent links. Show empty state with an actual creation action.
- Guest warning inline, not permanent giant banners.
- Avoid pretending clicks are sales or actual marketplace orders.

### 4.3 Halaman / Builder

Structure:
1. **PageBar**: editable public identity summary, Public URL, View Page / Share, accurate `saveStatus`.
2. **BuilderTabs**: Isi / Desain / Pratinjau (mobile only preview can also be desktop toggle).
3. **Isi**: reorderable block list with visible edit/active/duplicate/remove and add-block button; filtered display uses existing `BioBlockType` and business block support.
4. **Desain**: grouped settings (Identitas, Latar, Cover, Tipografi, Tombol, Efek, Tema). Keep existing `BioProfileStyle` contract.
5. **Preview**: iframe from `LivePhonePreview` using `shared/renderBioPage.ts` (same output as public profile); desktop sticky, mobile on-demand.
6. **BusinessModePanel**: surfaced in appropriate builder section when goal business/affiliate; do not duplicate purpose selector all over app.

Editing contract: tap a block -> contextual sheet/inspector; save via existing App mutation queues. Preserve optimistic updates, revision guards and retry. Reordering must support keyboard controls and mobile touch; don't rely on drag alone.

### 4.4 Link management

- Shared header with Add Link CTA; filters and search in responsive toolbar.
- Desktop >=1440: optionally list/table with title, short URL, clicks, state and actions; 1024–1439 two-column cards; mobile single-column cards.
- Empty state occupies available content width and displays one clear CTA, not a tiny centered panel.
- Copy, open, toggle, delete with descriptive accessible labels and confirmation. Search/sort are client-side on already fetched links in phase 1.
- Preserve `destination_url`, `ios_url`, `android_url`, `block_type`, `is_bio_entry` semantics.

### 4.5 Statistik

- First row: total clicks, active links, top link and countries (all existing fields).
- Responsive date chart, 7d/30d toggle, top links and country list.
- Explicit explanation: clicks are not sales; UTC-based dates where applicable.
- Skeleton on load; helpful retry when API fails; empty state when no clicks.
- Keep CSV export and escaping for spreadsheet safety; no fake data.

### 4.6 Pengaturan

- Account summary/guest safety first.
- Sections: Account & security, Devices, Preferences, Developer API (collapsible), Legal / Logout.
- API key not exposed by default in screen, show user-initiated copy with warning.
- Reuse SaveAccountSheet, DeviceTransferSheet, LoginSheet, LegalModal and their auth/OTP callbacks.
- Ensure account accessible on mobile without forcing a fifth tiny dock item.

### 4.7 Overlays and feedback

- One shared sheet/modal visual language and focus-trap/escape/backdrop policy.
- Status `Menyimpan...` / `Tersimpan` / `Gagal — coba lagi` at top; no false publish button.
- Toast for nonblocking actions, inline error for data failures, destructive confirmation for delete.
- Preserve any unsaved content on network failure; no disruptive visual reset.

## 5. Component architecture proposal

Prefer **incremental extraction** and keep App state as the single authority:

```text
web/src/
  components/
    panel3/
      WorkspaceLayout.tsx
      WorkspaceTopbar.tsx
      WorkspaceSidebar.tsx
      MobileDock.tsx
      PageHeader.tsx
      StatsCard.tsx
      DataToolbar.tsx
      EmptyState.tsx
      SaveIndicator.tsx
    builder/
      BuilderHeader.tsx
      BuilderTabs.tsx
      BlockList.tsx
      BlockRow.tsx
      DesignSections.tsx
      ThemePicker.tsx
      PreviewFrame.tsx
  styles/
    panel3-tokens.css
    panel3-layout.css
    panel3-components.css
    panel3-builder.css
    panel3-responsive.css
  e2e/tests/
    panel-shell.spec.mjs
    panel-home.spec.mjs
    panel-builder.spec.mjs
    panel-links.spec.mjs
    panel-stats.spec.mjs
    panel-account.spec.mjs
```

These are *proposed* files, not created by this RFC. Keep original screen names as integration boundaries until they are replaced and tested.

## 6. Data + API contract (no migration required)

| UX area | Existing API / data | UI contract |
|---|---|---|
| Guest/account | `POST /api/auth/guest`, auth/me, OTP and handoff | Existing token + restore behavior; no new session schema |
| Profile / builder | `GET /api/bio-profile`, `PUT /api/bio-profile`, `BioProfile` | Autosave, style, avatar, theme, social, business |
| Blocks / links | `GET/POST /api/links`, `PATCH/DELETE /api/links/:id` | Existing sort, active flag, block_type + JSON |
| Reordering | `PUT /api/links/reorder` | Existing mutation queue / revision |
| Business presets | `POST /api/business/preset` | Existing `BusinessSettings` |
| Media | `POST /api/media/:type` | Existing upload & validation to R2 |
| Analytics | `GET /api/analytics/summary?range=7d|30d` | Existing clicks/countries/links, no conversion metrics |

Phase 1 redesign should not modify `worker/schema.sql`, migrations, `shared/business.ts` or `shared/renderBioPage.ts` logic unless a regression test proves correction necessary. If a feature later requires server-side drafts, audit history or more analytics dimensions, propose a separately reviewed RFC/migration.

## 7. Implementation sequence: small and independently testable PRs

| PR | Objective | Main files | Release gate |
|---|---|---|---|
| **P3-00** | Snapshot all current panel screens & mock states, add basic a11y checks | web/e2e; ui-qa workflow | 320–1920 baseline evidence; no accidental prod API use |
| **P3-01** | Panel tokens, base primitives and CSS isolation | new panel3 CSS; index.css | No visual regression in public profile/homepage |
| **P3-02** | Workspace shell / topbar / sidebar / dock | AppShell.tsx + panel3 components | Navigation, settings access, no overflow, usable at 320–1920 |
| **P3-03** | Dashboard (Home) + consistent page headers and KPI cards | HomeScreen.tsx + shared cards | Guest/claimed/empty/full; link/share actions |
| **P3-04** | Full builder refactor: content, design, preview | ProfileScreen.tsx, LivePhonePreview.tsx, builder components | Save/retry, reorder, media upload mock, preview parity; no data loss |
| **P3-05** | Links manager + AddLinkSheet UX | LinksScreen.tsx, related sheets | Add/edit/delete/toggle/copy/filter/sort |
| **P3-06** | Analytics redesign | StatsScreen.tsx | 7/30d, empty/error, CSV, date/format accuracy |
| **P3-07** | Account & Business/Affiliate editor refinement | AccountScreen, BusinessModePanel, BusinessBlockSheet, common Sheet | OTP, guest save, catalog editing, keyboard/focus |
| **P3-08** | Global review: responsive, a11y, performance, CSS cleanup | all changed UI + CI | screenshots approved, zero critical defects, deploy/rollback ready |

Dependencies: P3-00 before visual changes; P3-01 → P3-02 → P3-03; builder/links/stats may be parallel after shared primitives stabilize. Do not merge multiple global CSS refactors simultaneously.

## 8. UX flows to protect

1. Guest chooses creator/business/affiliate/links → guest token → correct tab → first block/link → account save.
2. Existing user → restore token → no flicker or ghost guest screen → previous tab → edit → server confirmation.
3. Builder tab change (Isi/Desain/Pratinjau) → edit block/theme → autosave saving/saved/error/retry → public profile output matches preview.
4. Link create/edit/toggle/reorder/delete/copy → UI, API and click data remain consistent.
5. Stats 7d↔30d, zero clicks, failure/retry, export.
6. Settings guest→claimed, login via OTP, device transfer, logout and returning to Welcome.
7. Long handle/URLs, 50+ blocks, emoji, English/Indonesian labels, touch + keyboard interaction.

Keep URL hash / localStorage tab behavior in phase 1. Route migrations need separate Worker compatibility analysis because `/:slug` and `/@:handle` are public routes.

## 9. QA / visual regression

Mandatory viewport matrix: **320, 360, 390, 768, 1024, 1280, 1440, 1920px**; also test 200% browser zoom. Browser priority: Chromium CI every PR; WebKit/Firefox for builder, auth and navigation before release.

Required states per screen:
- Loading, empty, populated, offline/error, guest vs claimed.
- Editor: many blocks, dark/light **public page themes**, uploads, sticky preview, open sheets.
- Links: very long URLs, active/inactive, 0 and 50 records.
- Stats: 7/30 days, zero/missing data, unknown country labels, CSV.
- Settings: guest reminder, developer accordion, keyboard dialogs.

Acceptance gates:
- No horizontal overflow or clipped controls; no content hidden behind mobile dock.
- Body + shell light mode consistent; public themes unchanged.
- WCAG AA target: normal text 4.5:1, large text 3:1, essential non-text controls 3:1; visible keyboard focus.
- Interactive targets ideally >=44px; screen reader semantics, modal focus restore, reduced-motion.
- 0 unhandled JS errors and 0 unexpected failed asset fetches in tests.
- Screenshot baselines manually approved; never bulk-update expected snapshots automatically on CI.
- Existing Worker tests and web build always pass.
- Performance budget assessed with Lighthouse/Web Vitals: target LCP <=2.5s, CLS <=0.1 under an agreed representative test environment; don't claim these measurements without running them.
- Renderer parity against `shared/renderBioPage.ts` for existing user themes.
- No credential leakage in screenshots or CI artifacts.

## 10. Cloudflare preview, deployment and rollback

- Each PR triggers GitHub Verify EdgeLink + UI Browser QA + Cloudflare Pages preview; use local mock/staging fixtures, not production account mutations.
- Verify Pages preview does not redirect to production due to the migration logic in `web/src/main.tsx`.
- Merge only after tests, screenshots and manual review of desktop/mobile states.
- Pages production configuration remains: project `edgelink`, branch `main`, root `web`, build `npm ci && npm run build`, output `dist`.
- After merge, confirm Cloudflare Pages production deployment uses expected commit SHA and stages build/deploy success; GET HTML and new JS/CSS asset hashes HTTP 200.
- Domain `1stdev.link` and `www.1stdev.link` are routed through `edgelink-worker`. Verify in a real browser as well as Pages; automated HTTP checks can receive Cloudflare WAF 403 without proving actual users are blocked.
- Run smoke tests for root, `/@handle`, `/:slug`, `/health` and unauthenticated API responses.
- UI-only changes deploy via Pages, **not** Worker; Worker redeploy requires separate tests and a verified need.
- Save stable prior Pages deployment ID for rollback. If a critical UI regression appears, revert/promote Pages deployment; DB unchanged.
- PRs should record before/after screenshots, known limitations, deployed SHA, Pages deployment ID, and rollback target.

## 11. Definition of Done (whole-panel redesign)

- [ ] Panel shell has one consistent layout system across all 5 destinations.
- [ ] No excessive top spacing or unnecessary max-width; responsive 320–1920px.
- [ ] Builder uses unified controls, accurate autosave, responsive preview, stable data and keyboard reordering.
- [ ] Home, Links, Stats, Account and business controls share a consistent design language.
- [ ] Every screen covers loading/empty/error/populated and guest/claimed states.
- [ ] Existing real APIs and D1 schemas unchanged, and all functional flows continue.
- [ ] Existing public profile themes and shortlinks retain their behavior.
- [ ] Playwright screenshot/flow tests pass and visual review is approved.
- [ ] Accessibility and keyboard checks pass; no 200% zoom blocker.
- [ ] Cloudflare preview and production verified by commit/assets and browser smoke checks.
- [ ] Rollback procedure documented and latest stable Pages version retained.

## 12. First implementation PR to create after this spec

Start with **P3-00 Panel Visual Baseline**, which extends the existing 14 browser tests to cover Home, Page, Links, Stats, Account and business editor in both empty and populated mock states. Then begin **P3-01** design token + scoped style foundation, not another global CSS patch.
