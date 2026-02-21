export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';
export type SportType = 'volleyball' | 'basketball' | 'tennis' | 'padel';

// ---- VOLLEYBALL ----
export type OffensiveAction = 'attack' | 'ace' | 'block' | 'bidouille' | 'seconde_main' | 'other_offensive';
export type FaultAction = 'out' | 'net_fault' | 'service_miss' | 'block_out';

// ---- BASKETBALL ----
export type BasketScoredAction = 'free_throw' | 'two_points' | 'three_points';
export type BasketFaultAction = 'missed_shot' | 'turnover' | 'foul_committed';

// ---- TENNIS ----
export type TennisScoredAction = 'winner_forehand' | 'winner_backhand' | 'tennis_ace' | 'volley_winner' | 'smash' | 'drop_shot_winner' | 'other_tennis_winner';
export type TennisFaultAction = 'double_fault' | 'unforced_error_forehand' | 'unforced_error_backhand' | 'net_error' | 'out_long' | 'out_wide';

// ---- PADEL ----
export type PadelScoredAction = 'padel_ace' | 'vibora' | 'bandeja' | 'smash_padel' | 'volee' | 'bajada' | 'chiquita_winner' | 'par_3' | 'other_padel_winner';
export type PadelFaultAction = 'padel_double_fault' | 'padel_unforced_error' | 'padel_net_error' | 'padel_out' | 'grille_error' | 'vitre_error';

export type ActionType =
  | OffensiveAction | FaultAction
  | BasketScoredAction | BasketFaultAction
  | TennisScoredAction | TennisFaultAction
  | PadelScoredAction | PadelFaultAction;

// ---- Action lists ----

export const OFFENSIVE_ACTIONS: { key: OffensiveAction; label: string }[] = [
  { key: 'attack', label: 'Attaque' },
  { key: 'ace', label: 'Ace' },
  { key: 'block', label: 'Block' },
  { key: 'bidouille', label: 'Bidouille' },
  { key: 'seconde_main', label: 'Seconde main' },
  { key: 'other_offensive', label: 'Autre' },
];

export const FAULT_ACTIONS: { key: FaultAction; label: string }[] = [
  { key: 'out', label: 'Out' },
  { key: 'net_fault', label: 'Filet' },
  { key: 'service_miss', label: 'Service loupé' },
  { key: 'block_out', label: 'Block Out' },
];

export const BASKET_SCORED_ACTIONS: { key: BasketScoredAction; label: string; points: number }[] = [
  { key: 'free_throw', label: 'Lancer franc (1pt)', points: 1 },
  { key: 'two_points', label: 'Intérieur (2pts)', points: 2 },
  { key: 'three_points', label: 'Extérieur (3pts)', points: 3 },
];

export const BASKET_FAULT_ACTIONS: { key: BasketFaultAction; label: string }[] = [
  { key: 'missed_shot', label: 'Tir manqué' },
  { key: 'turnover', label: 'Perte de balle' },
  { key: 'foul_committed', label: 'Faute commise' },
];

export const TENNIS_SCORED_ACTIONS: { key: TennisScoredAction; label: string }[] = [
  { key: 'tennis_ace', label: 'Ace' },
  { key: 'winner_forehand', label: 'Coup droit gagnant' },
  { key: 'winner_backhand', label: 'Revers gagnant' },
  { key: 'volley_winner', label: 'Volée gagnante' },
  { key: 'smash', label: 'Smash' },
  { key: 'drop_shot_winner', label: 'Amorti gagnant' },
  { key: 'other_tennis_winner', label: 'Autre coup gagnant' },
];

export const TENNIS_FAULT_ACTIONS: { key: TennisFaultAction; label: string }[] = [
  { key: 'double_fault', label: 'Double faute' },
  { key: 'unforced_error_forehand', label: 'Faute CD' },
  { key: 'unforced_error_backhand', label: 'Faute revers' },
  { key: 'net_error', label: 'Filet' },
  { key: 'out_long', label: 'Out long' },
  { key: 'out_wide', label: 'Out latéral' },
];

export const PADEL_SCORED_ACTIONS: { key: PadelScoredAction; label: string }[] = [
  { key: 'padel_ace', label: 'Ace' },
  { key: 'vibora', label: 'Víbora' },
  { key: 'bandeja', label: 'Bandeja' },
  { key: 'smash_padel', label: 'Smash' },
  { key: 'volee', label: 'Volée' },
  { key: 'bajada', label: 'Bajada' },
  { key: 'chiquita_winner', label: 'Chiquita gagnante' },
  { key: 'par_3', label: 'Par 3 (vitre)' },
  { key: 'other_padel_winner', label: 'Autre gagnant' },
];

export const PADEL_FAULT_ACTIONS: { key: PadelFaultAction; label: string }[] = [
  { key: 'padel_double_fault', label: 'Double faute' },
  { key: 'padel_unforced_error', label: 'Faute directe' },
  { key: 'padel_net_error', label: 'Filet' },
  { key: 'padel_out', label: 'Out' },
  { key: 'grille_error', label: 'Grille' },
  { key: 'vitre_error', label: 'Vitre' },
];

// ---- Helper functions ----

export function isOffensiveAction(action: ActionType): boolean {
  return ['attack', 'ace', 'block', 'bidouille', 'seconde_main', 'other_offensive'].includes(action);
}

export function isBasketScoredAction(action: ActionType): action is BasketScoredAction {
  return ['free_throw', 'two_points', 'three_points'].includes(action);
}

export function getBasketPointValue(action: ActionType): number {
  const found = BASKET_SCORED_ACTIONS.find(a => a.key === action);
  return found?.points ?? 0;
}

export function isTennisScoredAction(action: ActionType): action is TennisScoredAction {
  return TENNIS_SCORED_ACTIONS.some(a => a.key === action);
}

export function isPadelScoredAction(action: ActionType): action is PadelScoredAction {
  return PADEL_SCORED_ACTIONS.some(a => a.key === action);
}

export function isAceAction(action: ActionType): boolean {
  return action === 'tennis_ace' || action === 'padel_ace';
}

export function getScoredActionsForSport(sport: SportType) {
  switch (sport) {
    case 'volleyball': return OFFENSIVE_ACTIONS;
    case 'basketball': return BASKET_SCORED_ACTIONS;
    case 'tennis': return TENNIS_SCORED_ACTIONS;
    case 'padel': return PADEL_SCORED_ACTIONS;
  }
}

export function getFaultActionsForSport(sport: SportType) {
  switch (sport) {
    case 'volleyball': return FAULT_ACTIONS;
    case 'basketball': return BASKET_FAULT_ACTIONS;
    case 'tennis': return TENNIS_FAULT_ACTIONS;
    case 'padel': return PADEL_FAULT_ACTIONS;
  }
}

export function getPeriodLabel(sport: SportType): string {
  switch (sport) {
    case 'volleyball': return 'Set';
    case 'basketball': return 'QT';
    case 'tennis': return 'Set';
    case 'padel': return 'Set';
  }
}

export function getSportIcon(sport?: SportType): string {
  switch (sport) {
    case 'basketball': return '🏀';
    case 'tennis': return '🎾';
    case 'padel': return '🏓';
    default: return '🏐';
  }
}

// ---- Tennis/Padel Scoring ----

export type TennisGameScore = 0 | 15 | 30 | 40;
export const TENNIS_SCORE_SEQUENCE: TennisGameScore[] = [0, 15, 30, 40];

export interface TennisScoreState {
  games: { blue: number; red: number }[];  // games per set
  currentGame: { blue: TennisGameScore; red: TennisGameScore };
  advantage: Team | null;
  tiebreak: boolean;
  tiebreakPoints: { blue: number; red: number };
  servingTeam: Team;
}

export type MatchFormat = 'singles' | 'doubles';

export interface MatchMetadata {
  /** Number of sets to win (2 or 3) */
  setsToWin?: number;
  /** Whether advantage/deuce is used (false = punto de oro) */
  advantageRule?: boolean;
  /** Tiebreak at 6-6 */
  tiebreakEnabled?: boolean;
  /** Which team serves first in the match (tennis/padel) */
  initialServer?: Team;
  /** Singles or doubles format (tennis/padel) */
  matchFormat?: MatchFormat;
  /** Whether the interactive court is enabled (default: true) */
  hasCourt?: boolean;
}

export function getDefaultMatchFormat(sport: SportType): MatchFormat {
  return sport === 'padel' ? 'doubles' : 'singles';
}

export interface Player {
  id: string;
  name: string;
}

export interface Point {
  id: string;
  team: Team;
  type: PointType;
  action: ActionType;
  x: number;
  y: number;
  timestamp: number;
  playerId?: string;
  pointValue?: number; // For basketball: 1, 2 or 3
}

export interface SetData {
  id: string;
  number: number;
  points: Point[];
  score: { blue: number; red: number };
  winner: Team | null;
  duration: number;
}

export interface MatchState {
  points: Point[];
  selectedTeam: Team | null;
  selectedPointType: PointType;
  selectedAction: ActionType;
}

export interface MatchSummary {
  id: string;
  teamNames: { blue: string; red: string };
  completedSets: SetData[];
  currentSetNumber: number;
  points: Point[];
  sidesSwapped: boolean;
  chronoSeconds: number;
  createdAt: number;
  updatedAt: number;
  finished: boolean;
  players?: Player[];
  sport?: SportType;
  metadata?: MatchMetadata;
}

export type CourtZone = 'opponent_court' | 'outside_opponent' | 'net_line' | 'outside_own';
