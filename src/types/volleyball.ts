export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';

// Offensive actions (points gagnés)
export type OffensiveAction = 'attack' | 'ace' | 'block' | 'bidouille' | 'seconde_main' | 'other_offensive';
// Fault actions (fautes commises)
export type FaultAction = 'out' | 'net_fault' | 'service_miss' | 'block_out';

export type ActionType = OffensiveAction | FaultAction;

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

export function isOffensiveAction(action: ActionType): boolean {
  return ['attack', 'ace', 'block', 'bidouille', 'seconde_main', 'other_offensive'].includes(action);
}

export interface Player {
  id: string;
  number: string;
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
  playerId?: string; // Blue team player involved
}

export interface SetData {
  id: string;
  number: number;
  points: Point[];
  score: { blue: number; red: number };
  winner: Team | null;
  duration: number; // seconds
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
}

// Zone constraint type for court clicking
export type CourtZone = 'opponent_court' | 'outside_opponent' | 'net_line' | 'outside_own';
