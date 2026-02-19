import { supabase } from '@/integrations/supabase/client';
import { MatchSummary } from '@/types/sports';
import { getAllMatches as getLocalMatches, saveMatch as saveLocalMatch, deleteMatch as deleteLocalMatch } from './matchStorage';

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
    // Check if already exists in cloud
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('matches').upsert({
        id: match.id,
        user_id: userId,
        match_data: match as any,
        finished: match.finished,
        sport: match.sport || 'volleyball',
      });
    }
  }
}

// Get all matches from cloud (returns empty if no session)
export async function getCloudMatches(): Promise<MatchSummary[]> {
  if (!(await hasSession())) return [];
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => row.match_data as unknown as MatchSummary);
}

// Save match to cloud (silently skips if no session)
export async function saveCloudMatch(userId: string, match: MatchSummary) {
  if (!(await hasSession())) return;
  const { error } = await supabase
    .from('matches')
    .upsert({
      id: match.id,
      user_id: userId,
      match_data: match as any,
      finished: match.finished,
      sport: match.sport || 'volleyball',
      updated_at: new Date().toISOString(),
    });

  if (error) console.error('Cloud save error:', error);
}

// Delete match from cloud (silently skips if no session)
export async function deleteCloudMatch(matchId: string) {
  if (!(await hasSession())) return;
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (error) console.error('Cloud delete error:', error);
}

// Generate or retrieve a share token for a match
export async function generateShareToken(matchId: string): Promise<string | null> {
  // Check if token already exists
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token')
    .eq('id', matchId)
    .maybeSingle();

  if (existing?.share_token) return existing.share_token;

  // Generate new token
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
