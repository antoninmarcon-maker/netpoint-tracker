export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault' | 'neutral';
export type SportType = 'volleyball';

// ---- VOLLEYBALL ----
export type OffensiveAction = 'attack' | 'ace' | 'block' | 'bidouille' | 'seconde_main' | 'other_offensive';
export type FaultAction = 'out' | 'net_fault' | 'service_miss' | 'block_out' | 'other_volley_fault';

// ---- NEUTRAL ----
export type NeutralAction = 'other_volley_neutral';

export type ActionType = OffensiveAction | FaultAction | NeutralAction;

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
  { key: 'other_volley_fault', label: 'Autre' },
];

// ---- "Other" action keys ----
export const OTHER_ACTION_KEYS: Record<SportType, { scored: ActionType; fault: ActionType; neutral: ActionType }> = {
  volleyball: { scored: 'other_offensive', fault: 'other_volley_fault', neutral: 'other_volley_neutral' },
};

export function getNeutralActionsForSport(_sport: SportType): { key: string; label: string }[] {
  return [];
}

// ---- Helper functions ----

export function isOffensiveAction(action: ActionType): boolean {
  return ['attack', 'ace', 'block', 'bidouille', 'seconde_main', 'other_offensive'].includes(action);
}

export function getScoredActionsForSport(_sport: SportType) {
  return OFFENSIVE_ACTIONS;
}

export function getFaultActionsForSport(_sport: SportType) {
  return FAULT_ACTIONS;
}

export function getPeriodLabel(_sport: SportType): string {
  return 'Set';
}

export function getSportIcon(_sport?: SportType): string {
  return '🏐';
}

export interface Player {
  id: string;
  name: string;
  number?: string;
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
  pointValue?: number;
  customActionLabel?: string;
  sigil?: string;
  showOnCourt?: boolean;
}

export interface SetData {
  id: string;
  number: number;
  points: Point[];
  score: { blue: number; red: number };
  winner: Team | null;
  duration: number;
}

export interface MatchMetadata {
  /** Whether the interactive court is enabled (default: true) */
  hasCourt?: boolean;
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
