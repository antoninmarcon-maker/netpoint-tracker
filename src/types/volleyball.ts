export type Team = 'blue' | 'red';
export type PointType = 'scored' | 'fault';

export interface Point {
  id: string;
  team: Team;
  type: PointType;
  x: number; // 0-1 relative to court
  y: number; // 0-1 relative to court
  timestamp: number;
}

export interface MatchState {
  points: Point[];
  selectedTeam: Team | null;
  selectedPointType: PointType;
}
