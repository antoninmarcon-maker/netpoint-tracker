import { useState, useCallback } from 'react';
import { Team, Point, PointType } from '@/types/volleyball';

export function useMatchState() {
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

  const stats = {
    blue: {
      scored: points.filter(p => p.team === 'blue' && p.type === 'scored').length,
      faults: points.filter(p => p.team === 'blue' && p.type === 'fault').length,
    },
    red: {
      scored: points.filter(p => p.team === 'red' && p.type === 'scored').length,
      faults: points.filter(p => p.team === 'red' && p.type === 'fault').length,
    },
    total: points.length,
  };

  const resetMatch = useCallback(() => {
    setPoints([]);
    setSelectedTeam(null);
  }, []);

  return {
    points,
    selectedTeam,
    selectedPointType,
    score,
    stats,
    setSelectedTeam,
    setSelectedPointType,
    addPoint,
    undo,
    resetMatch,
  };
}
