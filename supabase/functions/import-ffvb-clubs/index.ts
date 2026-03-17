import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google My Maps KML export — clubs affiliés FFVB
const KML_URL = 'https://www.google.com/maps/d/kml?mid=1FeR33v2UZ7nOlueFb9C2DhALfjsBpr0&forcekml=1'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

interface ClubData {
  name: string
  address: string
  cp: string
  ville: string
  ligue: string
  comite: string
  lienFiche: string | null
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
    const key = part.slice(0, colonIdx).trim().replace(/<[^>]+>/g, '')
    const value = part.slice(colonIdx + 1).trim().replace(/<[^>]+>/g, '')
    if (key && value) pairs[key] = value
  }
  return pairs
}

async function geocodeAddress(address: string, cp: string, ville: string): Promise<{ lat: number; lng: number } | null> {
  const query = [address, cp, ville, 'France'].filter(Boolean).join(', ')
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

function parseKml(kmlText: string): ClubData[] {
  const clubs: ClubData[] = []
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi
  let match: RegExpExecArray | null
  while ((match = placemarkRegex.exec(kmlText)) !== null) {
    const pm = match[0]
    const name = getTag(pm, 'name')
    const descRaw = getTag(pm, 'description')
    const fields = parseKmlDescription(descRaw)
    const addressTag = getTag(pm, 'address')

    const cp = (fields['cp'] || fields['CP'] || '').trim()
    const ville = (fields['ville'] || '').trim()
    const ligue = (fields['Ligue'] || '').trim().replace(/^Ligue\s+/i, '')
    const comite = (fields['Comité'] || fields['Comite'] || '').trim()
    const lienFiche = fields['Lien Fiche'] || null
    const address = addressTag || [cp, ville].filter(Boolean).join(' ')

    if (!name || (!cp && !ville)) continue
    clubs.push({ name, address, cp, ville, ligue, comite, lienFiche })
  }
  return clubs
}

async function runImport(startOffset: number, batchLimit: number) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Only cleanup on first batch
  if (startOffset === 0) {
    console.log('Cleaning up previous ffvb_club spots...')
    await supabase.from('spots').delete().eq('source', 'ffvb_club')
  }

  console.log('Fetching clubs KML from Google My Maps...')
  const kmlRes = await fetch(KML_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyVolley/1.0)' },
  })
  if (!kmlRes.ok) throw new Error(`KML fetch failed: ${kmlRes.status}`)
  const kmlText = await kmlRes.text()

  console.log('Parsing KML...')
  const allClubs = parseKml(kmlText)
  const total = allClubs.length
  console.log(`Found ${total} clubs in KML, processing batch offset=${startOffset} limit=${batchLimit}`)

  const clubs = allClubs.slice(startOffset, startOffset + batchLimit)

  let imported = 0
  let geocodeFailed = 0
  let errors = 0

  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i]
    let externalId: string
    if (club.lienFiche) {
      const m = club.lienFiche.match(/id_club=([^&]+)/)
      externalId = m ? `club_${m[1]}` : `club_${club.name}_${club.cp}`.replace(/\s+/g, '_').toLowerCase()
    } else {
      externalId = `club_${club.name}_${club.cp}`.replace(/\s+/g, '_').toLowerCase()
    }

    const coords = await geocodeAddress(club.address, club.cp, club.ville)
    if (!coords) {
      console.warn(`No coords for: ${club.name} (${club.cp} ${club.ville})`)
      geocodeFailed++
    }

    const { error } = await supabase.rpc('upsert_spot_with_location', {
      p_external_id: externalId,
      p_name: club.name,
      p_address: club.address,
      p_type: 'club',
      p_source: 'ffvb_club',
      p_status: 'validated',
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_lat: coords?.lat ?? 46.603354,
      p_lng: coords?.lng ?? 1.888334,
      p_ffvb_ligue: club.ligue || null,
      p_ffvb_comite: club.comite || null,
      p_club_lien_fiche: club.lienFiche || null,
    })

    if (error) {
      console.error(`Error upserting club ${club.name}:`, error.message)
      errors++
    } else {
      imported++
    }

    if ((startOffset + i) % 50 === 0) console.log(`Progress: ${startOffset + i}/${total}`)
    // Respect Nominatim rate limit: 1 req/sec
    await new Promise(resolve => setTimeout(resolve, 1100))
  }

  const nextOffset = startOffset + clubs.length
  const done = nextOffset >= total

  return {
    success: true,
    total,
    batch_start: startOffset,
    batch_end: nextOffset,
    imported,
    geocodeFailed,
    errors,
    done,
    next_offset: done ? null : nextOffset,
    message: `Clubs batch done. ${imported} upserted (offset ${startOffset}→${nextOffset}/${total}). ${done ? 'COMPLETE' : `Next: offset=${nextOffset}`}`,
  }
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
