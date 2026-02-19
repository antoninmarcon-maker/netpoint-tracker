import { supabase } from '@/integrations/supabase/client';
import { MatchSummary, SetData, Point, Player } from '@/types/sports';
import { getAllMatches as getLocalMatches } from './matchStorage';

// Helper: check if user has an active session
async function hasSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Sync local matches to cloud on first login
export async function syncLocalMatchesToCloud(userId: string) {
  const localMatches = getLocalMatches();
  if (localMatches.length === 0) return;

  for (const match of localMatches) {
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match.id)
      .maybeSingle();

    if (!existing) {
      await saveCloudMatch(userId, match);
    }
  }
}

// Get all matches from cloud — read from match_data JSON (always available)
export async function getCloudMatches(): Promise<MatchSummary[]> {
  if (!(await hasSession())) return [];
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => row.match_data as unknown as MatchSummary);
}

// Save match to cloud — writes to both match_data AND normalized tables
export async function saveCloudMatch(userId: string, match: MatchSummary) {
  if (!(await hasSession())) return;

  // 1. Upsert the match row (including match_data for backward compat reads)
  const { error: matchError } = await supabase.from('matches').upsert({
    id: match.id,
    user_id: userId,
    match_data: match as any,
    finished: match.finished,
    sport: match.sport || 'volleyball',
    updated_at: new Date().toISOString(),
  });

}

// Delete match from cloud
export async function deleteCloudMatch(matchId: string) {
  if (!(await hasSession())) return;
  // CASCADE handles related tables automatically
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);
  if (error) console.error('Cloud delete error:', error);
}

// Generate or retrieve a share token for a match
export async function generateShareToken(matchId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token')
    .eq('id', matchId)
    .maybeSingle();

  if (existing?.share_token) return existing.share_token;

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const { error } = await supabase
    .from('matches')
    .update({ share_token: token } as any)
    .eq('id', matchId);

  if (error) {
    console.error('Share token error:', error);
    return null;
  }
  return token;
}

// Get match data by share token (public, no auth needed)
export async function getMatchByShareToken(token: string): Promise<MatchSummary | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('match_data')
    .eq('share_token', token)
    .maybeSingle();

  if (error || !data) return null;
  return data.match_data as unknown as MatchSummary;
}

// Fetch a single match from cloud by ID
export async function getCloudMatchById(matchId: string): Promise<MatchSummary | null> {
  if (!(await hasSession())) return null;

  const { data } = await supabase
    .from('matches')
    .select('match_data')
    .eq('id', matchId)
    .maybeSingle();

  if (!data?.match_data) return null;
  return data.match_data as unknown as MatchSummary;
}
