import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Team, Point, PointType, ActionType, SetData, Player, SportType, isBasketScoredAction, getBasketPointValue } from '@/types/sports';
import { getMatch, saveMatch, saveLastRoster } from '@/lib/matchStorage';

export function useMatchState(matchId: string, ready: boolean = true) {
  const loadedRef = useRef<ReturnType<typeof getMatch>>(null);
  if (ready && !loadedRef.current) {
    loadedRef.current = getMatch(matchId);
  }
  const loaded = loadedRef.current;
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
  const sport: SportType = loaded?.sport ?? 'volleyball';

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
    const pointValue = sport === 'basketball' && isBasketScoredAction(selectedAction)
      ? getBasketPointValue(selectedAction)
      : undefined;
    const point: Point = {
      id: crypto.randomUUID(),
      team: selectedTeam,
      type: selectedPointType,
      action: selectedAction,
      x,
      y,
      timestamp: Date.now(),
      pointValue,
    };
    // Show player selector only for blue (home) team actions
    if (players.length > 0 && point.team === 'blue') {
      setPendingPoint(point);
    } else {
      setPoints(prev => [...prev, point]);
    }
    setSelectedTeam(null);
    setSelectedPointType(null);
    setSelectedAction(null);
  }, [selectedTeam, selectedPointType, selectedAction, chronoRunning, points.length, players.length, sport]);

  // Basketball free throw: add point directly without court placement
  const addFreeThrow = useCallback(() => {
    if (!selectedTeam || !selectedPointType || !selectedAction) return;
    if (!chronoRunning && points.length === 0) {
      setChronoRunning(true);
    }
    const point: Point = {
      id: crypto.randomUUID(),
      team: selectedTeam,
      type: selectedPointType,
      action: selectedAction,
      x: 0.5,
      y: 0.5,
      timestamp: Date.now(),
      pointValue: 1,
    };
    if (players.length > 0 && point.team === 'blue') {
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

  // Score calculation: basketball uses pointValue, volleyball uses count
  const score = useMemo(() => {
    if (sport === 'basketball') {
      return {
        blue: points.filter(p => p.team === 'blue' && p.type === 'scored').reduce((sum, p) => sum + (p.pointValue ?? 0), 0),
        red: points.filter(p => p.team === 'red' && p.type === 'scored').reduce((sum, p) => sum + (p.pointValue ?? 0), 0),
      };
    }
    return {
      blue: points.filter(p => p.team === 'blue').length,
      red: points.filter(p => p.team === 'red').length,
    };
  }, [points, sport]);

  // Serving team (volleyball only)
  const servingTeam: Team | null = useMemo(() => {
    if (sport !== 'volleyball') return null;
    if (points.length === 0) return null;
    return points[points.length - 1].team;
  }, [points, sport]);

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
    if (sport === 'volleyball') {
      setSidesSwapped(prev => !prev);
    }
    setWaitingForNewSet(false);
  }, [sport]);

  const finishMatch = useCallback(() => {
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

  // Auto-save
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
    saveLastRoster(players);
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
    servingTeam,
    sport,
    setTeamNames,
    setPlayers,
    selectAction,
    cancelSelection,
    addPoint,
    addFreeThrow,
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
