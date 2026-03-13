import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function getAiSummary(reviews: any[], louvableApiKey: string) {
  if (!reviews || reviews.length === 0) return null;
  
  // Clean reviews to avoid context window issues
  const reviewsText = reviews
    .slice(0, 5) // Top 5 reviews
    .map(r => r.text?.text)
    .filter(Boolean)
    .join('\n---\n');
    
  if (!reviewsText) return null;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${louvableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          { 
            role: "system", 
            content: "Tu es un assistant qui résume des avis sur des terrains de volley/beach-volley. Crée un résumé court (2 phrases max) et attrayant en français basé sur les avis fournis. Ne mentionne pas que c'est un résumé IA dans le texte lui-même. Sois factuel sur les installations." 
          },
          { role: "user", content: `Voici les avis :\n${reviewsText}` },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI Gateway responded with:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("AI aggregation error:", err);
    return null;
  }
}

async function runImportSpots(query: string = 'terrain de beach volley France') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  const louvableApiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase config")
  if (!googleApiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY")

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Ensure storage bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.id === 'spot-photos')) {
    console.log("Creating 'spot-photos' bucket...");
    await supabase.storage.createBucket('spot-photos', { public: true });
  }

  console.log(`Starting Google Places import for query: ${query}`);

  const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.photos,places.reviews'
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

  const newSpotsCount = [];
  const skippedSpotsCount = [];

  for (const place of places) {
    const placeId = place.id;
    const name = place.displayName?.text || 'Terrain de Volley';
    const address = place.formattedAddress;
    
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    if (!lat || !lng) continue;

    const { data: existingSpot } = await supabase
      .from('spots')
      .select('id')
      .eq('google_place_id', placeId)
      .maybeSingle();

    if (existingSpot) {
      skippedSpotsCount.push(name);
      continue;
    }

    let courtType = 'outdoor_hard'; 
    if (query.toLowerCase().includes('beach')) {
      courtType = 'beach';
    } else if (query.toLowerCase().includes('salle') || query.toLowerCase().includes('gymnase')) {
      courtType = 'indoor';
    }

    // AI Summary
    let description = `Importé automatiquement de Google Places. Adresse : ${address}`;
    if (louvableApiKey && place.reviews?.length > 0) {
      const summary = await getAiSummary(place.reviews, louvableApiKey);
      if (summary) description = summary;
    }

    const { data: spotData, error: insertErr } = await supabase
      .from('spots')
      .insert({
        name,
        description,
        address,
        lat,
        lng,
        type: courtType,
        status: 'waiting_for_validation',
        user_id: '00000000-0000-0000-0000-000000000000',
        google_place_id: placeId
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error(`Failed to insert spot ${name}:`, insertErr);
      skippedSpotsCount.push(name);
      continue;
    }

    const spotId = spotData.id;
    newSpotsCount.push(name);
    console.info(`Successfully added spot: ${name}`);

    // Process Photos (max 3)
    console.log(`Photos available for ${name}: ${place.photos?.length ?? 0}`);
    if (place.photos && place.photos.length > 0) {
      const photosToProcess = place.photos.slice(0, 3);
      for (const photo of photosToProcess) {
        try {
          // New format for photo media
          const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${googleApiKey}&maxWidthPx=800`;
          const imgRes = await fetch(photoUrl);
          if (!imgRes.ok) {
            console.error(`Failed to fetch photo from Google: ${imgRes.status}`);
            continue;
          }
          
          const blob = await imgRes.blob();
          const fileName = `${spotId}/${crypto.randomUUID()}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('spot-photos')
            .upload(fileName, blob, { 
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('spot-photos')
            .getPublicUrl(fileName);

          await supabase.from('spot_photos').insert({
            spot_id: spotId,
            photo_url: publicUrl,
            user_id: '00000000-0000-0000-0000-000000000000'
          });
        } catch (photoErr) {
          console.error("Error processing photo:", photoErr);
        }
      }
    }
  }

  return {
    success: true,
    summary: `Processed ${places.length} places. Imported ${newSpotsCount.length}. Skipped ${skippedSpotsCount.length}.`,
    importedCount: newSpotsCount.length,
    skippedCount: skippedSpotsCount.length
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // ignore
    }
    const query = (body.query as string) || 'terrain de beach volley France';
    
    const result = await runImportSpots(query);

    return new Response(JSON.stringify(result), {
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

