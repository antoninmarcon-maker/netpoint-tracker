export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';
export type SportType = 'volleyball' | 'basketball';

// ---- VOLLEYBALL ----
export type OffensiveAction = 'attack' | 'ace' | 'block' | 'bidouille' | 'seconde_main' | 'other_offensive';
export type FaultAction = 'out' | 'net_fault' | 'service_miss' | 'block_out';

// ---- BASKETBALL ----
export type BasketScoredAction = 'free_throw' | 'two_points' | 'three_points';
export type BasketFaultAction = 'missed_shot' | 'turnover' | 'foul_committed';

export type ActionType = OffensiveAction | FaultAction | BasketScoredAction | BasketFaultAction;

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

// Basketball actions
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

export interface Player {
  id: string;
  number: string; // kept for backward compat, no longer used in UI
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
}

export type CourtZone = 'opponent_court' | 'outside_opponent' | 'net_line' | 'outside_own';
