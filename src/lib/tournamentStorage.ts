/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: TypeScript errors on .from('tournaments') etc. are expected until you run:
//   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
// Until then we use (supabase as any).from(...) to bypass the generated type checks.

import { supabase } from '@/integrations/supabase/client';
import type {
    Tournament, TournamentTeam, TournamentMember, TournamentMatch,
    TournamentFormat, TournamentStatus
} from '@/types/tournament';

const db = supabase as any;

// ==================== TOURNAMENTS ====================

export async function createTournament(data: {
    name: string;
    location?: string;
    date?: string;
    format: TournamentFormat;
    points_per_set: number;
    sets_to_win: number;
    public_registration: boolean;
    player_scoring: boolean;
    strict_validation: boolean;
}): Promise<Tournament | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: tournament, error } = await db
        .from('tournaments')
        .insert({ ...data, created_by: user.id, status: 'open' })
        .select()
        .single();

    if (error) { console.error('[createTournament]', error); return null; }
    return tournament as Tournament;
}

export async function getMyTournaments(): Promise<Tournament[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

    if (error) { console.error('[getMyTournaments]', error); return []; }
    return (data ?? []) as Tournament[];
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

    if (error) { console.error('[getTournamentById]', error); return null; }
    return data as Tournament;
}

export async function getTournamentByJoinToken(token: string): Promise<Tournament | null> {
    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .eq('join_token', token)
        .maybeSingle();

    if (error) { console.error('[getTournamentByJoinToken]', error); return null; }
    return data as Tournament | null;
}

export async function getTournamentBySpectatorToken(token: string): Promise<Tournament | null> {
    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .eq('spectator_token', token)
        .maybeSingle();

    if (error) { console.error('[getTournamentBySpectatorToken]', error); return null; }
    return data as Tournament | null;
}

export async function updateTournamentStatus(id: string, status: TournamentStatus): Promise<boolean> {
    const { error } = await db
        .from('tournaments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { console.error('[updateTournamentStatus]', error); return false; }
    return true;
}

export async function toggleStrictValidation(id: string, value: boolean): Promise<boolean> {
    const { error } = await db
        .from('tournaments')
        .update({ strict_validation: value, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { console.error('[toggleStrictValidation]', error); return false; }
    return true;
}

export async function deleteTournament(id: string): Promise<boolean> {
    const { error } = await db.from('tournaments').delete().eq('id', id);
    if (error) { console.error('[deleteTournament]', error); return false; }
    return true;
}

// ==================== TEAMS ====================

export async function getTeams(tournamentId: string): Promise<TournamentTeam[]> {
    const { data, error } = await db
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

    if (error) { console.error('[getTeams]', error); return []; }
    return (data ?? []) as TournamentTeam[];
}

export async function createTeam(tournamentId: string, name: string): Promise<TournamentTeam | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await db
        .from('tournament_teams')
        .insert({ tournament_id: tournamentId, name, captain_id: user.id })
        .select()
        .single();

    if (error) { console.error('[createTeam]', error); return null; }
    return data as TournamentTeam;
}

export async function deleteTeam(teamId: string): Promise<boolean> {
    const { error } = await db.from('tournament_teams').delete().eq('id', teamId);
    if (error) { console.error('[deleteTeam]', error); return false; }
    return true;
}

export async function transferCaptaincy(teamId: string, newCaptainId: string): Promise<boolean> {
    const { error } = await db
        .from('tournament_teams')
        .update({ captain_id: newCaptainId })
        .eq('id', teamId);
    if (error) { console.error('[transferCaptaincy]', error); return false; }
    return true;
}

// ==================== MEMBERS ====================

export async function getMembers(tournamentId: string): Promise<TournamentMember[]> {
    const { data, error } = await db
        .from('tournament_members')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

    if (error) { console.error('[getMembers]', error); return []; }
    return (data ?? []) as TournamentMember[];
}

export async function joinTeam(teamId: string, tournamentId: string, playerName: string): Promise<TournamentMember | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await db
        .from('tournament_members')
        .insert({ team_id: teamId, tournament_id: tournamentId, user_id: user.id, player_name: playerName, role: 'member' })
        .select()
        .single();

    if (error) { console.error('[joinTeam]', error); return null; }
    return data as TournamentMember;
}

export async function requestCaptaincy(memberId: string): Promise<boolean> {
    const { error } = await db
        .from('tournament_members')
        .update({ role: 'captain_request' })
        .eq('id', memberId);
    if (error) { console.error('[requestCaptaincy]', error); return false; }
    return true;
}

export async function acceptCaptaincyRequest(memberId: string, teamId: string, requestingUserId: string): Promise<boolean> {
    const ok = await transferCaptaincy(teamId, requestingUserId);
    if (!ok) return false;
    const { error } = await db
        .from('tournament_members')
        .update({ role: 'member' })
        .eq('id', memberId);
    if (error) { console.error('[acceptCaptaincyRequest]', error); return false; }
    return true;
}

export async function leaveTeam(memberId: string, teamId: string, userId: string): Promise<boolean> {
    // Prevent sole captain from leaving — team would become unmanageable
    const { data: team } = await db.from('tournament_teams').select('captain_id').eq('id', teamId).single();
    if (team?.captain_id === userId) {
        const { count } = await db.from('tournament_members').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
        if ((count ?? 0) <= 1) {
            // Last member who is also captain — delete the team entirely
            await db.from('tournament_members').delete().eq('id', memberId);
            await db.from('tournament_teams').delete().eq('id', teamId);
            return true;
        }
        // Captain with other members — must transfer captaincy first
        return false;
    }

    const { error } = await db.from('tournament_members').delete().eq('id', memberId);
    if (error) { console.error('[leaveTeam]', error); return false; }
    return true;
}

// ==================== MATCHES ====================

export async function getMatches(tournamentId: string): Promise<TournamentMatch[]> {
    const { data, error } = await db
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true });

    if (error) { console.error('[getMatches]', error); return []; }
    return (data ?? []) as TournamentMatch[];
}

export async function createMatch(tournamentId: string, teamBlueId: string, teamRedId: string, round: number, matchRef?: string): Promise<TournamentMatch | null> {
    const { data, error } = await db
        .from('tournament_matches')
        .insert({
            tournament_id: tournamentId,
            team_blue_id: teamBlueId,
            team_red_id: teamRedId,
            round,
            match_ref: matchRef ?? `R${round}`,
            status: 'pending',
        })
        .select()
        .single();

    if (error) { console.error('[createMatch]', error); return null; }
    return data as TournamentMatch;
}

export async function updateMatchScore(matchId: string, scoreBlue: number[], scoreRed: number[], setsToWin: number, winnerId?: string | null, teamBlueId?: string, teamRedId?: string): Promise<boolean> {
    // Validate scores are non-negative
    if (scoreBlue.some(s => s < 0) || scoreRed.some(s => s < 0)) return false;
    // Validate winner is one of the match teams (if provided)
    if (winnerId && teamBlueId && teamRedId && winnerId !== teamBlueId && winnerId !== teamRedId) return false;

    const blueWins = scoreBlue.filter((s, i) => s > (scoreRed[i] ?? 0)).length;
    const redWins = scoreRed.filter((s, i) => s > (scoreBlue[i] ?? 0)).length;
    const finished = blueWins >= setsToWin || redWins >= setsToWin;

    const { error } = await db
        .from('tournament_matches')
        .update({
            score_blue: scoreBlue,
            score_red: scoreRed,
            winner_id: winnerId ?? null,
            status: finished ? 'finished' : 'in_progress',
            updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

    if (error) { console.error('[updateMatchScore]', error); return false; }
    return true;
}

export async function lockMatch(matchId: string): Promise<boolean> {
    const { error } = await db
        .from('tournament_matches')
        .update({ status: 'locked', updated_at: new Date().toISOString() })
        .eq('id', matchId);
    if (error) { console.error('[lockMatch]', error); return false; }
    return true;
}

export async function deleteMatch(matchId: string): Promise<boolean> {
    const { error } = await db.from('tournament_matches').delete().eq('id', matchId);
    if (error) { console.error('[deleteMatch]', error); return false; }
    return true;
}

/** Randomly dispatch all teams into first-round matches */
export async function randomDispatch(tournamentId: string, teams: TournamentTeam[]): Promise<boolean> {
    await db
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('status', 'pending');

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const matchInserts: object[] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
        matchInserts.push({
            tournament_id: tournamentId,
            team_blue_id: shuffled[i].id,
            team_red_id: shuffled[i + 1].id,
            round: 1,
            match_ref: `M${Math.floor(i / 2) + 1}`,
            status: 'pending',
        });
    }
    if (matchInserts.length === 0) return true;

    const { error } = await db.from('tournament_matches').insert(matchInserts);
    if (error) { console.error('[randomDispatch]', error); return false; }
    return true;
}
