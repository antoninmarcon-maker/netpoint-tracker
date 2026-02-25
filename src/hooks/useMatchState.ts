import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Team, Point, PointType, ActionType, SetData, Player, SportType, MatchMetadata, RallyAction } from '@/types/sports';
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
  const [playerAliases, setPlayerAliases] = useState<Record<string, string>>(() => {
    const metadataAliases = loaded?.metadata?.playerAliases ?? {};
    const rosterAliases = Object.fromEntries(
      (loaded?.players ?? [])
        .filter((p) => p.name?.trim())
        .map((p) => [p.id, p.name])
    );
    return { ...metadataAliases, ...rosterAliases };
  });
  const [pendingPoint, setPendingPoint] = useState<Omit<Point, 'playerId'> | null>(null);
  const sport: SportType = 'volleyball';

  // --- Performance Mode (Rally Tracking) ---
  const isPerformanceMode = loaded?.metadata?.isPerformanceMode ?? false;
  const [currentRallyActions, setCurrentRallyActions] = useState<RallyAction[]>([]);
  
  // Direction mode: waiting for 2nd click
  const [directionOrigin, setDirectionOrigin] = useState<{ x: number; y: number } | null>(null);
  const [pendingDirectionAction, setPendingDirectionAction] = useState<{
    team: Team; type: PointType; action: ActionType;
    customLabel?: string; sigil?: string; showOnCourt?: boolean;
  } | null>(null);

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
    const hydratedPlayers = match.players ?? [];
    setPlayers(hydratedPlayers);
    const hydratedAliases = match.metadata?.playerAliases ?? {};
    const rosterAliases = Object.fromEntries(
      hydratedPlayers
        .filter((p) => p.name?.trim())
        .map((p) => [p.id, p.name])
    );
    setPlayerAliases({ ...hydratedAliases, ...rosterAliases });
    setChronoSeconds(match.chronoSeconds ?? 0);
  }, [ready, matchId]);

  useEffect(() => {
    setPlayerAliases((prev) => {
      let changed = false;
      const next = { ...prev };
      players.forEach((player) => {
        if (player.name?.trim() && next[player.id] !== player.name) {
          next[player.id] = player.name;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [players]);

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
    // Also cancel direction mode
    setDirectionOrigin(null);
    setPendingDirectionAction(null);
  }, []);

  // --- Direction mode helpers ---
  const startDirectionMode = useCallback((team: Team, type: PointType, action: ActionType, x: number, y: number, customLabel?: string, sigil?: string, showOnCourt?: boolean) => {
    setDirectionOrigin({ x, y });
    setPendingDirectionAction({ team, type, action, customLabel, sigil, showOnCourt });
  }, []);

  const completeDirectionAction = useCallback((endX: number, endY: number) => {
    if (!pendingDirectionAction || !directionOrigin) return;
    const { team, type, action, customLabel, sigil, showOnCourt } = pendingDirectionAction;
    const rallyAction: RallyAction = {
      id: crypto.randomUUID(),
      team, type, action,
      x: directionOrigin.x, y: directionOrigin.y,
      startX: directionOrigin.x, startY: directionOrigin.y,
      endX, endY,
      timestamp: Date.now(),
      ...(customLabel ? { customActionLabel: customLabel } : {}),
      ...(sigil ? { sigil } : {}),
      ...(showOnCourt ? { showOnCourt: true } : {}),
    };
    
    setDirectionOrigin(null);
    setPendingDirectionAction(null);
    
    // Process this rally action the same way as a regular one
    processRallyAction(rallyAction, team, type);
  }, [pendingDirectionAction, directionOrigin]);

  // Process a rally action: accumulate neutrals, conclude on scored/fault
  const processRallyAction = useCallback((rallyAction: RallyAction, team: Team, type: PointType) => {
    if (type === 'neutral') {
      // Neutral: accumulate, don't conclude
      setCurrentRallyActions(prev => [...prev, rallyAction]);
    } else {
      // Scored or fault: conclude the point
      const allRallyActions = [...currentRallyActions, rallyAction];
      const point: Point = {
        id: crypto.randomUUID(),
        team,
        type,
        action: rallyAction.action,
        x: rallyAction.x,
        y: rallyAction.y,
        timestamp: Date.now(),
        rallyActions: allRallyActions,
        ...(rallyAction.customActionLabel ? { customActionLabel: rallyAction.customActionLabel } : {}),
        ...(rallyAction.sigil ? { sigil: rallyAction.sigil } : {}),
        ...(rallyAction.showOnCourt ? { showOnCourt: true } : {}),
      };
      
      // Check if player assignment needed
      const shouldAssignPlayer = players.length > 0 && (
        rallyAction.type === 'neutral' || team === 'blue' || (team === 'red' && type === 'fault')
      );
      if (shouldAssignPlayer) {
        setPendingPoint(point);
      } else {
        setPoints(prev => [...prev, point]);
      }
      setCurrentRallyActions([]);
    }
  }, [currentRallyActions, players.length]);

  const addPoint = useCallback((x: number, y: number) => {
    if (!selectedTeam || !selectedPointType || !selectedAction) {
      // Check if we're in direction completion mode
      if (pendingDirectionAction && directionOrigin) {
        completeDirectionAction(x, y);
        return;
      }
      return;
    }
    if (!chronoRunning) {
      setChronoRunning(true);
    }
    const customLabel = (window as any).__pendingCustomActionLabel;
    if (customLabel) delete (window as any).__pendingCustomActionLabel;
    const customSigil = (window as any).__pendingCustomSigil;
    if (customSigil) delete (window as any).__pendingCustomSigil;
    const customShowOnCourt = (window as any).__pendingCustomShowOnCourt;
    if (customShowOnCourt !== undefined) delete (window as any).__pendingCustomShowOnCourt;
    const hasDirection = (window as any).__pendingHasDirection;
    if (hasDirection !== undefined) delete (window as any).__pendingHasDirection;

    // --- Performance Mode with direction: 2-click flow ---
    if (isPerformanceMode && hasDirection && !directionOrigin) {
      startDirectionMode(selectedTeam, selectedPointType, selectedAction, x, y, customLabel, customSigil, customShowOnCourt);
      setSelectedTeam(null);
      setSelectedPointType(null);
      setSelectedAction(null);
      return;
    }

    // --- Performance Mode: rally accumulation ---
    if (isPerformanceMode) {
      const rallyAction: RallyAction = {
        id: crypto.randomUUID(),
        team: selectedTeam,
        type: selectedPointType,
        action: selectedAction,
        x, y,
        timestamp: Date.now(),
        ...(customLabel ? { customActionLabel: customLabel } : {}),
        ...(customSigil ? { sigil: customSigil } : {}),
        ...(customShowOnCourt ? { showOnCourt: true } : {}),
      };
      
      const team = selectedTeam;
      const type = selectedPointType;
      setSelectedTeam(null);
      setSelectedPointType(null);
      setSelectedAction(null);
      
      processRallyAction(rallyAction, team, type);
      return;
    }

    // --- Standard Mode (unchanged) ---
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
  }, [selectedTeam, selectedPointType, selectedAction, chronoRunning, players.length, isPerformanceMode, directionOrigin, pendingDirectionAction, completeDirectionAction, startDirectionMode, processRallyAction]);

  const assignPlayer = useCallback((playerId: string) => {
    if (!pendingPoint) return;
    const playerName = players.find((player) => player.id === playerId)?.name;
    if (playerName) {
      setPlayerAliases((prev) => (
        prev[playerId] === playerName ? prev : { ...prev, [playerId]: playerName }
      ));
    }
    setPoints(prev => [...prev, { ...pendingPoint, playerId }]);
    setPendingPoint(null);
  }, [pendingPoint, players]);

  const skipPlayerAssignment = useCallback(() => {
    if (!pendingPoint) return;
    setPoints(prev => [...prev, pendingPoint]);
    setPendingPoint(null);
  }, [pendingPoint]);

  // --- Smart Undo ---
  const undo = useCallback(() => {
    if (isPerformanceMode) {
      // Case A: Rally in progress — remove last sub-action
      if (currentRallyActions.length > 0) {
        setCurrentRallyActions(prev => prev.slice(0, -1));
        return;
      }
      // Case B: Last point just concluded — reopen it
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        if (lastPoint.rallyActions && lastPoint.rallyActions.length > 0) {
          // Remove the concluding action, restore the neutrals as currentRallyActions
          const rally = lastPoint.rallyActions;
          const neutralActions = rally.slice(0, -1); // everything except the conclusion
          setCurrentRallyActions(neutralActions);
          setPoints(prev => prev.slice(0, -1));
          return;
        }
      }
    }
    // Standard undo
    setPoints(prev => prev.slice(0, -1));
  }, [isPerformanceMode, currentRallyActions, points]);

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
    setCurrentRallyActions([]);
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
    setCurrentRallyActions([]);
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
    setCurrentRallyActions([]);
    resetChrono();
  }, [resetChrono]);

  // Auto-save — preserve ghost players (removed from roster but still referenced in points)
  useEffect(() => {
    if (!loaded) return;
    const knownIds = new Set(players.map(p => p.id));
    const previousPlayers: Player[] = loaded.players ?? [];
    const ghostPlayers = previousPlayers.filter(p => !knownIds.has(p.id) && allPoints.some(pt => pt.playerId === p.id));
    const mergedPlayers = [...players, ...ghostPlayers];
    const mergedMetadata: MatchMetadata = {
      ...(loaded.metadata ?? {}),
      playerAliases,
    };

    saveMatch({
      ...loaded,
      completedSets,
      currentSetNumber,
      points,
      teamNames,
      sidesSwapped,
      chronoSeconds,
      players: mergedPlayers,
      metadata: mergedMetadata,
      updatedAt: Date.now(),
    });
    saveLastRoster(players);
  }, [completedSets, currentSetNumber, points, teamNames, sidesSwapped, chronoSeconds, players, loaded, allPoints, playerAliases]);

  // Can undo check for performance mode
  const canUndo = isPerformanceMode
    ? (currentRallyActions.length > 0 || points.length > 0)
    : points.length > 0;

  // Rally in progress: if neutrals accumulated but not yet concluded
  const rallyInProgress = isPerformanceMode && currentRallyActions.length > 0;

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
    isPerformanceMode,
    currentRallyActions,
    rallyInProgress,
    directionOrigin,
    pendingDirectionAction,
    canUndo,
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
