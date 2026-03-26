/**
 * enrich-spot.ts — Fetch Google Places photos & social links for a single spot.
 *
 * Usage (called by Claude Code skill /enrich-spot):
 *   npx tsx scripts/enrich-spot.ts <spotId>                           # Fetch photo candidates
 *   npx tsx scripts/enrich-spot.ts --list [--type=X] [--limit=N] [--no-photos]
 *   npx tsx scripts/enrich-spot.ts --save-photo <spotId> <photoUrl>   # Save a validated photo URL
 *   npx tsx scripts/enrich-spot.ts --update-social <spotId> <field> <value>
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY
 * Photos are stored as Google URLs directly (no Supabase Storage download).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!GOOGLE_API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Types ──────────────────────────────────────────────────────────

interface GooglePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

interface GoogleReview {
  text?: { text: string };
  rating?: number;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  photos?: GooglePhoto[];
  websiteUri?: string;
  reviews?: GoogleReview[];
}

// ── Google Places API ──────────────────────────────────────────────

function buildPhotoUrl(photoName: string, maxWidth = 800): string {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
}

function buildStreetViewUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${lat},${lng}&key=${GOOGLE_API_KEY}&fov=120`;
}

async function searchPlacesNearby(lat: number, lng: number, spotType: string): Promise<GooglePlace[]> {
  const queries = spotType === 'club'
    ? ['club volleyball', 'gymnase volleyball', 'salle de sport']
    : spotType === 'beach'
      ? ['beach volley', 'terrain beach volley']
      : ['terrain volleyball', 'terrain de sport'];

  const allPlaces: GooglePlace[] = [];

  for (const query of queries) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.websiteUri,places.reviews',
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 200.0 } },
          maxResultCount: 5,
          languageCode: 'fr',
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.places) allPlaces.push(...data.places);
    } catch { /* skip failed queries */ }
  }

  // Deduplicate by place ID
  const seen = new Set<string>();
  return allPlaces.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
}

async function getPlaceById(placeId: string): Promise<GooglePlace | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,photos,websiteUri,reviews',
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ── Commands ───────────────────────────────────────────────────────

async function listSpots(opts: { type?: string; limit: number; noPhotos: boolean }) {
  let query = supabase
    .from('spots')
    .select('id, name, type, lat, lng, address, google_place_id, source, social_instagram, social_facebook, club_site_web')
    .eq('status', 'validated')
    .order('created_at', { ascending: true });

  if (opts.type) query = query.eq('type', opts.type);
  query = query.limit(opts.limit);

  const { data: spots, error } = await query;
  if (error || !spots) { console.error(JSON.stringify({ error: error?.message || 'No data' })); process.exit(1); }

  let result = spots;
  if (opts.noPhotos) {
    const ids = spots.map((s: any) => s.id);
    const { data: photos } = await supabase.from('spot_photos').select('spot_id').in('spot_id', ids);
    const withPhotos = new Set((photos || []).map((p: any) => p.spot_id));
    result = spots.filter((s: any) => !withPhotos.has(s.id));
  }

  console.log(JSON.stringify({
    total: result.length,
    spots: result.map((s: any) => ({
      id: s.id, name: s.name, type: s.type, lat: s.lat, lng: s.lng,
      address: s.address, google_place_id: s.google_place_id, source: s.source,
      has_social: !!(s.social_instagram || s.social_facebook),
    })),
  }));
}

async function enrichSpot(spotId: string) {
  const { data: spot, error } = await supabase.from('spots').select('*').eq('id', spotId).single();
  if (error || !spot) { console.error(JSON.stringify({ error: 'Spot not found', spotId })); process.exit(1); }

  const { data: existingPhotos } = await supabase.from('spot_photos').select('id, photo_url').eq('spot_id', spotId);

  // 1. Try google_place_id first, then nearby search
  let places: GooglePlace[] = [];
  if (spot.google_place_id) {
    const place = await getPlaceById(spot.google_place_id);
    if (place) places = [place];
  }
  if (places.length === 0 || !(places[0].photos?.length)) {
    const nearby = await searchPlacesNearby(spot.lat, spot.lng, spot.type);
    places = [...places, ...nearby];
  }

  // 2. Collect photo candidates
  const candidates: { index: number; url: string; previewUrl: string; photoName: string; placeName: string; source: string }[] = [];
  for (const place of places) {
    for (const photo of (place.photos || []).slice(0, 5)) {
      candidates.push({
        index: candidates.length,
        url: buildPhotoUrl(photo.name, 800),
        previewUrl: buildPhotoUrl(photo.name, 400),
        photoName: photo.name,
        placeName: place.displayName?.text || 'Unknown',
        source: 'places',
      });
    }
    if (candidates.length >= 10) break;
  }

  // 3. Street View fallback
  const streetViewUrl = buildStreetViewUrl(spot.lat, spot.lng);
  candidates.push({
    index: candidates.length,
    url: streetViewUrl,
    previewUrl: streetViewUrl,
    photoName: 'streetview',
    placeName: 'Google Street View',
    source: 'streetview',
  });

  // 4. Extract website from places for clubs
  const websites = places.map(p => p.websiteUri).filter(Boolean);

  // 5. Collect Google reviews for AI description
  const reviews: { text: string; rating?: number }[] = [];
  for (const place of places) {
    for (const review of (place.reviews || [])) {
      if (review.text?.text) reviews.push({ text: review.text.text, rating: review.rating });
    }
  }

  console.log(JSON.stringify({
    spot: {
      id: spot.id, name: spot.name, type: spot.type,
      lat: spot.lat, lng: spot.lng, address: spot.address,
      source: spot.source, google_place_id: spot.google_place_id,
      social_instagram: spot.social_instagram, social_facebook: spot.social_facebook,
      club_site_web: spot.club_site_web, club_email: spot.club_email,
      description: spot.description,
    },
    existingPhotos: (existingPhotos || []).map((p: any) => p.photo_url),
    candidates,
    websites,
    reviews: reviews.slice(0, 10),
  }));
}

async function savePhoto(spotId: string, photoUrl: string) {
  const { error } = await supabase.from('spot_photos').insert({
    spot_id: spotId,
    photo_url: photoUrl,
    user_id: '00000000-0000-0000-0000-000000000000',
  });
  console.log(JSON.stringify({ success: !error, url: photoUrl, error: error?.message }));
}

async function updateSocial(spotId: string, field: string, value: string) {
  const allowed = ['social_instagram', 'social_facebook', 'social_whatsapp', 'club_site_web'];
  if (!allowed.includes(field)) { console.error(JSON.stringify({ error: `Invalid field: ${field}` })); process.exit(1); }
  const { error } = await supabase.from('spots').update({ [field]: value }).eq('id', spotId);
  console.log(JSON.stringify({ success: !error, field, value }));
}

async function updateDescription(spotId: string, description: string) {
  const { error } = await supabase.from('spots').update({ description }).eq('id', spotId);
  console.log(JSON.stringify({ success: !error, spotId, descriptionLength: description.length }));
}

// ── CLI Router ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === '--list') {
  const type = args.find(a => a.startsWith('--type='))?.split('=')[1];
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50');
  const noPhotos = args.includes('--no-photos');
  listSpots({ type, limit, noPhotos });
} else if (cmd === '--save-photo') {
  if (!args[1] || !args[2]) { console.error('Usage: --save-photo <spotId> <photoUrl>'); process.exit(1); }
  savePhoto(args[1], args[2]);
} else if (cmd === '--update-social') {
  if (!args[1] || !args[2] || !args[3]) { console.error('Usage: --update-social <spotId> <field> <value>'); process.exit(1); }
  updateSocial(args[1], args[2], args[3]);
} else if (cmd === '--update-description') {
  if (!args[1] || !args[2]) { console.error('Usage: --update-description <spotId> <description>'); process.exit(1); }
  updateDescription(args[1], args.slice(2).join(' '));
} else if (cmd && !cmd.startsWith('--')) {
  enrichSpot(cmd);
} else {
  console.error(`Usage:
  npx tsx scripts/enrich-spot.ts <spotId>                          # Fetch photo candidates
  npx tsx scripts/enrich-spot.ts --list [--type=X] [--limit=N] [--no-photos]
  npx tsx scripts/enrich-spot.ts --save-photo <spotId> <url>       # Save validated photo
  npx tsx scripts/enrich-spot.ts --update-social <spotId> <field> <value>`);
  process.exit(1);
}
