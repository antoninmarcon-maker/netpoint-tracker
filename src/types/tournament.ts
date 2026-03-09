// Tournament types for My Volley

export type TournamentFormat = 'pools' | 'elimination' | 'championship';
export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'finished';
export type MatchStatus = 'pending' | 'in_progress' | 'finished' | 'locked';
export type MemberRole = 'member' | 'captain_request';

export interface Tournament {
    id: string;
    created_by: string;
    name: string;
    location?: string | null;
    date?: string | null; // ISO date string
    format: TournamentFormat;
    points_per_set: number;
    sets_to_win: number;
    public_registration: boolean;
    player_scoring: boolean;
    strict_validation: boolean;
    status: TournamentStatus;
    join_token: string;
    spectator_token: string;
    created_at: string;
    updated_at: string;
}

export interface TournamentTeam {
    id: string;
    tournament_id: string;
    name: string;
    captain_id?: string | null;
    created_at: string;
}

export interface TournamentMember {
    id: string;
    team_id: string;
    tournament_id: string;
    user_id: string;
    player_name?: string | null;
    role: MemberRole;
    created_at: string;
}

export interface TournamentMatch {
    id: string;
    tournament_id: string;
    team_blue_id?: string | null;
    team_red_id?: string | null;
    score_blue: number[];
    score_red: number[];
    winner_id?: string | null;
    status: MatchStatus;
    round: number;
    match_ref?: string | null;
    updated_at: string;
    // Joined data (populated client-side)
    team_blue?: TournamentTeam | null;
    team_red?: TournamentTeam | null;
}

export interface TournamentWithTeams extends Tournament {
    teams: TournamentTeam[];
    matches: TournamentMatch[];
    myTeam?: TournamentTeam | null;
    myMembership?: TournamentMember | null;
}
