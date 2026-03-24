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
