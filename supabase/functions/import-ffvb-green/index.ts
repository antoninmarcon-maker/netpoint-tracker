import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DATA_ES_BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records'

// Exact query used by FFVB embed for green-volley
const GREEN_QUERY = `#search(aps_name,"volley") AND (equip_nature = "Découvert" OR equip_nature = "Découvrable" OR equip_nature = "Extérieur couvert" OR equip_nature = "Site naturel" OR equip_nature = "Site naturel aménagé") AND (equip_sol = "Gazon naturel" OR equip_sol = "Synthétique (hors gazon)") AND (equip_type_name = "Terrain de volley-ball" OR equip_type_name = "Terrain de beach-volley")`

const FIELDS = [
  'equip_numero', 'inst_nom', 'inst_adresse', 'inst_cp', 'new_name',
  'dep_nom', 'reg_nom', 'equip_coordonnees',
  'equip_sol', 'equip_eclair', 'equip_acc_libre', 'equip_saison',
  'equip_nature', 'equip_type_name',
  'inst_acc_handi_type', 'inst_acc_handi_bool',
  'equip_piste_nb', 'equip_long', 'equip_larg',
  'equip_ouv_public_bool', 'equip_url',
].join(',')

interface DataEsRecord {
  equip_numero: string
  inst_nom: string
  inst_adresse: string | null
  inst_cp: string | null
  new_name: string | null
  dep_nom: string | null
  reg_nom: string | null
  equip_coordonnees: { lat: number; lon: number } | null
  equip_sol: string | null
  equip_eclair: string | null
  equip_acc_libre: string | null
  equip_saison: string | null
  equip_nature: string | null
  equip_type_name: string | null
  inst_acc_handi_type: string | null
  inst_acc_handi_bool: string | null
  equip_piste_nb: number | null
  equip_long: number | null
  equip_larg: number | null
  equip_ouv_public_bool: string | null
  equip_url: string | null
}

function mapToSpot(r: DataEsRecord) {
  const address = [r.inst_adresse, r.inst_cp, r.new_name].filter(Boolean).join(', ')
  const hasPmr = typeof r.inst_acc_handi_type === 'string'
    ? r.inst_acc_handi_type.toLowerCase().includes('moteur')
    : r.inst_acc_handi_bool === 'true'

  // Distinguish natural vs synthetic grass
  const solLabel = r.equip_sol === 'Gazon naturel' ? 'Gazon naturel' : 'Gazon synthétique'

  return {
    external_id: r.equip_numero,
    name: r.inst_nom || `Terrain de green-volley — ${r.new_name || r.inst_cp}`,
    address: address || null,
    type: 'green_volley',
    source: 'ffvb_green',
    status: 'validated',
    user_id: '00000000-0000-0000-0000-000000000000',
    ffvb_ligue: r.reg_nom || null,
    ffvb_comite: r.dep_nom || null,
    equip_sol: solLabel,
    equip_eclairage: r.equip_eclair === 'true',
    equip_acces_libre: r.equip_acc_libre === 'true',
    equip_pmr: hasPmr,
    equip_saisonnier: r.equip_saison === 'true',
    equip_nb_terrains: r.equip_piste_nb || null,
    equip_longueur: r.equip_long || null,
    equip_largeur: r.equip_larg || null,
    club_site_web: r.equip_url || null,
    _lat: r.equip_coordonnees?.lat ?? null,
    _lng: r.equip_coordonnees?.lon ?? null,
  }
}

async function fetchPage(offset: number, limit: number): Promise<{ results: DataEsRecord[]; total_count: number }> {
  const params = new URLSearchParams({
    where: GREEN_QUERY,
    select: FIELDS,
    limit: String(limit),
    offset: String(offset),
  })
  const res = await fetch(`${DATA_ES_BASE}?${params}`, {
    headers: { 'User-Agent': 'MyVolley-App/1.0' },
  })
  if (!res.ok) throw new Error(`data-es API error: ${res.status} ${await res.text()}`)
  return res.json()
}

async function runImport() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config')

  const supabase = createClient(supabaseUrl, supabaseKey)

  const LIMIT = 100
  let offset = 0
  let totalCount = 0
  let imported = 0
  let skipped = 0
  let errors = 0

  console.log('Starting import-ffvb-green...')

  do {
    const page = await fetchPage(offset, LIMIT)
    totalCount = page.total_count
    const records = page.results

    if (records.length === 0) break

    for (const r of records) {
      if (!r.equip_coordonnees?.lat || !r.equip_coordonnees?.lon) {
        skipped++
        continue
      }

      const spot = mapToSpot(r)
      const { _lat, _lng, ...spotData } = spot

      const { error } = await supabase.rpc('upsert_spot_with_location', {
        p_external_id: spotData.external_id,
        p_name: spotData.name,
        p_address: spotData.address,
        p_type: spotData.type,
        p_source: spotData.source,
        p_status: spotData.status,
        p_user_id: spotData.user_id,
        p_lat: _lat,
        p_lng: _lng,
        p_ffvb_ligue: spotData.ffvb_ligue,
        p_ffvb_comite: spotData.ffvb_comite,
        p_equip_sol: spotData.equip_sol,
        p_equip_eclairage: spotData.equip_eclairage,
        p_equip_acces_libre: spotData.equip_acces_libre,
        p_equip_pmr: spotData.equip_pmr,
        p_equip_saisonnier: spotData.equip_saisonnier,
        p_equip_nb_terrains: spotData.equip_nb_terrains,
        p_equip_longueur: spotData.equip_longueur,
        p_equip_largeur: spotData.equip_largeur,
        p_club_site_web: spotData.club_site_web,
      })

      if (error) {
        console.error(`Error upserting ${r.equip_numero}:`, error.message)
        errors++
      } else {
        imported++
      }
    }

    console.log(`Processed ${offset + records.length}/${totalCount}`)
    offset += LIMIT
  } while (offset < totalCount)

  return {
    success: true,
    total: totalCount,
    imported,
    skipped,
    errors,
    message: `Green-volley import done. ${imported} upserted, ${skipped} sans coords, ${errors} erreurs.`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const result = await runImport()
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
