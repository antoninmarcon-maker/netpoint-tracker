import { supabase } from '@/integrations/supabase/client';
import { MatchSummary, SetData, Point, Player } from '@/types/sports';
import { getAllMatches as getLocalMatches } from './matchStorage';

// Helper: get current session user id, or null
async function getSessionUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
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
  // Clean up local storage after successful sync to avoid duplicates
  localStorage.removeItem('volley-tracker-matches');
}

// Get all matches from cloud — strictly filtered by current user
export async function getCloudMatches(): Promise<MatchSummary[]> {
  const userId = await getSessionUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => row.match_data as unknown as MatchSummary);
}

// Save match to cloud — writes to both match_data AND normalized tables
export async function saveCloudMatch(userId: string, match: MatchSummary) {
  if (!(await getSessionUserId())) return;

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
  if (!(await getSessionUserId())) throw new Error('No session');
  
  // CASCADE handles children, but delete match directly
  const { error, count } = await supabase
    .from('matches')
    .delete({ count: 'exact' })
    .eq('id', matchId);
  
  if (error) {
    if (import.meta.env.DEV) console.error('Cloud delete error:', error);
    throw new Error(error.message);
  }
  if (count === 0) {
    throw new Error("Supabase RLS : Aucune ligne n'a été supprimée côté serveur.");
  }
  if (import.meta.env.DEV) console.log('[DEBUG] deleteCloudMatch: deleted', count, 'row(s) for', matchId);
}

// Generate or retrieve a share token for a match
export async function generateShareToken(matchId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token')
    .eq('id', matchId)
    .maybeSingle();

  if (existing?.share_token) return existing.share_token;

  const token = crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase
    .from('matches')
    .update({ share_token: token } as any)
    .eq('id', matchId);

  if (error) {
    if (import.meta.env.DEV) console.error('Share token error:', error);
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

// Fetch a single match from cloud by ID — strictly filtered by current user
export async function getCloudMatchById(matchId: string): Promise<MatchSummary | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from('matches')
    .select('match_data')
    .eq('id', matchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.match_data) return null;
  return data.match_data as unknown as MatchSummary;
}
