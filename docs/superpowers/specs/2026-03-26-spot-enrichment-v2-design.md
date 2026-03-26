# Spot Enrichment V2 — Design Spec

**Date:** 2026-03-26
**Status:** Approved (all decisions finalized)

## Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Photo storage | Supabase Storage for ALL sources (Google, club site, mairie, Street View) |
| 2 | Photo priority | Based on visual content, not source origin |
| 3 | Photo selection | Category-based (diverse collection), not linear scoring |
| 4 | Photo categories | 5 slots: terrain, action, groupe, logo, vue extérieure |
| 5 | Description tone | Informatif/factuel, never invented |
| 6 | Club address | Replace with gym address when found (users want where to play) |
| 7 | Search radius | 1km max for Google Places + web search by name as compensation |

## Problem Statement

V1 enrichment had critical flaws:
- Search radius too wide → photos from unrelated places (Persac got indoor volleyball from 300km away)
- No geographic confidence scoring → no way to reject bad matches
- Descriptions invented without sources → hallucination risk
- Photos not individually analyzed for relevance to the specific spot
- Photos stored as Google API URLs (depend on API key) instead of Supabase Storage
- UI missing: no lightbox, no app choice for navigation, no contact display for clubs

## Architecture Overview

```
/enrich-spot (orchestrator)
│
├── Phase 0: caffeinate + list spots
│
├── For each spot (sequential):
│   │
│   ├── Agent: SCOUT
│   │   1. Google Places concentric search (100m→300m→500m→1km)
│   │   2. Calculate confidence score per place
│   │   3. Web search by name if Google Places yields nothing at 1km
│   │      (site mairie, office tourisme, club website)
│   │   4. Collect: place_id, google_maps_url, reviews, websites, photo refs
│   │   Output: JSON with places + confidence + web results
│   │
│   ├── Agent: PHOTO COLLECTOR
│   │   1. Gather photo candidates from ALL sources:
│   │      - Google Places photos (from SCOUT results)
│   │      - Club website images (scrape homepage)
│   │      - Mairie/collectivité website images (from web search)
│   │      - Google Street View (fallback)
│   │   2. Download each to /tmp
│   │   Output: downloaded photos with source metadata
│   │
│   ├── Agent: PHOTO ANALYST
│   │   For each downloaded photo:
│   │     1. Visual analysis via Read tool
│   │     2. Classify into category (see Photo Categories below)
│   │     3. Reject if unrelated (food, selfie, landscape, fitness, etc.)
│   │     4. Reject duplicates (same angle/content)
│   │   Select 1 photo per category (max 5, diverse collection)
│   │   Upload selected to Supabase Storage
│   │   Output: photos saved by category + all rejections with reasons
│   │
│   ├── Agent: SOCIAL FINDER (clubs only)
│   │   1. Scrape club_site_web for contacts + social links
│   │   2. Extract gym address (replace spot address if found)
│   │   3. WebSearch for missing social accounts
│   │   4. Verify each link points to the correct club
│   │   5. Extract: phone, email, instagram, facebook, tiktok, youtube
│   │   Output: validated links + gym address saved
│   │
│   ├── Agent: DESCRIPTION WRITER
│   │   Source hierarchy (by weight):
│   │     5: Club official website / mairie website
│   │     4: FFVB club page
│   │     3: Google Reviews (factual aggregation only)
│   │     2: Social media bios
│   │     1: Name + type + address (fallback)
│   │   Rules:
│   │     - NEVER invent information
│   │     - Tone: informatif/factuel
│   │     - If no source found: minimal factual one-liner
│   │     - 2-3 sentences, French
│   │   Output: description + list of sources used
│   │
│   └── Agent: VERIFIER
│       Post-enrichment quality check:
│       - Are saved photos showing the correct location?
│       - Does each photo match its claimed category?
│       - Does the description match verified sources?
│       - Are social links pointing to the right club?
│       - Is the address correct (gym, not postal)?
│       Flag issues for manual review
│
└── Phase final: kill caffeinate + full report table
```

## Phase 1 — Database Schema

### Context: Existing columns

Already in `spots` table:
- `social_instagram`, `social_facebook`, `social_whatsapp` (migration 20260324010000)
- `club_telephone`, `club_email`, `club_site_web`, `club_lien_fiche` (migration 20260317000000)
- `google_place_id` (migration 20260311003400)

### New columns (migration)

```sql
-- New social + map columns on spots
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Enrichment metadata on spot_photos for auditing/re-enrichment
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_type text;       -- 'google_places', 'club_website', 'mairie', 'streetview', 'user'
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_url text;        -- original URL before download
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS photo_category text;    -- 'terrain', 'action', 'groupe', 'logo', 'vue_exterieure'
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS confidence real;        -- 0.0-1.0, place match confidence
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS is_hero boolean DEFAULT false;  -- best representative photo
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS author_name text;       -- Google Places photo attribution (ToS)
```

Note: Existing user-uploaded photos have NULL metadata (not enriched). `spots_with_coords` uses `SELECT *` so new columns are auto-included.

### Update Supabase types

Regenerate `types.ts` for all new columns.

## Phase 2 — UI: SpotDetailModal

### 2A. Photo Lightbox

- Tap/click any photo → fullscreen overlay (z-60, bg-black/95)
- Photo at max viewport size, object-contain
- Swipe left/right on mobile, arrow keys on desktop
- Counter "2/5" bottom center
- X button top-right, or tap backdrop to close
- New component: `PhotoLightbox.tsx`

### 2B. Navigation App Picker

"Itinéraire" opens a bottom sheet:
- Apple Plans: `maps://maps.apple.com/?daddr={lat},{lng}`
- Google Maps: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- Waze: `https://waze.com/ul?ll={lat},{lng}&navigate=yes`
- Copier l'adresse: clipboard API

All options always shown. `maps://` silently fails on non-Apple devices.

### 2C. Google Maps Button — Place Link

Priority:
1. `google_maps_url` field → direct link to the place
2. `google_place_id` → `https://www.google.com/maps/search/?api=1&query=Google&query_place_id={id}`
3. Fallback: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`

### 2D. Contact Fields — Display Only If Filled

Club info block (only non-empty fields):
- Site web (Globe), Fiche FFVB (Info), Telephone (Phone), Email (Mail)
- Instagram, Facebook, TikTok, YouTube, WhatsApp (each with branded icon)

Non-club spots: show social links if filled, no club contact section.

### 2E. Carousel Improvements

- Dot indicators below carousel (active dot = accent color)
- Lazy loading: `loading="lazy"` on img tags
- Type-themed placeholder when no photos (sand gradient for beach, blue for club)

## Phase 3 — UI: SpotFormModal (Edit)

### 3A. Photo Management in Edit Mode

1. Load existing photos from `spot_photos` on mount (edit mode)
2. Display in grid alongside new uploads (total max 5)
3. Each photo has X button to mark for deletion
4. On submit:
   - DELETE removed existing photos from `spot_photos` + Storage
   - UPLOAD new photos to Storage + INSERT into `spot_photos`

### 3B. Contact Fields Form

All optional fields:
- Social: Instagram, Facebook, TikTok, YouTube, WhatsApp
- Club contacts (visible when type=club): site web, telephone, email

## Phase 4 — Enrichment Script V2

### 4A. Concentric Circle Search with Confidence

```
searchRadius: [100, 300, 500, 1000] // meters, max 1km
For each radius (stop when good match found):
  1. Google Places searchText with locationBias
  2. For each result, calculate confidence:
     - distance_score: 1.0 at 0m, 0.5 at 500m, 0.2 at 1km
     - name_relevance: adaptive — check if place name relates to
       the spot context (sports, leisure, school, camping, etc.)
       NOT limited to "volley" keyword
     - type_match: sports_complex=1.0, park=0.7, school=0.6, generic=0.3
     - confidence = distance_score * 0.5 + name_relevance * 0.3 + type_match * 0.2
  3. Stopping conditions:
     - If any place has confidence >= 0.6, stop expanding
     - Collect ALL places above threshold at the current radius
     - Use the single best place for google_place_id/google_maps_url
  4. Edge case — no match at 1km:
     - Fall through to web search by name (4A-bis)
     - If best confidence 0.4-0.6: use it but flag "low confidence"
     - If < 0.4: skip Google Places, rely on web search only
```

### 4A-bis. Web Search Compensation (when Google Places fails)

When no Google Places match at 1km:
1. WebSearch: `"{spot_name}" {address}` + `"{spot_name}" volleyball`
2. Look for: mairie website, office de tourisme, club website
3. Scrape found pages for photos of the location
4. No geographic constraint (search is by name, not coordinates)
5. Photos from web search get `source_type = 'mairie'` or `'club_website'`

### 4B. Photo Storage — All in Supabase

ALL photos downloaded to Supabase Storage regardless of source:
- Download via `curl -sL` → `spot-photos/{spotId}/{uuid}.jpg`
- Store Supabase public URL in `spot_photos.photo_url`
- Store original URL in `spot_photos.source_url` for traceability
- Store source type in `spot_photos.source_type`

### 4C. Photo Categories (Category-Based Selection)

Instead of linear scoring, the PHOTO ANALYST classifies each photo into a category and picks the best one per category for a diverse collection.

**For spots (beach/outdoor):**
| Slot | Category | What to look for |
|------|----------|------------------|
| 1 | `terrain` | Terrain with net visible, clear view of the playing surface |
| 2 | `action` | Players in action, match or training |
| 3 | `vue_exterieure` | Overview of the location (beach, park, aire de jeux) |
| 4 | `logo` | Club/association logo or signage |
| 5 | `groupe` | Team/group photo or community event |

**For clubs:**
| Slot | Category | What to look for |
|------|----------|------------------|
| 1 | `groupe` | Team photo in volleyball kit, ideally with court/net behind |
| 2 | `terrain` | Gym interior with court/net visible |
| 3 | `action` | Match or training action shot |
| 4 | `logo` | Club logo, banner, or branding |
| 5 | `vue_exterieure` | Gymnasium/building exterior |

**Rules:**
- 1 photo max per category → guarantees visual diversity
- If a category has no candidate, the slot stays empty (no filler)
- Within a category, pick the highest quality image
- REJECT regardless of category: food, selfies, landscapes without sport context, fitness/musculation, animals, generic buildings, blurry/dark photos
- Deduplication: if two photos show the same scene from the same angle, keep the sharper one

### 4D. Description Strategy

Tone: informatif/factuel. 2-3 sentences, French.

```
Source hierarchy (by weight):
  5: Club official website / mairie website content
  4: FFVB club page
  3: Google Reviews (factual aggregation: surface, facilities, access)
  2: Social media bios (Instagram/Facebook about text)
  1: Name + type + address (minimal fallback)

RULES:
- ONLY state facts found in sources
- NEVER invent facilities, schedules, or atmosphere
- If no source yields useful info: one-liner like
  "Terrain de beach volley situé à {address}."
- For clubs: mention club name, location, key offering (loisir/compétition)
  if sourced
```

### 4E. Contact Extraction

Writes to: `club_telephone`, `club_email`, `social_instagram`, `social_facebook`, `social_tiktok`, `social_youtube`, `club_site_web`.

For clubs with `club_site_web`:
1. Fetch homepage HTML (timeout 10s)
2. Extract with patterns:
   - Phone: `0[1-9]\d{8}` or `+33`
   - Email: `[\w.-]+@[\w.-]+\.\w+`
   - Instagram: `instagram.com/[\w.]+`
   - Facebook: `facebook.com/[\w.]+`
   - TikTok: `tiktok.com/@[\w.]+`
   - YouTube: `youtube.com/@[\w.]+` or `/channel/`
3. Verify each link is accessible (HEAD request, 5s timeout)
4. Save to corresponding fields

### 4F. Gym Address Replacement (Clubs)

When the SOCIAL FINDER scrapes a club website and finds a gym/training address different from the stored address:
- Replace `spots.address` with the gym address
- This is where users want to go (play), not the postal/admin address
- Log the change in the enrichment report

### 4G. Google Maps URL

When `google_place_id` found:
```
google_maps_url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${placeId}`
```
Save to `spots.google_maps_url` + `spots.google_place_id`.

### 4H. RLS & Auth Note

Script uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Intentional for admin process. New columns inherit existing policies.

## Phase 5 — Cleanup V1

**Strategy: V2-first, then cleanup** (no data loss risk):
1. Run V2 on each spot
2. Only AFTER V2 succeeds, soft-delete V1 photos:
   - Mark V1 photos (URLs containing `places.googleapis.com`) with `source_type = 'v1_deprecated'`
   - Separate cleanup step deletes marked photos from Storage + DB
3. If V2 fails, V1 photos remain untouched
4. Clear V1 descriptions only if V2 produced a new one

### Error handling

- Website scraping: timeout 10s, skip on 403/CAPTCHA/timeout
- Google Places API: retry once on 5xx, skip on 4xx
- Photo download: retry once, skip on failure
- Social link verification: HEAD 5s timeout, skip unreachable
- All errors logged, never block — agent continues to next item

## Phase 6 — Sub-Agent Definitions

### SCOUT Agent
- **Input:** spot (id, name, type, lat, lng, address)
- **Tools:** Bash (script + curl), WebSearch (fallback)
- **Output:** JSON with places, confidence scores, reviews, websites, web search results

### PHOTO COLLECTOR Agent
- **Input:** SCOUT output + club_site_web
- **Tools:** Bash (curl download), WebFetch (website scraping)
- **Output:** downloaded photos in /tmp with source metadata per photo

### PHOTO ANALYST Agent
- **Input:** downloaded photos, spot type (beach/club)
- **Tools:** Read (visual analysis), Bash (upload to Storage + save to DB)
- **Output:** 0-5 photos saved by category, rejections with reasons

### SOCIAL FINDER Agent (clubs only)
- **Input:** spot id, club name, club_site_web, existing social fields
- **Tools:** Bash (curl website), WebSearch, Bash (script to save)
- **Output:** links found + gym address if different

### DESCRIPTION WRITER Agent
- **Input:** spot metadata, reviews, website content, social bios
- **Tools:** Bash (script to save description)
- **Output:** description text + sources used (cited)

### VERIFIER Agent
- **Input:** spot id, all enrichment results from other agents
- **Tools:** Read (re-check photos in Storage), Bash (verify links)
- **Output:** pass/fail per item, issues flagged for manual review

## Implementation Order

| Step | Phase | What | Depends on |
|------|-------|------|------------|
| 1 | P1 | Supabase migration (spots: 3 cols, spot_photos: 6 cols) | — |
| 2 | P1 | Regenerate types.ts | Step 1 |
| 3 | P2A | PhotoLightbox component (with attribution display) | — |
| 4 | P2B | Navigation app picker bottom sheet | — |
| 5 | P2C | Google Maps place link logic | Step 2 |
| 6 | P2D | Contact display (all fields incl tiktok/youtube, conditional) | Step 2 |
| 7 | P2E | Carousel: dots, lazy loading, themed placeholder, hero-first order | — |
| 8 | P3A | Photo management in edit form (load existing + delete/add) | — |
| 9 | P3B | Contact fields in edit form (all social + club fields) | Step 2 |
| 10 | P4 | Enrichment script V2 (complete rewrite with all optimizations) | Step 2 |
| 11 | P5 | Rewrite /enrich-spot skill (6 agents, parallel, context isolation) | Step 10 |
| 12 | P5 | Create /enrich-spot-test command (hardcoded 20 spots) | Step 11 |
| 13 | P5 | Cleanup V1 data (integrated in V2 pipeline) | Step 11 |
| 14 | P6 | Run /enrich-spot-test (10 beach + 10 clubs, full autonomous) | Step 12 |

## Optimizations (approved)

### O1. Hero Image
PHOTO ANALYST marks 1 photo as `is_hero = true` — the one that best represents the spot (terrain + filet > all). Used as:
- First photo in carousel
- Preview thumbnail on map markers / list view
Add column: `ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS is_hero boolean DEFAULT false;`

### O2. Incremental Enrichment
Before enriching, check which categories already have photos. Only search for missing categories. Skip entirely if all 5 filled + description exists + social links exist. Saves API calls on re-runs.

### O3. Parallel Agent Execution
```
SCOUT → ┬→ PHOTO COLLECTOR → PHOTO ANALYST ─┐
         └→ SOCIAL FINDER ──────────────────────┤→ DESCRIPTION WRITER → VERIFIER
```
PHOTO COLLECTOR and SOCIAL FINDER run in parallel after SCOUT. ~30% faster per spot.

### O4. Context Isolation
Each spot is processed by a **fresh agent** (not reusing context). Prevents context bloat and ensures each spot gets a clean analysis. The orchestrator spawns a new agent per spot.

### O5. Google Attribution
Store `author_name` from Google Places `authorAttributions` in `spot_photos`. Display in lightbox as small text "Photo: {author}". Required by Google Places ToS.
Add column: `ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS author_name text;`

### O6. Carousel Order
Fixed display order: terrain → action → groupe → vue_exterieure → logo. Hero image always position 1. Implemented via `photo_category` field + ORDER BY.

### O7. Google Place Cache
Store `google_place_id` on first enrichment. On re-run, SCOUT skips concentric search and goes directly to Place Details. Also store the place link in the Google Maps button.

### O8. primaryType Signal
Use Google Places `primaryType` field (returned by API) for objective confidence scoring instead of guessing from name. Map: `sports_complex`→1.0, `park`→0.7, `school`→0.6, etc.

### O9. API Cost Tracking
Log every Google Places API call. Report at end of session:
- searchText calls: N × $0.032
- Place Details: N × $0.025
- Photo fetches: N × $0.007
- Total estimated cost
- Free tier: $200/month (~6000 searches)

### O10. Completeness Score
Per spot: photos (0-5) + description (0/1) + social_links (0-N) + google_maps_url (0/1).
Display in enrichment report. Prioritize low-score spots for future runs.

### O11. Map Thumbnail
Use `is_hero` photo as thumbnail on map marker popup. Deferred to later but schema supports it now.

### O12. Change Detection (deferred — write spec only)
Monthly re-run to detect changes: compare current Google Places photos with stored ones.
If significant difference (>50% new photos), flag spot for re-enrichment.
Implementation deferred, but enrichment metadata (source_url, date) supports it.

### O13. Smart Street View
Use Street View Metadata API to check if panorama exists at coordinates before fetching.
If exists, calculate heading toward the spot for optimal camera angle.
If not, skip Street View entirely (don't save a "no image" placeholder).

### O14. Anti-Ban Scraping Strategy
- Delay 2-3 seconds between web requests to same domain
- Realistic User-Agent header: `Mozilla/5.0 (compatible; MyVolleyBot/1.0)`
- Max 3 pages per website (homepage + contact + about)
- Never scrape Instagram/Facebook pages directly — use WebSearch to find URLs only
- Respect robots.txt (check before scraping)
- If 429/403 received: stop scraping that domain, log, continue to next source

## Test Command: /enrich-spot-test

Dedicated command to enrich the 10 beach + 10 club test spots from A to Z:
- Hardcoded spot IDs (the same 20 from V1 test)
- Full V2 pipeline: cleanup V1 → enrich V2 → verify
- Runs autonomously without interruption
- Writes to production database (approved)
- Final report with completeness scores and API cost

## Success Criteria

- Photos are visually relevant to the specific spot (not borrowed from distant places)
- Photos are diverse: 1 per category, not 5 similar angles
- Photos stored permanently in Supabase Storage with source traceability
- Hero image selected for each spot
- Descriptions are factual and traceable to real sources
- Club contacts are accurate and verified
- Club address points to the gym, not postal address
- UI: fullscreen photo viewing with attribution, app choice for navigation, conditional contact display
- Edit form: manage existing photos (view, delete, add within limit of 5)
- Enrichment is incremental (doesn't redo existing work)
- API costs tracked and reported
- Each spot processed in isolated context (no cross-contamination)
