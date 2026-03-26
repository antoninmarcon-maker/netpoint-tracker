# Enrichment V2 — Plan B: Script + Skills

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the enrichment script with concentric search, confidence scoring, category-based photo selection, Supabase Storage download, and multi-source support. Create Claude Code skills for the 6 sub-agents.

**Architecture:** Node.js script (`scripts/enrich-spot.ts`) handles all database/API operations. Claude Code skill (`/enrich-spot`) orchestrates sub-agents. Each spot processed by a fresh agent (context isolation).

**Tech Stack:** TypeScript, Node.js, Supabase JS, Google Places API v1, curl

**Spec:** `docs/superpowers/specs/2026-03-26-spot-enrichment-v2-design.md`
**Depends on:** Plan A (migration must be applied first)

---

## File Structure

### New/Rewritten files
- `scripts/enrich-spot.ts` — Complete rewrite with V2 commands
- `~/.claude/commands/enrich-spot.md` — Rewritten skill with 6 sub-agents
- `~/.claude/commands/enrich-spot-test.md` — Test command for 20 hardcoded spots

---

### Task 1: Rewrite enrich-spot.ts Script

**Files:**
- Rewrite: `scripts/enrich-spot.ts`

- [ ] **Step 1: Write the new script with all V2 commands**

The script must support these commands:
```
--list [--type=X] [--limit=N] [--no-photos]    # List spots to enrich
--scout <spotId>                                  # Concentric search, return places+confidence
--save-photo <spotId> <localPath> <category> <sourceType> [sourceUrl] [confidence] [authorName] [isHero]
--update-social <spotId> <field> <value>          # Update social/contact field
--update-description <spotId> <description>       # Update description
--update-address <spotId> <newAddress>            # Replace address (gym address)
--update-google-maps <spotId> <placeId> <url>     # Save google_place_id + google_maps_url
--cleanup-v1 <spotId>                             # Mark V1 photos as deprecated
--completeness <spotId>                           # Return completeness score
```

Key changes from V1:
- `--scout` does concentric circle search (100m→300m→500m→1km) with confidence
- `--save-photo` takes a LOCAL file path (already downloaded) + metadata, uploads to Supabase Storage
- `--save-photo` stores source_type, source_url, photo_category, confidence, is_hero, author_name
- `--update-social` allowed fields: social_instagram, social_facebook, social_whatsapp, social_tiktok, social_youtube, club_site_web, club_telephone, club_email
- Uses Google Places `primaryType` for objective confidence scoring
- Returns Google reviews in scout output

**Concentric search algorithm (--scout):**
```
searchRadius = [100, 300, 500, 1000]
bestPlaces = []

for radius in searchRadius:
  results = googlePlaces.searchText({
    textQuery: buildQuery(spot.type), // "volleyball", "beach volley", "gymnase" etc.
    locationBias: { circle: { center: {lat, lng}, radius } },
    maxResultCount: 5,
    fieldMask: 'id,displayName,photos,websiteUri,reviews,primaryType,location'
  })

  for place in results:
    distance = haversine(spot.lat, spot.lng, place.lat, place.lng)
    distance_score = max(0, 1.0 - (distance / 1000))  // 1.0 at 0m, 0.0 at 1km

    // primaryType from Google API (objective signal)
    type_scores = { sports_complex: 1.0, stadium: 0.9, gym: 0.8,
                    park: 0.7, school: 0.6, campground: 0.5, default: 0.3 }
    type_score = type_scores[place.primaryType] || 0.3

    // Name relevance: adaptive, check if place name relates to spot context
    name_score = 0.5 // default
    if place.name contains sport-related terms: name_score = 0.8
    if place.name similar to spot.name: name_score = 1.0

    confidence = distance_score * 0.5 + name_score * 0.3 + type_score * 0.2
    place.confidence = confidence
    bestPlaces.push(place)

  // Stopping condition
  if any place has confidence >= 0.6:
    break // stop expanding radius

// Edge cases
if bestPlaces.length == 0 or max(confidence) < 0.4:
  output { places: [], status: 'no_match', flag: 'manual_review' }
else if max(confidence) < 0.6:
  output { places: bestPlaces, status: 'low_confidence', flag: 'warning' }
else:
  output { places: bestPlaces, status: 'match', flag: null }

// Always include: reviews, websites, photo refs from all qualifying places
```

- [ ] **Step 2: Verify script compiles**

Run: `npx tsx scripts/enrich-spot.ts --help`
Expected: Usage message printed.

- [ ] **Step 3: Test --list command**

Run: `source .env.local && npx tsx scripts/enrich-spot.ts --list --no-photos --limit=3 --type=beach`
Expected: JSON with 3 spots.

- [ ] **Step 4: Test --scout command on a known spot**

Run: `source .env.local && npx tsx scripts/enrich-spot.ts --scout 48764135-8281-4314-ba48-980cfb80dbde`
Expected: JSON with places, confidence scores, reviews, photo candidates.

- [ ] **Step 5: Commit**

```bash
git add scripts/enrich-spot.ts
git commit -m "feat: enrichment script V2 with concentric search, confidence, categories"
```

---

### Task 2: Rewrite /enrich-spot Skill

**Files:**
- Create: `~/.claude/commands/enrich-spot.md`

- [ ] **Step 1: Write the V2 skill**

The skill must describe the full orchestration protocol with 6 sub-agents:

```markdown
# Enrich Spot V2 — Full Auto with Sub-Agents

## Protocol

### Step 0: caffeinate
caffeinate -dims &

### Step 1: List spots
source .env.local && npx tsx scripts/enrich-spot.ts --list [options from $ARGUMENTS]

### Step 2: For each spot (sequential, fresh agent per spot)

Launch an Agent for each spot with this combined prompt:

#### Sub-Agent Prompt Template:

"You are enriching spot {spotId} ({name}, {type}).
Working directory: /Users/antoninmarcon/Documents/Projects/My-volley

ENV: export SUPABASE_URL=... && export SUPABASE_SERVICE_ROLE_KEY=... && export GOOGLE_PLACES_API_KEY=...

**PHASE 1 — SCOUT:**
Run: [ENV] && npx tsx scripts/enrich-spot.ts --scout {spotId}
Parse JSON output: places, confidence, reviews, websites, photo candidates.

**PHASE 2 — PHOTO COLLECT + ANALYZE (parallel-capable with PHASE 3):**
For each candidate photo from places with confidence >= 0.4:
  curl -sL "{previewUrl}" -o /tmp/spot_photo_{N}.jpg
  Read /tmp/spot_photo_{N}.jpg — classify into category:
    For spots: terrain, action, vue_exterieure, logo, groupe
    For clubs: groupe, terrain, action, logo, vue_exterieure
  Pick best photo per category (max 1 each, max 5 total).
  Mark the best 'terrain' photo (or best overall) as hero.
  For each selected photo, upload:
    [ENV] && npx tsx scripts/enrich-spot.ts --save-photo {spotId} /tmp/spot_photo_{N}.jpg {category} google_places "{sourceUrl}" {confidence} "{authorName}" {isHero}

If fewer than 3 photos found via Google Places:
  WebSearch: "{spotName} {address}" for mairie/tourisme pages
  Scrape found pages for photos, download, analyze same way
  Save with source_type='mairie' or 'club_website'

**PHASE 3 — SOCIAL FINDER (clubs only, parallel with PHASE 2):**
If type=club or source=ffvb_club:
  If club_site_web exists: fetch homepage, extract contacts with regex patterns
  WebSearch: "{clubName} volleyball instagram/facebook/tiktok/youtube"
  For each found link: verify with HEAD request (5s timeout)
  Save each: [ENV] && npx tsx scripts/enrich-spot.ts --update-social {spotId} {field} {value}
  If gym address found different from current: [ENV] && npx tsx scripts/enrich-spot.ts --update-address {spotId} "{gymAddress}"

**PHASE 4 — DESCRIPTION:**
Gather sources: reviews from SCOUT, website content from PHASE 3, spot metadata.
Write 2-3 sentence French description. Informatif/factuel. Only state facts from sources.
If no useful source: one-liner "Terrain de beach volley situé à {address}."
Save: [ENV] && npx tsx scripts/enrich-spot.ts --update-description {spotId} "{description}"

**PHASE 5 — GOOGLE MAPS:**
If a google_place_id was found in SCOUT:
  [ENV] && npx tsx scripts/enrich-spot.ts --update-google-maps {spotId} {placeId} "https://www.google.com/maps/search/?api=1&query=Google&query_place_id={placeId}"

**PHASE 6 — CLEANUP V1:**
[ENV] && npx tsx scripts/enrich-spot.ts --cleanup-v1 {spotId}

**RETURN:** Summary with: photos saved (count by category), social links updated, description (yes/no), confidence, completeness score."

### Step 3: Report
After all spots: kill caffeinate, display summary table.

## Anti-Ban Strategy
- 2-3s delay between web requests to same domain
- User-Agent: Mozilla/5.0 (compatible; MyVolleyBot/1.0)
- Max 3 pages per website
- Never scrape Instagram/Facebook directly — WebSearch for URLs only
- Respect robots.txt
- If 429/403: stop that domain, log, continue

## API Cost Tracking
Log every Google Places call. Report at end:
- searchText: N × $0.032
- Place Details: N × $0.025
- Photos: N × $0.007
- Free tier: $200/month
```

- [ ] **Step 2: Verify skill is recognized**

Check that `/enrich-spot` appears in Claude Code skill list.

- [ ] **Step 3: Commit**

```bash
git add ~/.claude/commands/enrich-spot.md
# Note: this is outside the repo, so just verify it's saved
```

---

### Task 3: Create /enrich-spot-test Command

**Files:**
- Create: `~/.claude/commands/enrich-spot-test.md`

- [ ] **Step 1: Write the test command**

Hardcode the 20 spot IDs from the V1 test (10 beach + 10 clubs). Run the full V2 pipeline on each, autonomously.

```markdown
# Enrich Spot Test — 20 Hardcoded Spots

Run enrichment V2 on 10 beach spots + 10 club spots. Full autonomous, no interruption.

## Priority: Spots first, then clubs

### Beach spots (10):
1. 48764135-8281-4314-ba48-980cfb80dbde (VVF Village de vacances de Vendes)
2. 4a8ed2e0-70ce-4f56-aa58-d2634d70fde6 (aire de loisirs, Persac)
3. 685175d3-6f87-48d7-8847-7c20c91b6e05 (Aire multisports, Bellême)
4. d0d57972-58d2-44a7-9d38-150039c8835f (Collège Emile Zola, Kingersheim)
5. e506de06-5cf6-4683-bb28-3dd894648f34 (Aire de loisirs de La Praille, Mélisey)
6. c8cc935e-73ad-4e3d-a625-52087156ef5d (CAMPING DES ALBERTS, Montgenèvre)
7. b96317a5-92de-45f9-8681-7c10f25a751d (CENTRE DE LOISIRS, St-Martial-de-Gimel)
8. c1c85845-7196-4ae8-a6ff-430d63ce6190 (LYCEE PROFESSIONNEL RURAL, Saubrigues)
9. 6470d8fe-0cf3-4a37-a83e-f88942751a48 (Terrain sport de sable, Darnétal)
10. 048a9e84-1060-4621-9a70-5af6c64c16c6 (BASE DE LOISIRS DE PIGEROLLES, Rosans)

### Club spots (10):
1. c6b3e475-fe2f-4445-9721-723f460d95a6 (NARBONNE VOLLEY)
2. 48d5ba39-4dac-465f-a4d1-15a08f47ae84 (ASEB St Denis les Bourg)
3. 03b096b5-1cfb-47f5-bfd5-0aecbab67fda (ASS SPORTIVE DE LAGNIEU)
4. 0987f439-4613-4d81-b386-3117a4e11a18 (CARCASSONNE VOLLEY)
5. 6e58ddfc-d529-4fdd-8159-fb84b7674607 (VOLLEY CLUB MEXIMIEUX)
6. d9aa25bb-b7fc-48ab-91e4-aaa56d6619b1 (BOURG VOLLEY)
7. 7fc3a1bb-4dfd-487c-86c2-304a720b408b (COSMO Cuxac)
8. c21e0e50-619e-443b-af9f-79dab41096aa (L'ENVOLLEY 01)
9. 25407d82-0ab2-4dac-95f6-4e51a033bca7 (VBC CORBIERES MEDITERRANEE)
10. 0a45267e-9e74-4a1a-8fd8-1a75dc9cf0b1 (AS ARBENT VOLLEY-BALL)

## Protocol
1. caffeinate -dims &
2. For each spot (sequential, FRESH AGENT per spot):
   - Run full /enrich-spot V2 pipeline (scout → photos → social → description → google maps → cleanup v1)
   - Report result
3. kill caffeinate
4. Display final report table:
   | Spot | Type | Photos (by category) | Social Links | Description | Confidence | Completeness |
5. Display API cost estimate
```

- [ ] **Step 2: Verify command is recognized**

- [ ] **Step 3: Save**

---

### Task 4: Lessons Learned Update

**Files:**
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Add V1→V2 lessons**

```markdown
[2026-03-26] | V1 enrichment used 200m radius → photos from unrelated places 300km away | Always use concentric search with confidence scoring; reject low-confidence matches
[2026-03-26] | V1 stored Google Places photo URLs directly → depend on API key, may expire | Always download photos to Supabase Storage for permanence
[2026-03-26] | V1 generated descriptions without verifiable sources → hallucinations | Never invent info in descriptions; only state facts from named sources
[2026-03-26] | V1 agents shared context across spots → cross-contamination of data | Fresh agent per spot to prevent hallucination from prior context
```

- [ ] **Step 2: Commit**

```bash
git add tasks/lessons.md
git commit -m "docs: add V1→V2 enrichment lessons learned"
```
