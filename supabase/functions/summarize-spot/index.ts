import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { spot_id } = await req.json()
    if (!spot_id) {
      return new Response(JSON.stringify({ error: 'spot_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch spot info
    const { data: spot } = await supabase
      .from('spots')
      .select('name, type, description')
      .eq('id', spot_id)
      .maybeSingle()

    if (!spot) {
      return new Response(JSON.stringify({ error: 'Spot not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch comments
    const { data: comments } = await supabase
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `Tu es un assistant qui résume les avis de joueurs sur un terrain de volleyball/beach-volley appelé "${spot.name}". Crée un résumé court (3 phrases max) et utile en français. Mentionne la qualité du terrain, l'ambiance et les points positifs/négatifs. Sois factuel et direct.`,
        messages: [
          { role: "user", content: `Voici les ${comments.length} avis des joueurs :\n${commentsList}` },
        ],
      }),
    })

    if (!response.ok) {
      const status = response.status
      const text = await response.text()
      console.error("Anthropic API error:", status, text)

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
    const summary = data.content?.[0]?.text || null

    if (!summary) {
      return new Response(JSON.stringify({ error: 'empty_response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save summary as description
    await supabase
      .from('spots')
      .update({ description: summary })
      .eq('id', spot_id)

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
