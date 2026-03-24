# Lessons Learned

<!-- Format: [date] | what went wrong | rule to avoid it -->
[2026-03-19] | Set winner logic used `>=` which silently awards ties to blue team | Always use strict `>` for winner comparison; prevent action when scores are equal
[2026-03-19] | SW cache filter had two `.filter()` calls where the second negated the first | Test filter chains by tracing with a concrete example before deploying
[2026-03-19] | Nominatim API called without User-Agent header (violates ToS) | Always add User-Agent to third-party API calls; centralize API calls to avoid repeating the fix in 3 files
[2026-03-19] | Heatmap normalization looked like a sidesSwapped bug but was actually correct | Verify assumptions by reading the full data flow before filing a bug
[2026-03-19] | analyze-match Edge Function seemed to have auth bypass but actually takes client data, not DB IDs | Check if function queries DB before flagging auth issues
[2026-03-19] | Theme flash caused by applying dark class in React instead of before first paint | Always apply theme in a blocking `<script>` in `<head>` before CSS loads
[2026-03-24] | Bug analysis in todo.md was wrong — `hasRating: false` vs `undefined` misdiagnosed as "ratings never requested" when matchRules OR logic saved it | Always trace the FULL code path before documenting root cause; check OR/fallback conditions
[2026-03-24] | Custom action properties (hasRating) lost in getVisibleActions mapping — worked by accident via fallback | When mapping object types, include ALL relevant fields; don't rely on downstream fallbacks
[2026-03-24] | Zod schemas stripped `rating` field from Points/RallyActions — Zod strips unknown fields by default with `.object()` | When adding a field to a TypeScript interface, ALWAYS update the corresponding Zod schema; audit all schemas when adding persistent fields
[2026-03-24] | Pending spots invisible — Supabase default limit is 1000 rows, DB had 3035 spots, query without filter returned only validated ones | Always filter server-side with .eq() instead of relying on client-side filtering when dataset exceeds 1000 rows; never omit a status filter expecting to get "all" rows
[2026-03-24] | Renamed MODERATOR_EMAIL to MODERATOR_EMAILS but missed one reference in onAuthStateChange callback — caused ReferenceError in production | When renaming a variable, grep the ENTIRE codebase for all occurrences before committing; don't trust replace_all on partial matches
