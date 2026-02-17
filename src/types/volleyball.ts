export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';

export interface Point {
  id: string;
  team: Team;
  type: PointType;
  x: number;
  y: number;
  timestamp: number;
}

export interface SetData {
  id: string;
  number: number;
  points: Point[];
  score: { blue: number; red: number };
  winner: Team | null;
}

export interface MatchState {
  points: Point[];
  selectedTeam: Team | null;
  selectedPointType: PointType;
}
