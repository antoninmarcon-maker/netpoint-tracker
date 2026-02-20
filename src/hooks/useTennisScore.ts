import { useMemo } from 'react';
import { Point, Team, MatchMetadata } from '@/types/sports';

export interface TennisGameState {
  /** Games won per team in current set */
  games: { blue: number; red: number };
  /** Current game score display (e.g. "15", "30", "40", "Ad") */
  gameScore: { blue: string; red: string };
  /** Whether tiebreak is active */
  tiebreak: boolean;
  /** Whether a set has just been won (to trigger auto end-set) */
  setJustWon: Team | null;
  /** Number of games won by each team (for display) */
  gamesDisplay: string;
}

function getRallyWinner(point: Point): Team {
  if (point.type === 'scored') return point.team;
  // fault: opposite team wins the rally
  return point.team === 'blue' ? 'red' : 'blue';
}

export function computeTennisScore(
  points: Point[],
  metadata?: MatchMetadata
): TennisGameState {
  const advantageRule = metadata?.advantageRule ?? true;
  const tiebreakEnabled = metadata?.tiebreakEnabled ?? true;

  let gamesBlue = 0;
  let gamesRed = 0;
  let gamePointsBlue = 0;
  let gamePointsRed = 0;
  let tiebreak = false;
  let setJustWon: Team | null = null;

  for (const point of points) {
    const winner = getRallyWinner(point);

    if (tiebreak) {
      // Tiebreak scoring: simple point count, first to 7 win by 2
      if (winner === 'blue') gamePointsBlue++;
      else gamePointsRed++;

      const maxTB = Math.max(gamePointsBlue, gamePointsRed);
      const minTB = Math.min(gamePointsBlue, gamePointsRed);
      if (maxTB >= 7 && maxTB - minTB >= 2) {
        // Tiebreak won
        const tbWinner: Team = gamePointsBlue > gamePointsRed ? 'blue' : 'red';
        if (tbWinner === 'blue') gamesBlue++;
        else gamesRed++;
        setJustWon = tbWinner;
        gamePointsBlue = 0;
        gamePointsRed = 0;
        tiebreak = false;
      }
    } else {
      // Normal game scoring
      if (winner === 'blue') gamePointsBlue++;
      else gamePointsRed++;

      // Check if game is won
      const gameWinner = checkGameWinner(gamePointsBlue, gamePointsRed, advantageRule);
      if (gameWinner) {
        if (gameWinner === 'blue') gamesBlue++;
        else gamesRed++;
        gamePointsBlue = 0;
        gamePointsRed = 0;
        setJustWon = null;

        // Check if set is won
        const sw = checkSetWinner(gamesBlue, gamesRed, tiebreakEnabled);
        if (sw) {
          setJustWon = sw;
        } else if (tiebreakEnabled && gamesBlue === 6 && gamesRed === 6) {
          tiebreak = true;
        }
      } else {
        setJustWon = null;
      }
    }
  }

  // Build display
  const gameScore = tiebreak
    ? { blue: String(gamePointsBlue), red: String(gamePointsRed) }
    : formatGameScore(gamePointsBlue, gamePointsRed, advantageRule);

  return {
    games: { blue: gamesBlue, red: gamesRed },
    gameScore,
    tiebreak,
    setJustWon,
    gamesDisplay: `${gamesBlue} - ${gamesRed}`,
  };
}

function checkGameWinner(ptsBlue: number, ptsRed: number, advantageRule: boolean): Team | null {
  // Convert rally-count to tennis logic
  // Need at least 4 points to win
  if (ptsBlue < 4 && ptsRed < 4) return null;

  if (!advantageRule) {
    // Punto de oro: at deuce (3-3), next point wins
    if (ptsBlue >= 4 && ptsBlue > ptsRed) return 'blue';
    if (ptsRed >= 4 && ptsRed > ptsBlue) return 'red';
    return null;
  }

  // Advantage rule: need 2 point lead after deuce
  if (ptsBlue >= 4 && ptsBlue - ptsRed >= 2) return 'blue';
  if (ptsRed >= 4 && ptsRed - ptsBlue >= 2) return 'red';
  return null;
}

function checkSetWinner(gamesBlue: number, gamesRed: number, tiebreakEnabled: boolean): Team | null {
  // Normal set: first to 6 with 2-game lead
  if (gamesBlue >= 6 && gamesBlue - gamesRed >= 2) return 'blue';
  if (gamesRed >= 6 && gamesRed - gamesBlue >= 2) return 'red';
  // If no tiebreak: need 2-game lead always (handled above)
  return null;
}

function formatGameScore(
  ptsBlue: number,
  ptsRed: number,
  advantageRule: boolean
): { blue: string; red: string } {
  const toTennis = (pts: number) => {
    if (pts === 0) return '0';
    if (pts === 1) return '15';
    if (pts === 2) return '30';
    return '40';
  };

  // Before deuce territory
  if (ptsBlue < 3 || ptsRed < 3) {
    return { blue: toTennis(ptsBlue), red: toTennis(ptsRed) };
  }

  // Both at 3+ (deuce territory)
  if (ptsBlue === ptsRed) {
    return { blue: '40', red: '40' }; // Deuce
  }

  if (!advantageRule) {
    // Punto de oro: just show 40-40 until someone wins
    return { blue: '40', red: '40' };
  }

  // Advantage
  if (ptsBlue > ptsRed) {
    return { blue: 'Ad', red: '40' };
  }
  return { blue: '40', red: 'Ad' };
}

export function useTennisScore(
  points: Point[],
  metadata?: MatchMetadata
): TennisGameState {
  return useMemo(() => computeTennisScore(points, metadata), [points, metadata]);
}
