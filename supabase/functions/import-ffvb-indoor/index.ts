import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google My Maps KML export — gymnases indoor FFVB
const KML_URL = 'https://www.google.com/maps/d/kml?mid=1W7BcLtL5uKmBHCRzEIoiiJQ-lX5XpAo&forcekml=1'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

interface GymData {
  name: string
  nomSite: string
  address: string
  cp: string
  ligue: string
  dep: string
  hauteur: number | null
  longueur: number | null
  largeur: number | null
  sol: string | null
  tribunes: number | null
  vestiaires: number | null
}

function getTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  return m[1].trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}

function parseKmlDescription(html: string): Record<string, string> {
  const pairs: Record<string, string> = {}
  const parts = html.split(/<br\s*\/?>/gi)
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx === -1) continue
    const key = part.slice(0, colonIdx).trim().replace(/<[^>]+>/g, '').trim()
    const value = part.slice(colonIdx + 1).trim().replace(/<[^>]+>/g, '').trim()
    if (key && value) pairs[key] = value
  }
  return pairs
}

function toNum(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

function toInt(v: string | undefined): number | null {
  if (!v) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

async function geocodeAddress(address: string, cp: string): Promise<{ lat: number; lng: number } | null> {
  const query = [address, cp, 'France'].filter(Boolean).join(', ')
  const params = new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: 'fr' })
  try {
    const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': 'MyVolley-App/1.0 (contact@myvolley.app)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

function parseKml(kmlText: string): GymData[] {
  const gyms: GymData[] = []
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi
  let match: RegExpExecArray | null
  while ((match = placemarkRegex.exec(kmlText)) !== null) {
    const pm = match[0]
    const name = getTag(pm, 'name')
    const descRaw = getTag(pm, 'description')
    const fields = parseKmlDescription(descRaw)
    const addressRaw = getTag(pm, 'address')

    const cp = (fields['CP'] || '').trim()
    const ligue = (fields['Ligue'] || '').trim()
    const dep = (fields['Département Nom'] || '').trim()
    const nomSite = (fields['Nom du site'] || '').trim()
    const adresseSite = (fields['Adresse'] || addressRaw).trim()

    if (!name && !nomSite) continue

    gyms.push({
      name: nomSite || name,
      nomSite,
      address: adresseSite || addressRaw,
      cp,
      ligue,
      dep,
      hauteur: toNum(fields['Hauteur de l\'aire d\'évolution']),
      longueur: toNum(fields['Longueur de l\'aire d\'évolution']),
      largeur: toNum(fields['Largeur de l\'aire d\'évolution']),
      sol: fields['Nature du sol'] || null,
      tribunes: toInt(fields['Nombre de places assises en tribune']),
      vestiaires: toInt(fields['Nombre de vestiaires sportifs']),
    })
  }
  return gyms
}

async function runImport(startOffset: number, batchLimit: number, autoChain: boolean) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Only cleanup on first batch
  if (startOffset === 0) {
    console.log('Cleaning up previous ffvb_indoor spots...')
    await supabase.from('spots').delete().eq('source', 'ffvb_indoor')
  }

  console.log('Fetching indoor KML from Google My Maps...')
  const kmlRes = await fetch(KML_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyVolley/1.0)' },
  })
  if (!kmlRes.ok) throw new Error(`KML fetch failed: ${kmlRes.status}`)
  const kmlText = await kmlRes.text()

  console.log('Parsing KML...')
  const allGyms = parseKml(kmlText)
  const total = allGyms.length
  console.log(`Found ${total} gymnases in KML, processing batch offset=${startOffset} limit=${batchLimit}`)

  const gyms = allGyms.slice(startOffset, startOffset + batchLimit)

  let imported = 0
  let geocodeFailed = 0
  let errors = 0

  for (let i = 0; i < gyms.length; i++) {
    const gym = gyms[i]
    const externalId = `indoor_${gym.name}_${gym.cp}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 100)

    const coords = await geocodeAddress(gym.address, gym.cp)
    if (!coords) {
      console.warn(`No coords: ${gym.name} (${gym.cp})`)
      geocodeFailed++
    }

    const { error } = await supabase.rpc('upsert_spot_with_location', {
      p_external_id: externalId,
      p_name: gym.name,
      p_address: gym.address,
      p_type: 'indoor',
      p_source: 'ffvb_indoor',
      p_status: 'validated',
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_lat: coords?.lat ?? 46.603354,
      p_lng: coords?.lng ?? 1.888334,
      p_ffvb_ligue: gym.ligue || null,
      p_ffvb_comite: gym.dep || null,
      p_equip_sol: gym.sol,
      p_equip_hauteur: gym.hauteur,
      p_equip_longueur: gym.longueur,
      p_equip_largeur: gym.largeur,
      p_equip_tribunes: gym.tribunes,
      p_equip_vestiaires: gym.vestiaires,
    })

    if (error) {
      console.error(`Error upserting ${gym.name}:`, error.message)
      errors++
    } else {
      imported++
    }

    if ((startOffset + i) % 50 === 0) console.log(`Progress: ${startOffset + i}/${total}`)
    // Nominatim rate limit: 1 req/sec
    await new Promise(resolve => setTimeout(resolve, 1100))
  }

  const nextOffset = startOffset + gyms.length
  const done = nextOffset >= total

  const result = {
    success: true,
    total,
    batch_start: startOffset,
    batch_end: nextOffset,
    imported,
    geocodeFailed,
    errors,
    done,
    next_offset: done ? null : nextOffset,
    message: `Indoor batch done. ${imported} upserted (offset ${startOffset}→${nextOffset}/${total}). ${done ? 'COMPLETE' : `Next: offset=${nextOffset}`}`,
  }

  // Auto-chain: fire next batch in background if not done
  if (!done && autoChain) {
    const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-ffvb-indoor`
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log(`Auto-chaining next batch: offset=${nextOffset}`)
    fetch(selfUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ offset: nextOffset, limit: batchLimit, auto_chain: true }),
    }).catch(e => console.error('Auto-chain fetch error:', e))
  }

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  try {
    let startOffset = 0
    let batchLimit = 200
    try {
      const body = await req.json()
      if (typeof body.offset === 'number') startOffset = body.offset
      if (typeof body.limit === 'number') batchLimit = body.limit
    } catch { /* no body = defaults */ }

    const result = await runImport(startOffset, batchLimit)
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
