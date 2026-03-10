import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')

    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase config")
    if (!googleApiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY")

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Parse request to see if there's a specific query (optional)
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // ignore empty body
    }
    const { query = 'terrain de beach volley France', openNow = false } = body as any;

    console.log(`Starting Google Places import for query: ${query}`);

    // Call Google Places Text Search (New API)
    // Field mask documentation: https://developers.google.com/maps/documentation/places/web-service/text-search
    const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'fr'
      })
    });

    if (!placesResponse.ok) {
        const err = await placesResponse.text();
        throw new Error(`Google API returned ${placesResponse.status}: ${err}`);
    }

    const placesData = await placesResponse.json();
    const places = placesData.places || [];

    console.log(`Found ${places.length} places from Google API.`);

    const newSpots = [];
    const skippedSpots = [];

    // Map the places into our Spot schema
    for (const place of places) {
        const placeId = place.id;
        const name = place.displayName?.text || 'Terrain de Volley';
        const address = place.formattedAddress;
        
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;

        if (!lat || !lng) continue;

        // Try to guess the court type based on the query or place's type
        let courtType = 'outdoor_hard'; 
        if (query.toLowerCase().includes('beach')) {
            courtType = 'beach';
        } else if (query.toLowerCase().includes('salle') || query.toLowerCase().includes('gymnase')) {
             courtType = 'indoor';
        }

        // Prepare the insert string (PostGIS point format: 'POINT(lon lat)')
        // Make sure to insert the Google ID to prevent duplicates.
        const { data: existingSpot, error: lookupErr } = await supabase
            .from('spots')
            .select('id')
            .eq('google_place_id', placeId)
            .maybeSingle();

        if (existingSpot) {
            skippedSpots.push({ name, reason: 'Already exists (Google Place ID match)' });
            continue;
        }

        // It's a new spot, we insert it
        const { error: insertErr } = await supabase
            .from('spots')
            .insert({
                name: name,
                description: `Importé automatiquement de Google Places. Adresse : ${address}`,
                location: `POINT(${lng} ${lat})`, // Note: PostGIS is Longitude Latitude
                type: courtType,
                status: 'waiting_for_validation', 
                google_place_id: placeId,
                is_verified: false,
                is_temporary: false // Default to false unless explicitly detected
            });

        if (insertErr) {
            console.error(`Failed to insert spot ${name}:`, insertErr);
            skippedSpots.push({ name, reason: `DB Insert Error: ${insertErr.message}` });
        } else {
            console.log(`Successfully added spot: ${name}`);
            newSpots.push({ name, type: courtType, placeId });
        }
    }

    return new Response(JSON.stringify({
        success: true,
        summary: `Processed ${places.length} places. Imported ${newSpots.length}. Skipped ${skippedSpots.length}.`,
        imported: newSpots,
        skipped: skippedSpots
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })

  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
