# Quality Pipeline Report -- My Volley
Date: 2026-03-27
Framework: Vite 5 + React 18 SPA | Language: TypeScript | Hosting: Vercel
Backend: Supabase (auth, DB with RLS, edge functions, storage)

## Health Dashboard

| Dimension      | Score  | Status   |
|----------------|--------|----------|
| Code Quality   | 62/100 | WARNING  |
| Security       | 62/100 | WARNING  |
| Performance    | 40/100 | CRITICAL |
| SEO            | 82/100 | OK       |
| Accessibility  | 52/100 | WARNING  |
| Best Practices | 78/100 | OK       |
| **GLOBAL**     | **63/100** | **WARNING** |

---

## Critical Actions (do now)

### 1. [PERF] Dynamic import xlsx -- saves ~400KB from initial bundle
Home.tsx statically imports `excelExport.ts` which pulls the entire xlsx library (~400KB). Since Home is NOT lazy-loaded, this bloats every single page load.
- Change Home.tsx and HeatmapView.tsx to `const { exportMatchToExcel } = await import('@/lib/excelExport')` only on button click
- Estimated effort: 15 minutes. Biggest single improvement.

### 2. [PERF] Dynamic import html2canvas -- saves ~200KB from match page
HeatmapView.tsx statically imports html2canvas (~200KB) even though screenshot is rarely used.
- Move import inside the screenshot function: `const html2canvas = (await import('html2canvas')).default`
- Estimated effort: 5 minutes.

### 3. [PERF] Lazy-load Home page -- reduces initial JS payload ~40-50%
Home is the only page NOT lazy-loaded. Combined with fixes #1 and #2, this dramatically cuts the initial bundle.
- Change `import Home from "./pages/Home"` to `const Home = lazy(() => import("./pages/Home"))` in App.tsx
- Estimated effort: 2 minutes.

### 4. [SEC] Add authentication to `import-spots` edge function
`supabase/functions/import-spots/index.ts` has ZERO authentication. Anyone can trigger Google API calls (cost $$$) and insert spots.
- Add Bearer token validation + admin check, identical to `summarize-spot` pattern
- Replace `Access-Control-Allow-Origin: *` with restrictive CORS

### 5. [SEC] Add security headers to vercel.json
No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy.
- Add: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- Start CSP in report-only mode, then enforce

### 6. [A11Y] Remove `user-scalable=no` from viewport meta
WCAG 2.1 AA violation -- prevents users from zooming. Single most impactful a11y fix.

---

## Important Actions (this week)

### 7. [CODE] Split Home.tsx (1170 lines) and SpotDetailModal.tsx (725 lines)
Both are God components violating SRP. Extract data-fetching into hooks, break UI into sub-components.
- SpotDetailModal: extract `useSpotDetail(spotId)`, `SpotPhotoCarousel`, `SpotCommentSection`, `SpotSocialLinks`
- Home: extract `MatchList`, `NewMatchDialog`, `CloudSyncManager`

### 8. [CODE] Eliminate `any` types in SpotDetailModal and SpotFormModal
40 `any` types, 64 `as any` casts across src/. Worst: spot, photos, comments states all typed `any`.
- Create proper types from `Tables<'spots'>` and regenerate Supabase types with `supabase gen types typescript`

### 9. [SEC] Add server-side rate limiting for AI edge functions
Client-side rate limiting (localStorage) is trivially bypassable. `analyze-match` and `summarize-spot` call paid APIs.
- Add per-user daily counter in edge functions, return 429 when exceeded

### 10. [SEC] Create .env.example files
No `.env.example` exists. Service role key and Google API key in plaintext on disk.
- Create `.env.example` and `.env.marketing.example` with placeholder values
- Consider rotating GOOGLE_PLACES_API_KEY and applying API restrictions

### 11. [A11Y] Add React Error Boundary
Zero ErrorBoundary in the codebase. Any component throw crashes the entire app to a white screen.

### 12. [A11Y] Add aria-labels to BottomNav icon-only buttons
When `showLabels` is false (after 10 sessions), buttons become icon-only with no accessible name.

### 13. [CODE] Adopt react-query for Supabase data fetching
react-query is installed but unused (~12KB wasted). All fetching uses manual useState/useEffect/refreshKey pattern.
- Either migrate to useQuery/useMutation or remove the dependency

### 14. [PERF] Throttle auto-save in useMatchState
Auto-save fires every second when chrono runs (chronoSeconds in deps). On low-end mobile, localStorage thrashing causes jank.
- Debounce to 2-3s or exclude chronoSeconds from dependency array

---

## Improvements (this month)

### 15. [A11Y] Update `document.documentElement.lang` on language change
`<html lang="fr">` hardcoded -- never updates when user switches to English. Affects both SEO and screen reader pronunciation.

### 16. [A11Y] Fix heading hierarchy across pages
Home starts with `<h3>` before any `<h1>`. Privacy page has no `<h1>`. Credits `<h1>` is visually smaller than `<h2>`.

### 17. [A11Y] Add skip navigation link
No "skip to content" link. Keyboard users must tab through header + bottom nav on every page.

### 18. [CODE] Complete i18n coverage
Multiple hardcoded French strings in SpotFormModal, SpotDetailModal, NavigationPicker, rateLimit.ts.

### 19. [SEC] Tighten CORS on all edge functions
7/12 edge functions use `Access-Control-Allow-Origin: *`. The 2 with whitelists still accept `*.vercel.app`.
- Extract shared CORS utility, use specific deployment URLs

### 20. [PERF] Add React.memo to match-critical components
Zero React.memo usage. ScoreBoard, VolleyballCourt, PointTimeline re-render on every point.

### 21. [PERF] Add Vite manualChunks configuration
No vendor splitting strategy. All vendor code in one chunk -- poor cache invalidation.

### 22. [PERF] Dynamic import react-markdown
AiAnalysis.tsx statically imports react-markdown (~80-100KB) for a rarely-used feature.

### 23. [BEST] Add web app manifest
No `manifest.json`. Browsers cannot offer "Add to Home Screen" prompts.

### 24. [BEST] Improve Suspense fallback
Current fallback is an empty div. Users on slow connections see a blank screen.

### 25. [CODE] Client-side moderator check is cosmetic only
`MODERATOR_EMAILS` hardcoded in Spots.tsx -- readable in bundle. Security depends entirely on RLS being correctly configured.

---

## Detailed Agent Reports

### Code Quality (62/100)
- 40 `any` types, 64 `as any` casts
- Home.tsx (1170 lines) and SpotDetailModal.tsx (725 lines) are monoliths
- react-query installed but unused -- manual useState/useEffect everywhere
- Stale closure risk in useMatchState.processRallyAction
- Good patterns: Zod validation in matchStorage, userStorage namespace migration, sortSpotPhotos

### Security (62/100)
- No production-runtime dependency vulnerabilities (all 12 vulns are dev/build tooling)
- `import-spots` edge function completely unauthenticated
- No security headers in vercel.json
- Client-side-only rate limiting on AI endpoints
- .env files properly gitignored, but no .env.example exists
- Good: Supabase anon key pattern correct, edge functions mostly authenticated, no eval/XSS vectors

### Performance (40/100)
- xlsx (~400KB) loaded on every page via non-lazy Home + static import -- CRITICAL
- html2canvas (~200KB) statically imported in match view
- react-markdown (~80-100KB) statically imported for rare AI feature
- Estimated initial bundle: 330-400KB gzipped (heavy for mobile-first app)
- Zero React.memo usage
- SpotMap re-fetches all spots on every pan/zoom
- Good: 14/15 routes lazy-loaded, Leaflet event cleanup proper, useMemo/useCallback in Index.tsx

### SEO (82/100)
- Excellent meta tags, Open Graph, JSON-LD structured data, sitemap, robots.txt
- Hardcoded `<html lang="fr">`, no per-page titles, CSR limitations
- Contradictory: /reset-password in both sitemap and robots.txt Disallow

### Accessibility (52/100)
- `user-scalable=no` prevents zooming (WCAG violation)
- No skip navigation, broken heading hierarchy, icon buttons without aria-labels
- Good: Radix primitives with built-in ARIA, semantic landmarks, sr-only text, focus styles

### Best Practices (78/100)
- No Error Boundary, empty Suspense fallback, no manifest.json
- Good: 404 page, lazy loading, loading/empty states, theme flash prevention, TypeScript throughout

---

## Recommended Cadence
- Code Review: every PR
- Tests: every push (vitest + playwright configured)
- Performance: weekly (bundle size check)
- Security: weekly + on dependency changes (npm audit)
- Web Analysis: monthly (a11y + SEO spot check)
