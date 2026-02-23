import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Team, Point, PointType, ActionType, SetData, Player, SportType, MatchMetadata } from '@/types/sports';
import { getMatch, saveMatch, saveLastRoster } from '@/lib/matchStorage';

export function useMatchState(matchId: string, ready: boolean = true) {
  const loadedRef = useRef<ReturnType<typeof getMatch>>(null);
  const hasInitialized = useRef(false);

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
  const sport: SportType = 'volleyball';

  useEffect(() => {
    if (!ready || hasInitialized.current) return;
    hasInitialized.current = true;
    const match = getMatch(matchId);
    if (!match) return;
    loadedRef.current = match;
    const sets = match.completedSets ?? [];
    let setNum = match.currentSetNumber ?? 1;
    let swapped = match.sidesSwapped ?? false;
    if (sets.length > 0 && sets.some(s => s.number === setNum) && (match.points ?? []).length === 0) {
      setNum = sets.length + 1;
      swapped = sets.length % 2 !== 0;
    }
    setCompletedSets(sets);
    setCurrentSetNumber(setNum);
    setPoints(match.points ?? []);
    setTeamNames(match.teamNames ?? { blue: 'Bleue', red: 'Rouge' });
    setSidesSwapped(swapped);
    setPlayers(match.players ?? []);
    setChronoSeconds(match.chronoSeconds ?? 0);
  }, [ready, matchId]);

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
    if (!chronoRunning) {
      setChronoRunning(true);
    }
    const customLabel = (window as any).__pendingCustomActionLabel;
    if (customLabel) delete (window as any).__pendingCustomActionLabel;
    const customSigil = (window as any).__pendingCustomSigil;
    if (customSigil) delete (window as any).__pendingCustomSigil;
    const customShowOnCourt = (window as any).__pendingCustomShowOnCourt;
    if (customShowOnCourt !== undefined) delete (window as any).__pendingCustomShowOnCourt;
    const point: Point = {
      id: crypto.randomUUID(),
      team: selectedTeam,
      type: selectedPointType,
      action: selectedAction,
      x,
      y,
      timestamp: Date.now(),
      ...(customLabel ? { customActionLabel: customLabel } : {}),
      ...(customSigil ? { sigil: customSigil } : {}),
      ...(customShowOnCourt ? { showOnCourt: true } : {}),
    };
    // Show player selector for blue team actions + red team fault points + neutral points
    if (players.length > 0 && (point.type === 'neutral' || point.team === 'blue' || (point.team === 'red' && point.type === 'fault'))) {
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

  // Score calculation: volleyball rally scoring — exclude neutral
  const score = useMemo(() => {
    const scoringPoints = points.filter(p => p.type !== 'neutral');
    return {
      blue: scoringPoints.filter(p => p.team === 'blue').length,
      red: scoringPoints.filter(p => p.team === 'red').length,
    };
  }, [points]);

  // Serving team — ignore neutral points
  const servingTeam: Team | null = useMemo(() => {
    const scoringPts = points.filter(p => p.type !== 'neutral');
    if (scoringPts.length === 0) return null;
    return scoringPts[scoringPts.length - 1].team;
  }, [points]);

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
