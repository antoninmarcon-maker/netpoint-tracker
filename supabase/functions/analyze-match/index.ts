import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function getSystemPrompt(sport: string): string {
  const base = `Tu es un analyste sportif expert. Tu produis des analyses de performance concises et tactiques en français.

Format obligatoire (250 mots max) :
1. **Résumé du score et dynamique** (~30 mots) : résumé du match et de sa dynamique.
2. **Points forts / Joueurs clés** (~70 mots) : mets en avant les performances individuelles remarquables avec des chiffres.
3. **Points faibles / Axes d'amélioration** (~70 mots) : identifie les faiblesses récurrentes et les zones à travailler.
4. **Conseil tactique** (~30 mots) : un conseil concret et actionnable pour le prochain match.

Utilise des emojis (⚡🎯🛡️📊🔑) pour structurer visuellement. Sois direct et factuel.`;

  switch (sport) {
    case 'tennis':
      return base + `\n\nContexte Tennis : Analyse le ratio "coups gagnants / fautes directes". Si tu détectes une accumulation de fautes côté revers ou coup droit, suggère un changement tactique (varier les zones, jouer plus court, monter au filet). Utilise le vocabulaire tennis : ace, double faute, coup droit gagnant, revers gagnant, volée, passing, break, jeu de service. Compare l'évolution entre les sets si disponible.`;
    case 'padel':
      return base + `\n\nContexte Padel : Concentre-toi sur les "zones de smash" et l'utilisation des vitres. Si un joueur frappe trop souvent dans la vitre, recommande de réduire la force ou d'utiliser plus d'effet. Analyse les víboras, bandejas, bajadas et chiquitas. Utilise le vocabulaire padel spécifique. Si les fautes de grille ou vitre sont nombreuses, suggère un repositionnement.`;
    case 'basketball':
      return base + `\n\nContexte Basketball : Analyse la répartition des tirs (lancers francs, 2pts intérieurs, 3pts extérieurs), le pourcentage de réussite et les pertes de balle. Identifie les joueurs clés par leur contribution au score total.`;
    default: // volleyball
      return base + `\n\nContexte Volleyball : Analyse les attaques, aces, blocks, bidouilles. Identifie les rotations faibles et les axes de progression sur le service et la réception. Utilise le vocabulaire volley.`;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const body = await req.json();
    const { matchStats, sport } = body;

    // Validate matchStats
    if (!matchStats || typeof matchStats !== 'string' || matchStats.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or missing matchStats' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (matchStats.length > 10000) {
      return new Response(JSON.stringify({ error: 'matchStats too large (max 10000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate sport
    const allowedSports = ['volleyball', 'basketball', 'tennis', 'padel'];
    if (sport && (typeof sport !== 'string' || !allowedSports.includes(sport))) {
      return new Response(JSON.stringify({ error: 'Invalid sport type' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = getSystemPrompt(sport || 'volleyball');

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: `Voici les statistiques du match à analyser :\n\n${matchStats}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service d'analyse" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || "Analyse non disponible.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
