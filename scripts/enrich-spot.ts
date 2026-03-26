/**
 * enrich-spot.ts V2 — Enrichment script with concentric search, confidence scoring,
 * Supabase Storage upload, and multi-source support.
 *
 * Usage (called by Claude Code skill /enrich-spot):
 *   npx tsx scripts/enrich-spot.ts --list [--type=X] [--limit=N] [--no-photos]
 *   npx tsx scripts/enrich-spot.ts --scout <spotId>
 *   npx tsx scripts/enrich-spot.ts --save-photo <spotId> <localPath> <category> <sourceType> [sourceUrl] [confidence] [authorName] [isHero]
 *   npx tsx scripts/enrich-spot.ts --update-social <spotId> <field> <value>
 *   npx tsx scripts/enrich-spot.ts --update-description <spotId> <description>
 *   npx tsx scripts/enrich-spot.ts --update-address <spotId> <newAddress>
 *   npx tsx scripts/enrich-spot.ts --update-google-maps <spotId> <placeId> <url>
 *   npx tsx scripts/enrich-spot.ts --cleanup-v1 <spotId>
 *   npx tsx scripts/enrich-spot.ts --completeness <spotId>
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ── Environment ─────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

let _supabase: ReturnType<typeof createClient> | null = null;

function supabase() {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

// ── Types ───────────────────────────────────────────────────────────

interface GooglePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{ displayName: string; uri: string }>;
}

interface GoogleReview {
  text?: { text: string };
  rating?: number;
  authorAttribution?: { displayName: string };
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  photos?: GooglePhoto[];
  websiteUri?: string;
  reviews?: GoogleReview[];
  primaryType?: string;
  location?: { latitude: number; longitude: number };
}

interface ScoutPlace {
  placeId: string;
  name: string;
  primaryType: string;
  confidence: number;
  distance_m: number;
  distance_score: number;
  name_score: number;
  type_score: number;
  websiteUri: string | null;
  location: { lat: number; lng: number } | null;
  reviews: Array<{ text: string; rating?: number; author?: string }>;
  photoCandidates: Array<{
    photoName: string;
    previewUrl: string;
    fullUrl: string;
    widthPx: number;
    heightPx: number;
    authorName: string | null;
  }>;
}

// ── Utilities ───────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPhotoUrl(photoName: string, maxWidth = 800): string {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_API_KEY}&maxWidthPx=${maxWidth}`;
}

const TYPE_SCORES: Record<string, number> = {
  sports_complex: 1.0,
  stadium: 0.9,
  gym: 0.8,
  park: 0.7,
  school: 0.6,
  campground: 0.5,
};
const DEFAULT_TYPE_SCORE = 0.3;

const SPORT_TERMS = [
  'volley', 'sport', 'gymnase', 'stade', 'terrain', 'salle', 'complexe',
  'arena', 'beach', 'gym', 'athletic', 'multisport', 'loisir',
];

function computeNameScore(placeName: string, spotName: string): number {
  const pLower = placeName.toLowerCase();
  const sLower = spotName.toLowerCase();

  // High match: place name contains spot name or vice versa
  if (pLower.includes(sLower) || sLower.includes(pLower)) return 1.0;

  // Word overlap check
  const pWords = pLower.split(/\s+/);
  const sWords = sLower.split(/\s+/);
  const overlap = pWords.filter((w) => sWords.includes(w) && w.length > 2).length;
  if (overlap >= 2) return 0.9;

  // Sport-related terms in place name
  if (SPORT_TERMS.some((t) => pLower.includes(t))) return 0.8;

  return 0.5;
}

function buildSearchQuery(spotType: string): string[] {
  if (spotType === 'club') {
    return ['club volleyball', 'gymnase volleyball', 'salle de sport'];
  }
  if (spotType === 'beach') {
    return ['beach volley', 'terrain beach volley', 'terrain de sable'];
  }
  return ['terrain volleyball', 'terrain de sport'];
}

// ── Google Places API ───────────────────────────────────────────────

const FIELD_MASK =
  'places.id,places.displayName,places.photos,places.websiteUri,places.reviews,places.primaryType,places.location';

async function searchTextPlaces(
  query: string,
  lat: number,
  lng: number,
  radius: number,
): Promise<GooglePlace[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
      maxResultCount: 5,
      languageCode: 'fr',
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.places || [];
}

// ── Commands ────────────────────────────────────────────────────────

async function listSpots(opts: { type?: string; limit: number; noPhotos: boolean }) {
  let query = supabase()
    .from('spots')
    .select(
      'id, name, type, lat, lng, address, google_place_id, source, social_instagram, social_facebook, social_whatsapp, social_tiktok, social_youtube, club_site_web, club_telephone, club_email, description',
    )
    .eq('status', 'validated')
    .order('created_at', { ascending: true });

  if (opts.type) query = query.eq('type', opts.type);
  query = query.limit(opts.limit);

  const { data: spots, error } = await query;
  if (error || !spots) {
    console.error(JSON.stringify({ error: error?.message || 'No data' }));
    process.exit(1);
  }

  let result = spots;
  if (opts.noPhotos) {
    const ids = spots.map((s: Record<string, unknown>) => s.id);
    const { data: photos } = await supabase().from('spot_photos').select('spot_id').in('spot_id', ids);
    const withPhotos = new Set((photos || []).map((p: Record<string, unknown>) => p.spot_id));
    result = spots.filter((s: Record<string, unknown>) => !withPhotos.has(s.id));
  }

  console.log(
    JSON.stringify({
      total: result.length,
      spots: result.map((s: Record<string, unknown>) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        lat: s.lat,
        lng: s.lng,
        address: s.address,
        google_place_id: s.google_place_id,
        source: s.source,
        has_social: !!(s.social_instagram || s.social_facebook),
        has_description: !!s.description,
      })),
    }),
  );
}

async function scoutSpot(spotId: string) {
  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_PLACES_API_KEY');
    process.exit(1);
  }

  const { data: spot, error } = await supabase().from('spots').select('*').eq('id', spotId).single();
  if (error || !spot) {
    console.error(JSON.stringify({ error: 'Spot not found', spotId }));
    process.exit(1);
  }

  const searchRadii = [100, 300, 500, 1000];
  const queries = buildSearchQuery(spot.type);
  const allPlaces = new Map<string, ScoutPlace>();
  let bestConfidence = 0;

  for (const radius of searchRadii) {
    for (const query of queries) {
      const places = await searchTextPlaces(query, spot.lat, spot.lng, radius);

      for (const place of places) {
        if (allPlaces.has(place.id)) continue;

        const placeLat = place.location?.latitude ?? spot.lat;
        const placeLng = place.location?.longitude ?? spot.lng;
        const distance = haversine(spot.lat, spot.lng, placeLat, placeLng);

        const distance_score = Math.max(0, 1.0 - distance / 1000);
        const type_score = TYPE_SCORES[place.primaryType || ''] ?? DEFAULT_TYPE_SCORE;
        const name_score = computeNameScore(
          place.displayName?.text || '',
          spot.name || '',
        );
        const confidence =
          Math.round((distance_score * 0.5 + name_score * 0.3 + type_score * 0.2) * 1000) / 1000;

        const reviews = (place.reviews || [])
          .filter((r: GoogleReview) => r.text?.text)
          .map((r: GoogleReview) => ({
            text: r.text!.text,
            rating: r.rating,
            author: r.authorAttribution?.displayName,
          }));

        const photoCandidates = (place.photos || []).slice(0, 10).map((p: GooglePhoto) => ({
          photoName: p.name,
          previewUrl: buildPhotoUrl(p.name, 400),
          fullUrl: buildPhotoUrl(p.name, 800),
          widthPx: p.widthPx,
          heightPx: p.heightPx,
          authorName: p.authorAttributions?.[0]?.displayName ?? null,
        }));

        const scoutPlace: ScoutPlace = {
          placeId: place.id,
          name: place.displayName?.text || 'Unknown',
          primaryType: place.primaryType || 'unknown',
          confidence,
          distance_m: Math.round(distance),
          distance_score: Math.round(distance_score * 1000) / 1000,
          name_score,
          type_score,
          websiteUri: place.websiteUri || null,
          location: place.location
            ? { lat: place.location.latitude, lng: place.location.longitude }
            : null,
          reviews,
          photoCandidates,
        };

        allPlaces.set(place.id, scoutPlace);
        if (confidence > bestConfidence) bestConfidence = confidence;
      }
    }

    // Stop expanding if we have a good match
    if (bestConfidence >= 0.6) break;
  }

  const places = Array.from(allPlaces.values()).sort((a, b) => b.confidence - a.confidence);

  let status: string;
  let flag: string | null = null;
  if (places.length === 0 || bestConfidence < 0.4) {
    status = 'no_match';
    flag = 'manual_review';
  } else if (bestConfidence < 0.6) {
    status = 'low_confidence';
    flag = 'warning';
  } else {
    status = 'match';
  }

  console.log(
    JSON.stringify({
      spot: {
        id: spot.id,
        name: spot.name,
        type: spot.type,
        lat: spot.lat,
        lng: spot.lng,
        address: spot.address,
        source: spot.source,
        google_place_id: spot.google_place_id,
      },
      status,
      flag,
      bestConfidence,
      places,
    }),
  );
}

async function savePhoto(
  spotId: string,
  localPath: string,
  category: string,
  sourceType: string,
  sourceUrl?: string,
  confidence?: string,
  authorName?: string,
  isHero?: string,
) {
  // Read the local file
  if (!fs.existsSync(localPath)) {
    console.error(JSON.stringify({ error: 'File not found', path: localPath }));
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath) || '.jpg';
  const fileName = `${spotId}/${randomUUID()}${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase().storage
    .from('spot-photos')
    .upload(fileName, fileBuffer, {
      contentType: `image/${ext.replace('.', '') === 'jpg' ? 'jpeg' : ext.replace('.', '')}`,
      upsert: false,
    });

  if (uploadError) {
    console.error(JSON.stringify({ error: 'Upload failed', detail: uploadError.message }));
    process.exit(1);
  }

  // Get public URL
  const { data: urlData } = supabase().storage.from('spot-photos').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  // Insert into spot_photos
  const { error: insertError } = await supabase().from('spot_photos').insert({
    spot_id: spotId,
    photo_url: publicUrl,
    user_id: '00000000-0000-0000-0000-000000000000',
    photo_category: category,
    source_type: sourceType,
    source_url: sourceUrl || null,
    confidence: confidence ? parseFloat(confidence) : null,
    author_name: authorName || null,
    is_hero: isHero === 'true',
  });

  if (insertError) {
    console.error(JSON.stringify({ error: 'Insert failed', detail: insertError.message }));
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      success: true,
      photo_url: publicUrl,
      category,
      source_type: sourceType,
      is_hero: isHero === 'true',
    }),
  );
}

const ALLOWED_SOCIAL_FIELDS = [
  'social_instagram',
  'social_facebook',
  'social_whatsapp',
  'social_tiktok',
  'social_youtube',
  'club_site_web',
  'club_telephone',
  'club_email',
];

async function updateSocial(spotId: string, field: string, value: string) {
  if (!ALLOWED_SOCIAL_FIELDS.includes(field)) {
    console.error(JSON.stringify({ error: `Invalid field: ${field}`, allowed: ALLOWED_SOCIAL_FIELDS }));
    process.exit(1);
  }
  const { error } = await supabase().from('spots').update({ [field]: value }).eq('id', spotId);
  console.log(JSON.stringify({ success: !error, field, value, error: error?.message }));
}

async function updateDescription(spotId: string, description: string) {
  const { error } = await supabase().from('spots').update({ description }).eq('id', spotId);
  console.log(
    JSON.stringify({ success: !error, spotId, descriptionLength: description.length, error: error?.message }),
  );
}

async function updateAddress(spotId: string, newAddress: string) {
  const { error } = await supabase().from('spots').update({ address: newAddress }).eq('id', spotId);
  console.log(JSON.stringify({ success: !error, spotId, address: newAddress, error: error?.message }));
}

async function updateGoogleMaps(spotId: string, placeId: string, url: string) {
  const { error } = await supabase()
    .from('spots')
    .update({ google_place_id: placeId, google_maps_url: url })
    .eq('id', spotId);
  console.log(
    JSON.stringify({ success: !error, spotId, google_place_id: placeId, google_maps_url: url, error: error?.message }),
  );
}

async function cleanupV1(spotId: string) {
  // Find V1 photos: URLs containing places.googleapis.com (stored directly from Google)
  const { data: photos, error: fetchError } = await supabase()
    .from('spot_photos')
    .select('id, photo_url, source_type')
    .eq('spot_id', spotId);

  if (fetchError) {
    console.error(JSON.stringify({ error: 'Failed to fetch photos', detail: fetchError.message }));
    process.exit(1);
  }

  const v1Photos = (photos || []).filter(
    (p: Record<string, unknown>) =>
      typeof p.photo_url === 'string' && (p.photo_url as string).includes('places.googleapis.com'),
  );

  if (v1Photos.length === 0) {
    console.log(JSON.stringify({ success: true, spotId, v1_marked: 0, message: 'No V1 photos found' }));
    return;
  }

  const ids = v1Photos.map((p: Record<string, unknown>) => p.id);
  const { error: updateError } = await supabase()
    .from('spot_photos')
    .update({ source_type: 'v1_deprecated' })
    .in('id', ids);

  console.log(
    JSON.stringify({
      success: !updateError,
      spotId,
      v1_marked: v1Photos.length,
      ids,
      error: updateError?.message,
    }),
  );
}

async function completeness(spotId: string) {
  const { data: spot, error: spotError } = await supabase()
    .from('spots')
    .select(
      'id, name, description, social_instagram, social_facebook, social_whatsapp, social_tiktok, social_youtube, club_site_web, club_telephone, club_email, google_maps_url, google_place_id',
    )
    .eq('id', spotId)
    .single();

  if (spotError || !spot) {
    console.error(JSON.stringify({ error: 'Spot not found', spotId }));
    process.exit(1);
  }

  // Count non-deprecated photos
  const { data: photos } = await supabase()
    .from('spot_photos')
    .select('id, photo_category, is_hero, source_type')
    .eq('spot_id', spotId)
    .neq('source_type', 'v1_deprecated');

  const activePhotos = (photos || []).filter(
    (p: Record<string, unknown>) => p.source_type !== 'v1_deprecated',
  );
  const photoCount = Math.min(activePhotos.length, 5);

  const hasDescription = spot.description ? 1 : 0;

  const socialFields = [
    'social_instagram',
    'social_facebook',
    'social_whatsapp',
    'social_tiktok',
    'social_youtube',
    'club_site_web',
    'club_telephone',
    'club_email',
  ];
  const socialCount = socialFields.filter((f) => !!(spot as Record<string, unknown>)[f]).length;

  const hasGoogleMaps = spot.google_maps_url || spot.google_place_id ? 1 : 0;

  const categories = activePhotos.map((p: Record<string, unknown>) => p.photo_category).filter(Boolean);
  const hasHero = activePhotos.some((p: Record<string, unknown>) => p.is_hero);

  console.log(
    JSON.stringify({
      spotId,
      name: spot.name,
      photos: photoCount,
      photos_max: 5,
      photo_categories: [...new Set(categories)],
      has_hero: hasHero,
      description: hasDescription,
      social: socialCount,
      social_fields: socialFields.filter((f) => !!(spot as Record<string, unknown>)[f]),
      google_maps: hasGoogleMaps,
      total_score: photoCount + hasDescription + socialCount + hasGoogleMaps,
    }),
  );
}

// ── CLI Router ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

function printUsage() {
  console.error(`enrich-spot.ts V2 — Spot enrichment script

Commands:
  --list [--type=X] [--limit=N] [--no-photos]                          List spots to enrich
  --scout <spotId>                                                       Concentric search with confidence
  --save-photo <spotId> <localPath> <category> <sourceType> [sourceUrl] [confidence] [authorName] [isHero]
  --update-social <spotId> <field> <value>                              Update social/contact field
  --update-description <spotId> <description>                           Update description
  --update-address <spotId> <newAddress>                                Replace address
  --update-google-maps <spotId> <placeId> <url>                         Save google_place_id + url
  --cleanup-v1 <spotId>                                                  Mark V1 photos as deprecated
  --completeness <spotId>                                                Return completeness score

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY`);
  process.exit(1);
}

if (cmd === '--list') {
  const type = args.find((a) => a.startsWith('--type='))?.split('=')[1];
  const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '50');
  const noPhotos = args.includes('--no-photos');
  listSpots({ type, limit, noPhotos });
} else if (cmd === '--scout') {
  if (!args[1]) {
    console.error('Usage: --scout <spotId>');
    process.exit(1);
  }
  scoutSpot(args[1]);
} else if (cmd === '--save-photo') {
  if (!args[1] || !args[2] || !args[3] || !args[4]) {
    console.error('Usage: --save-photo <spotId> <localPath> <category> <sourceType> [sourceUrl] [confidence] [authorName] [isHero]');
    process.exit(1);
  }
  savePhoto(args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
} else if (cmd === '--update-social') {
  if (!args[1] || !args[2] || !args[3]) {
    console.error('Usage: --update-social <spotId> <field> <value>');
    process.exit(1);
  }
  updateSocial(args[1], args[2], args[3]);
} else if (cmd === '--update-description') {
  if (!args[1] || !args[2]) {
    console.error('Usage: --update-description <spotId> <description>');
    process.exit(1);
  }
  updateDescription(args[1], args.slice(2).join(' '));
} else if (cmd === '--update-address') {
  if (!args[1] || !args[2]) {
    console.error('Usage: --update-address <spotId> <newAddress>');
    process.exit(1);
  }
  updateAddress(args[1], args.slice(2).join(' '));
} else if (cmd === '--update-google-maps') {
  if (!args[1] || !args[2] || !args[3]) {
    console.error('Usage: --update-google-maps <spotId> <placeId> <url>');
    process.exit(1);
  }
  updateGoogleMaps(args[1], args[2], args[3]);
} else if (cmd === '--cleanup-v1') {
  if (!args[1]) {
    console.error('Usage: --cleanup-v1 <spotId>');
    process.exit(1);
  }
  cleanupV1(args[1]);
} else if (cmd === '--completeness') {
  if (!args[1]) {
    console.error('Usage: --completeness <spotId>');
    process.exit(1);
  }
  completeness(args[1]);
} else if (cmd === '--help' || cmd === '-h') {
  printUsage();
} else {
  printUsage();
}
