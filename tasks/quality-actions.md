# Quality Action Plan -- Prioritized

Synthesized from 6 expert audits (TS Architect, Security, Performance, A11y, SEO, DevOps).
Generated: 2026-03-27 | Updated: 2026-03-28 | Initial score: 60.5/100

## All Fixes Applied (Pipeline Cycle 1)

### Tier 1 -- ALL DONE
- [x] Action 2: [SEC] Lock down RLS policies -- new migration restricting spots/comments/photos to authenticated users
- [x] Action 3: [SEC] Edge function auth + CORS -- 7 functions secured with service role key + domain allowlist
- [x] Action 4: [DEVOPS] Move playwright/dotenv to devDependencies
- [x] Action 5: [PERF/CODE] Remove @tanstack/react-query (dead code, -28KB)
- [x] Action 6: [PERF] Vite manualChunks -- main chunk 653KB -> 109KB (84% reduction)
- [x] Action 7: [SEO] Remove fabricated aggregateRating from JSON-LD
- [x] Action 8: [SEO/A11Y] Per-route metadata (8 pages) + dynamic html lang sync
- [x] Action 9: [DEVOPS] Gitignore + untrack 9 screenshot files (-8.7MB)

### Tier 2 -- MOSTLY DONE
- [x] Action 13: [CODE] Consolidate auth state -- 3/5 pages migrated to useAuth() (Home.tsx + Spots.tsx deferred)
- [x] Action 14: [A11Y] Skip navigation link + accessible names on BottomNav, ScoreBoard, Spots buttons
- [x] Action 16: [SEC] CSP + HSTS headers added to vercel.json
- [x] Action 17: [DEVOPS] Inline SW purge script in index.html (CLAUDE.md rule 6)
- [x] Action 20: [SEO] Robots.txt cleanup + sitemap fix + meta description shortened to 131 chars
- [x] Action 22: [A11Y/CODE] ErrorBoundary component + accessible Suspense fallback

### Tier 3 -- MOSTLY DONE
- [x] Action 18b: [SEC] Fix summarize-spot error leaking (generic error message)
- [x] Action 19: [DEVOPS] Cleanup 11 unused packages + 10 dead UI files + @types/leaflet + ESLint no-unused-vars
- [x] Action 21: [PERF] React.memo/useMemo on ScoreBoard hot path (6 memoizations)
- [x] Action 24: [A11Y] Auth form aria-labels for email/password inputs

### Bug Fixes
- [x] [BUG] Auto-disconnect -- Clear-Site-Data "storage" was wiping auth tokens on every page load
- [x] [BUG] Match deletion broken -- same root cause + handleDelete hardened for local cleanup
- [x] [SEC] invite-user moderator check + CORS hardening
- [x] [CODE] Delete dead SpotSidebar.tsx (575 lines) + empty hydrateAdvantageRule stub
- [x] [DEVOPS] Create .env.example with all required env vars

### Previously Applied
- [x] [PERF] Dynamic import xlsx in Home.tsx and HeatmapView.tsx
- [x] [PERF] Dynamic import html2canvas in HeatmapView.tsx
- [x] [PERF] Lazy-load Home page in App.tsx
- [x] [A11Y] Remove user-scalable=no from viewport meta
- [x] [SEC] Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)

---

## Remaining Actions (deferred -- require dedicated sessions)

### Manual Action
- [ ] Action 1: Rotate leaked .env secrets in Supabase dashboard

### Large Structural Refactors -- DONE
- [x] Action 10: Decompose Home.tsx (1169 -> 996 lines, extracted ShareMatchDialog + MatchCard + shareUtils)
- [x] Action 11: Decompose SpotDetailModal (725 -> 227 lines, extracted SpotPhotos + SpotInfo + SpotComments + useSpotDetail hook)
- [x] Action 11b: Deduplicate HeatmapView share logic (884 -> 870 lines, 6 functions replaced with shareUtils imports)
- [x] Action 12: Migrate 10 custom modals to Radix Dialog/AlertDialog across 6 files

### Large Structural Refactors -- ALL DONE
- [x] Action 13: Home.tsx auth fully consolidated (useAuth(), race condition fixed, setTimeout removed)
- [x] Action 15: TypeScript strictNullChecks + noImplicitAny enabled (134 errors fixed, zero remaining)

### Medium Effort
- [ ] Action 18: Server-side rate limiting on AI functions (analyze-match, summarize-spot)
- [ ] Action 23: Set up CI pipeline with GitHub Actions
- [ ] Action 25: Add hreflang tags for fr/en

### Missing Feature (reported as bug)
- [ ] Tournament day assignment -- needs DB migration, types, storage, UI

---

## Score Progression

| Expert | Initial | After Pipeline | Remaining Potential |
|--------|---------|---------------|-------------------|
| Expert | Initial | After Pipeline | Remaining Potential |
|--------|---------|---------------|-------------------|
| TS Architect | 58 | ~78 | 82 (remaining `any` casts) |
| Security | 68 | ~87 | 90 (after Actions 1,18) |
| Performance | 55 | ~76 | 78 |
| A11y | 62 | ~82 | 85 |
| SEO | 58 | ~74 | 78 (after Action 25) |
| DevOps | 62 | ~82 | 86 (after Actions 1,23) |
| **Average** | **60.5** | **~79.8** | **83.2** |

## Cycle 2 Fixes Applied
- [x] [SEC] CORS: tighten *.vercel.app wildcard to strict regex (8 edge functions)
- [x] [DEVOPS] Git: untrack bun lockfiles + design PNGs + .playwright-mcp (~1.5MB)
- [x] [DEVOPS] TypeScript strict: true (6 additional checks, zero new errors)
- [x] [DEVOPS] CSP connect-src: add Vercel Analytics domains
- [x] [DEVOPS] Add npm typecheck script
- [x] [SEO] Players + ActionsConfig: add useDocumentMeta
- [x] [SEO] Dynamic OG/Twitter tags per route via useDocumentMeta
- [x] [BUG] Winner tie logic: >= changed to > with null winner on tie
- [x] [CODE] Extract formatters.ts (formatDate, formatTime, formatTimePadded)

## Pipeline Stats
- Total fixes applied: 37
- Bugs fixed: 2 (auto-disconnect, match deletion)
- Dead code removed: 575 lines + 10 UI wrapper files
- Packages removed: 12 (react-query + 11 unused Radix/UI)
- Bundle reduction: 681KB -> 109KB main chunk (84%)
- Security: 8 edge functions secured, RLS locked down, CSP+HSTS added
- A11y: skip-nav, ErrorBoundary, aria-labels, lang sync, accessible loading

## To Resume
> /quality-pipeline --fix-from tasks/quality-actions.md
