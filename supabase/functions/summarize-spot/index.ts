import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const ALLOWED_ORIGINS = [
  "https://www.my-volley.com",
  "https://my-volley.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.some((o) => origin === o || origin.endsWith(".vercel.app"))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { spot_id } = await req.json()

    if (!spot_id || typeof spot_id !== "string" || !/^[0-9a-f-]{36}$/i.test(spot_id)) {
      return new Response(JSON.stringify({ error: 'spot_id must be a valid UUID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: spot } = await serviceClient
      .from('spots')
      .select('name, type, description, user_id')
      .eq('id', spot_id)
      .maybeSingle()

    if (!spot) {
      return new Response(JSON.stringify({ error: 'Spot not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: comments } = await serviceClient
      .from('spot_comments')
      .select('content, rating')
      .eq('spot_id', spot_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!comments || comments.length === 0) {
      return new Response(JSON.stringify({ error: 'no_comments', message: 'Aucun commentaire pour générer un résumé.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const commentsList = comments
      .filter((c: any) => c.content?.trim())
      .map((c: any) => `${c.content}${c.rating ? ` (note: ${c.rating}/5)` : ''}`)
      .join('\n---\n')

    if (!commentsList) {
      return new Response(JSON.stringify({ error: 'no_comments', message: 'Aucun commentaire textuel.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sanitizedName = spot.name.replace(/["'`\\]/g, "").slice(0, 100);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `Tu es un assistant qui résume les avis de joueurs sur un terrain de volleyball/beach-volley appelé ${sanitizedName}. Crée un résumé court (3 phrases max) et utile en français. Mentionne la qualité du terrain, l'ambiance et les points positifs/négatifs. Sois factuel et direct.` }] },
          contents: [
            { role: "user", parts: [{ text: `Voici les ${comments.length} avis des joueurs :\n${commentsList}` }] },
          ],
          generationConfig: { maxOutputTokens: 512 },
        }),
      }
    )

    if (!response.ok) {
      const status = response.status
      const text = await response.text()
      console.error("Gemini API error:", status, text)

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limit', message: 'Trop de requêtes, réessayez plus tard.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'ai_error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || null

    if (!summary) {
      return new Response(JSON.stringify({ error: 'empty_response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only allow spot owner or system-imported spots to be updated
    const isOwner = spot.user_id === user.id;
    const isSystemSpot = spot.user_id === '00000000-0000-0000-0000-000000000000';
    if (!isOwner && !isSystemSpot) {
      return new Response(JSON.stringify({ error: "Forbidden: you do not own this spot" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await serviceClient
      .from('spots')
      .update({ description: summary })
      .eq('id', spot_id)

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: 'An error occurred while generating the summary' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
