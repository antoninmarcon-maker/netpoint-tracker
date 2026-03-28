# Quality Action Plan -- Prioritized

Synthesized from 6 expert audits (TS Architect, Security, Performance, A11y, SEO, DevOps).
Generated: 2026-03-27 | Updated: 2026-03-28 | Initial score: 60.5/100

## Fixes Applied (Pipeline Cycle 1)

### Tier 1 -- ALL DONE
- [x] Action 2: [SEC] Lock down RLS policies -- new migration restricting spots/comments/photos to authenticated users
- [x] Action 3: [SEC] Edge function auth + CORS -- 7 functions secured with service role key + domain allowlist
- [x] Action 4: [DEVOPS] Move playwright/dotenv to devDependencies
- [x] Action 5: [PERF/CODE] Remove @tanstack/react-query (dead code, -28KB)
- [x] Action 6: [PERF] Vite manualChunks -- main chunk 653KB -> 109KB (84% reduction)
- [x] Action 7: [SEO] Remove fabricated aggregateRating from JSON-LD
- [x] Action 8: [SEO/A11Y] Per-route metadata (8 pages) + dynamic html lang sync
- [x] Action 9: [DEVOPS] Gitignore + untrack 9 screenshot files (-8.7MB)

### Tier 2 -- PARTIALLY DONE
- [x] Action 13: [CODE] Consolidate auth state -- 3/5 pages migrated to useAuth() (Tournaments, Players, Settings). Home.tsx and Spots.tsx deferred (complex).
- [x] Action 14: [A11Y] Skip navigation link + accessible names on BottomNav, ScoreBoard, Spots buttons
- [x] Action 16: [SEC] CSP + HSTS headers added to vercel.json
- [x] Action 17: [DEVOPS] Inline SW purge script in index.html (CLAUDE.md rule 6)
- [x] Action 20: [SEO] Robots.txt cleanup + sitemap fix + meta description shortened to 131 chars
- [x] Action 22: [A11Y/CODE] ErrorBoundary component + accessible Suspense fallback

### Previously Applied
- [x] [PERF] Dynamic import xlsx in Home.tsx and HeatmapView.tsx
- [x] [PERF] Dynamic import html2canvas in HeatmapView.tsx
- [x] [PERF] Lazy-load Home page in App.tsx
- [x] [A11Y] Remove user-scalable=no from viewport meta
- [x] [SEC] Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)

---

## Remaining Actions

### Tier 1 -- Deferred (needs manual action)

#### Action 1: Rotate leaked .env secrets
**Effort:** S (manual, Supabase dashboard)
**Do:** Rotate all API keys committed to git history. Create .env.example with placeholder values.

### Tier 2 -- Remaining (structural work)

#### Action 10: Decompose Home.tsx god component
**Effort:** L
**Do:** Extract MatchList, MatchCreation, AuthSection sub-components. Consolidate 28 useState calls. Fix dual loadMatches race condition.

#### Action 11: Decompose SpotDetailModal and HeatmapView
**Effort:** L
**Do:** SpotDetailModal (725 lines) -> extract sub-components. HeatmapView (884 lines) -> extract stats. Delete dead SpotSidebar.tsx (575 lines).

#### Action 12: Fix custom modals to use Radix Dialog
**Effort:** M
**Do:** Replace 10+ hand-rolled overlays with existing Radix Dialog components. Fixes focus trapping, keyboard dismissal, ARIA.

#### Action 13 (remaining): Consolidate auth in Home.tsx + Spots.tsx
**Effort:** M
**Do:** Home.tsx has complex auth flow with sync logic. Needs careful refactoring.

#### Action 15: Enable TypeScript strict mode
**Effort:** L
**Do:** Enable incrementally: strictNullChecks first, then noImplicitAny. Fix 124 `any` types across 38 files.

### Tier 3 -- Nice-to-have

#### Action 18: Server-side rate limiting on AI functions
**Effort:** M
**Do:** Rate limit analyze-match and summarize-spot. Fix error message leaking in summarize-spot.

#### Action 19: Clean up unused dependencies
**Effort:** S
**Do:** Remove ~10 unused Radix/UI packages. Install @types/leaflet. Re-enable ESLint no-unused-vars.

#### Action 21: React.memo on leaf components
**Effort:** S
**Do:** Wrap ScoreBoard action buttons. Lazy-load Leaflet CSS.

#### Action 23: Set up CI pipeline
**Effort:** M
**Do:** GitHub Actions: typecheck + lint + build + test on PR.

#### Action 24: Form error feedback for screen readers
**Effort:** S
**Do:** Add aria-describedby on form inputs. Use aria-live for validation errors.

#### Action 25: Fix JSON-LD screenshot + hreflang
**Effort:** S
**Do:** Real screenshot in structured data. Add hreflang alternate links.

---

## Score Progression

| Expert | Initial | After Tier 1+2 Fixes | Remaining Potential |
|--------|---------|---------------------|-------------------|
| TS Architect | 58 | ~64 | 74 (after Actions 10-13,15) |
| Security | 68 | ~82 | 88 (after Actions 1,18) |
| Performance | 55 | ~72 | 77 (after Actions 19,21) |
| A11y | 62 | ~72 | 82 (after Actions 12,24) |
| SEO | 58 | ~72 | 78 (after Action 25) |
| DevOps | 62 | ~74 | 84 (after Actions 1,15,19,23) |
| **Average** | **60.5** | **~72.7** | **80.5** |

## To Resume
> /quality-pipeline --fix-from tasks/quality-actions.md
