import { useState, useCallback, useMemo } from 'react';
import { Team, Point, PointType, SetData } from '@/types/volleyball';

export function useMatchState() {
  const [completedSets, setCompletedSets] = useState<SetData[]>([]);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedPointType, setSelectedPointType] = useState<PointType>('scored');

  const addPoint = useCallback((x: number, y: number) => {
    if (!selectedTeam) return;
    const point: Point = {
      id: crypto.randomUUID(),
      team: selectedTeam,
      type: selectedPointType,
      x,
      y,
      timestamp: Date.now(),
    };
    setPoints(prev => [...prev, point]);
    setSelectedTeam(null);
  }, [selectedTeam, selectedPointType]);

  const undo = useCallback(() => {
    setPoints(prev => prev.slice(0, -1));
  }, []);

  const score = {
    blue: points.filter(p => p.team === 'blue').length,
    red: points.filter(p => p.team === 'red').length,
  };

  const stats = useMemo(() => {
    const allPoints = [...completedSets.flatMap(s => s.points), ...points];
    return {
      blue: {
        scored: allPoints.filter(p => p.team === 'blue' && p.type === 'scored').length,
        faults: allPoints.filter(p => p.team === 'blue' && p.type === 'fault').length,
      },
      red: {
        scored: allPoints.filter(p => p.team === 'red' && p.type === 'scored').length,
        faults: allPoints.filter(p => p.team === 'red' && p.type === 'fault').length,
      },
      total: allPoints.length,
    };
  }, [completedSets, points]);

  const allPoints = useMemo(() => {
    return [...completedSets.flatMap(s => s.points), ...points];
  }, [completedSets, points]);

  const setsScore = {
    blue: completedSets.filter(s => s.winner === 'blue').length,
    red: completedSets.filter(s => s.winner === 'red').length,
  };

  const endSet = useCallback(() => {
    if (points.length === 0) return;
    const winner: Team = score.blue >= score.red ? 'blue' : 'red';
    const setData: SetData = {
      id: crypto.randomUUID(),
      number: currentSetNumber,
      points: [...points],
      score: { ...score },
      winner,
    };
    setCompletedSets(prev => [...prev, setData]);
    setPoints([]);
    setSelectedTeam(null);
    setCurrentSetNumber(prev => prev + 1);
  }, [points, score, currentSetNumber]);

  const resetMatch = useCallback(() => {
    setPoints([]);
    setCompletedSets([]);
    setCurrentSetNumber(1);
    setSelectedTeam(null);
  }, []);

  return {
    points,
    allPoints,
    selectedTeam,
    selectedPointType,
    score,
    stats,
    setsScore,
    currentSetNumber,
    completedSets,
    setSelectedTeam,
    setSelectedPointType,
    addPoint,
    undo,
    endSet,
    resetMatch,
  };
}
