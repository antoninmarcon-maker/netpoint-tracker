import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Team, Point, PointType, ActionType, SetData, Player } from '@/types/volleyball';
import { getMatch, saveMatch } from '@/lib/matchStorage';

export function useMatchState(matchId: string) {
  const loaded = useRef(getMatch(matchId)).current;
  const [completedSets, setCompletedSets] = useState<SetData[]>(loaded?.completedSets ?? []);
  const [currentSetNumber, setCurrentSetNumber] = useState(loaded?.currentSetNumber ?? 1);
  const [points, setPoints] = useState<Point[]>(loaded?.points ?? []);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedPointType, setSelectedPointType] = useState<PointType | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [teamNames, setTeamNames] = useState(loaded?.teamNames ?? { blue: 'Bleue', red: 'Rouge' });
  const [sidesSwapped, setSidesSwapped] = useState(loaded?.sidesSwapped ?? false);
  const [players, setPlayers] = useState<Player[]>(loaded?.players ?? []);
  const [pendingPoint, setPendingPoint] = useState<Omit<Point, 'playerId'> | null>(null);

  // Chrono
  const [chronoRunning, setChronoRunning] = useState(false);
  const [chronoSeconds, setChronoSeconds] = useState(loaded?.chronoSeconds ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (chronoRunning) {
      intervalRef.current = setInterval(() => {
        setChronoSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chronoRunning]);

  const startChrono = useCallback(() => setChronoRunning(true), []);
  const pauseChrono = useCallback(() => setChronoRunning(false), []);
  const resetChrono = useCallback(() => {
    setChronoRunning(false);
    setChronoSeconds(0);
  }, []);

  const selectAction = useCallback((team: Team, type: PointType, action: ActionType) => {
    setSelectedTeam(team);
    setSelectedPointType(type);
    setSelectedAction(action);
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectedTeam(null);
    setSelectedPointType(null);
    setSelectedAction(null);
  }, []);

  const addPoint = useCallback((x: number, y: number) => {
    if (!selectedTeam || !selectedPointType || !selectedAction) return;
    if (!chronoRunning && points.length === 0) {
      setChronoRunning(true);
    }
    const point: Point = {
      id: crypto.randomUUID(),
      team: selectedTeam,
      type: selectedPointType,
      action: selectedAction,
      x,
      y,
      timestamp: Date.now(),
    };
    // If we have players, show player selector before finalizing
    if (players.length > 0) {
      setPendingPoint(point);
    } else {
      setPoints(prev => [...prev, point]);
    }
    setSelectedTeam(null);
    setSelectedPointType(null);
    setSelectedAction(null);
  }, [selectedTeam, selectedPointType, selectedAction, chronoRunning, points.length, players.length]);

  const assignPlayer = useCallback((playerId: string) => {
    if (!pendingPoint) return;
    setPoints(prev => [...prev, { ...pendingPoint, playerId }]);
    setPendingPoint(null);
  }, [pendingPoint]);

  const skipPlayerAssignment = useCallback(() => {
    if (!pendingPoint) return;
    setPoints(prev => [...prev, pendingPoint]);
    setPendingPoint(null);
  }, [pendingPoint]);

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

  const [waitingForNewSet, setWaitingForNewSet] = useState(false);

  const endSet = useCallback(() => {
    if (points.length === 0) return;
    const winner: Team = score.blue >= score.red ? 'blue' : 'red';
    const setData: SetData = {
      id: crypto.randomUUID(),
      number: currentSetNumber,
      points: [...points],
      score: { ...score },
      winner,
      duration: chronoSeconds,
    };
    setCompletedSets(prev => [...prev, setData]);
    setPoints([]);
    setSelectedTeam(null);
    setSelectedPointType(null);
    setSelectedAction(null);
    resetChrono();
    setWaitingForNewSet(true);
  }, [points, score, currentSetNumber, chronoSeconds, resetChrono]);

  const startNewSet = useCallback(() => {
    setCurrentSetNumber(prev => prev + 1);
    setSidesSwapped(prev => !prev);
    setWaitingForNewSet(false);
  }, []);

  const finishMatch = useCallback(() => {
    // End current set if there are points
    if (points.length > 0) {
      const winner: Team = score.blue >= score.red ? 'blue' : 'red';
      const setData: SetData = {
        id: crypto.randomUUID(),
        number: currentSetNumber,
        points: [...points],
        score: { ...score },
        winner,
        duration: chronoSeconds,
      };
      setCompletedSets(prev => [...prev, setData]);
      setPoints([]);
    }
    setChronoRunning(false);
    // Mark as finished in storage
    const match = getMatch(matchId);
    if (match) {
      saveMatch({ ...match, finished: true, updatedAt: Date.now() });
    }
  }, [points, score, currentSetNumber, chronoSeconds, matchId]);

  const switchSides = useCallback(() => {
    setSidesSwapped(prev => !prev);
  }, []);

  const resetMatch = useCallback(() => {
    setPoints([]);
    setCompletedSets([]);
    setCurrentSetNumber(1);
    setSelectedTeam(null);
    setSelectedPointType(null);
    setSelectedAction(null);
    setSidesSwapped(false);
    resetChrono();
  }, [resetChrono]);

  // Auto-save to match storage
  useEffect(() => {
    if (!loaded) return;
    saveMatch({
      ...loaded,
      completedSets,
      currentSetNumber,
      points,
      teamNames,
      sidesSwapped,
      chronoSeconds,
      players,
      updatedAt: Date.now(),
    });
  }, [completedSets, currentSetNumber, points, teamNames, sidesSwapped, chronoSeconds, players, loaded]);

  return {
    points,
    allPoints,
    selectedTeam,
    selectedPointType,
    selectedAction,
    score,
    stats,
    setsScore,
    currentSetNumber,
    completedSets,
    teamNames,
    sidesSwapped,
    chronoRunning,
    chronoSeconds,
    players,
    pendingPoint,
    setTeamNames,
    setPlayers,
    selectAction,
    cancelSelection,
    addPoint,
    assignPlayer,
    skipPlayerAssignment,
    undo,
    endSet,
    startNewSet,
    waitingForNewSet,
    finishMatch,
    resetMatch,
    switchSides,
    startChrono,
    pauseChrono,
    resetChrono,
  };
}
