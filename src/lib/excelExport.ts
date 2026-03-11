import * as XLSX from '@e965/xlsx';
import { Point, SetData, Player, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/sports';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function getFlattenedActions(pts: Point[], targetTeam?: 'blue' | 'red') {
  return pts.flatMap(p => {
    const actions = (p.rallyActions && p.rallyActions.length > 0)
      ? p.rallyActions
      : [{
          id: p.id,
          team: p.team,
          type: p.type,
          action: p.action,
          playerId: p.playerId,
          customActionLabel: p.customActionLabel,
          rating: p.rating,
        }];
    
    if (targetTeam) {
      return actions.filter(a => a.team === targetTeam);
    }
    return actions;
  });
}

function mergeGhostPlayers(pts: Point[], players: Player[], storedPlayers: Player[] = []): Player[] {
  const knownIds = new Set(players.map(p => p.id));
  const ghosts: Player[] = [];
  getFlattenedActions(pts).forEach(a => {
    if (a.playerId && !knownIds.has(a.playerId)) {
      knownIds.add(a.playerId);
      const stored = storedPlayers.find(sp => sp.id === a.playerId);
      ghosts.push({ id: a.playerId, name: stored?.name ?? `#${a.playerId.slice(0, 4)}`, number: stored?.number });
    }
  });
  return [...players, ...ghosts];
}

function playerSetStats(pts: Point[], players: Player[]) {
  const allPlayers = mergeGhostPlayers(pts, players);
  const allActions = getFlattenedActions(pts);
  const neutralLabels = Array.from(new Set(allActions.filter(p => p.type === 'neutral').map(p => p.customActionLabel || p.action)));

  return allPlayers.map(player => {
    // Collect actions where the player is involved
    const pActions = allActions.filter(a => a.playerId === player.id);
    
    // An action is "scored" if our blue player scores
    const scored = pActions.filter(a => a.team === 'blue' && a.type === 'scored');
    // For a blue player, "faultWins" are faults made by the red opponent (where blue gets the point implicitly?)
    // Wait, in PlayerStats.tsx, if player is blue, they don't perform the red team's faults. 
    // They are only tagged on their OWN actions. 
    // So if blue player makes a fault, it is negative.
    const playerNegatives = pActions.filter(a => (a.team === 'red') || (a.team === 'blue' && a.type === 'fault'));
    // Neutrals
    const neutrals = pActions.filter(a => a.type === 'neutral');

    const totalPositive = scored.length; // usually fault wins are opponent actions
    const totalNegative = playerNegatives.length;
    const total = totalPositive + totalNegative + neutrals.length;

    // Collect all rated actions for this player
    const rPos = pActions.filter(p => p.rating === 'positive').length;
    const rNeu = pActions.filter(p => p.rating === 'neutral').length;
    const rNeg = pActions.filter(p => p.rating === 'negative').length;

    const baseStats: Record<string, string | number> = {
      'Joueur': player.name || '—',
      'Attaques': scored.filter(p => p.action === 'attack').length,
      'Aces': scored.filter(p => p.action === 'ace').length,
      'Blocks': scored.filter(p => p.action === 'block').length,
      'Bidouilles': scored.filter(p => p.action === 'bidouille').length,
      '2ndes mains': scored.filter(p => p.action === 'seconde_main').length,
      'Pts gagnés (offensifs)': scored.length,
      'Fautes commises': totalNegative,
      'Faits de jeu (Total)': neutrals.length,
    };

    neutralLabels.forEach(label => {
      baseStats[`  ↳ ${label}`] = neutrals.filter(p => (p.customActionLabel || p.action) === label).length;
    });

    baseStats['Total actions'] = total;
    baseStats['Efficacité (%)'] = total > 0 ? Math.round(totalPositive / total * 100) : 0;
    if (rPos || rNeu || rNeg) {
      baseStats['Note(+)'] = rPos;
      baseStats['Note(!)'] = rNeu;
      baseStats['Note(-)'] = rNeg;
    }

    return baseStats;
  });
}

function teamSetStats(pts: Point[], team: 'blue' | 'red') {
  const opponent = team === 'blue' ? 'red' : 'blue';
  const allActions = getFlattenedActions(pts);
  
  const scored = allActions.filter(p => p.team === team && p.type === 'scored');
  const opponentFaults = allActions.filter(p => p.team === opponent && p.type === 'fault');
  const neutrals = allActions.filter(p => p.team === team && p.type === 'neutral');

  const neutralLabels = Array.from(new Set(neutrals.map(p => p.customActionLabel || p.action)));
  const neutralDetails = neutralLabels.map(label => [label, neutrals.filter(p => (p.customActionLabel || p.action) === label).length] as [string, number]);

  // Ratings per action
  const actionsToRate = [...scored, ...opponentFaults, ...neutrals];
  const ratingsByAction: Record<string, { pos: number; neu: number; neg: number }> = {};
  actionsToRate.forEach(p => {
    if (!p.rating) return;
    const key = p.customActionLabel || p.action;
    if (!ratingsByAction[key]) ratingsByAction[key] = { pos: 0, neu: 0, neg: 0 };
    if (p.rating === 'positive') ratingsByAction[key].pos++;
    else if (p.rating === 'neutral') ratingsByAction[key].neu++;
    else if (p.rating === 'negative') ratingsByAction[key].neg++;
  });

  const totalRatings = {
    pos: actionsToRate.filter(p => p.rating === 'positive').length,
    neu: actionsToRate.filter(p => p.rating === 'neutral').length,
    neg: actionsToRate.filter(p => p.rating === 'negative').length,
  };

  return {
    scored: scored.length,
    faults: opponentFaults.length,
    neutrals: neutrals.length,
    details: OFFENSIVE_ACTIONS.map(a => [a.label, scored.filter(p => p.action === a.key).length, a.key] as [string, number, string]),
    faultDetails: FAULT_ACTIONS.map(a => [a.label, opponentFaults.filter(p => p.action === a.key).length, a.key] as [string, number, string]),
    neutralDetails,
    ratingsByAction,
    totalRatings,
  };
}

export function exportMatchToExcel(
  completedSets: SetData[],
  currentSetPoints: Point[],
  currentSetNumber: number,
  teamNames: { blue: string; red: string },
  players: Player[],
  _sport: SportType = 'volleyball',
) {
  const wb = XLSX.utils.book_new();

  const allSets: { label: string; pts: Point[]; score: { blue: number; red: number }; duration: number }[] = [];
  completedSets.forEach(s => { allSets.push({ label: `Set ${s.number}`, pts: s.points, score: s.score, duration: s.duration }); });
  if (currentSetPoints.length > 0) {
    const blue = currentSetPoints.filter(p => p.team === 'blue').length;
    const red = currentSetPoints.filter(p => p.team === 'red').length;
    allSets.push({ label: `Set ${currentSetNumber}`, pts: currentSetPoints, score: { blue, red }, duration: 0 });
  }

  allSets.forEach(set => {
    const rows: Record<string, unknown>[] = [];
    rows.push({ '#': `${teamNames.blue} vs ${teamNames.red}` });
    rows.push({ '#': set.label, 'Joueur': `Score: ${set.score.blue} - ${set.score.red}`, ...(set.duration > 0 ? { 'Col3': `Durée: ${formatDuration(set.duration)}` } : {}) });
    rows.push({});
    if (players.length > 0) {
      rows.push({ '#': '— Stats Individuelles (Équipe Bleue) —' });
      playerSetStats(set.pts, players).forEach(r => rows.push(r));
      rows.push({});
    }
    rows.push({ '#': '— Stats Équipe —' });
    (['blue', 'red'] as const).forEach(team => {
      const ts = teamSetStats(set.pts, team);
      const rFmt = (key: string) => {
        const r = ts.ratingsByAction[key];
        if (!r) return {};
        return { 'Note(+)': r.pos || '', 'Note(!)': r.neu || '', 'Note(-)': r.neg || '' };
      };
      rows.push({ '#': teamNames[team] });
      rows.push({ '#': '', 'Joueur': 'Pts gagnés', 'Col3': ts.scored });
      ts.details.forEach(([l, v, key]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v, ...rFmt(key) }));
      rows.push({ '#': '', 'Joueur': 'Fautes adv', 'Col3': ts.faults });
      ts.faultDetails.forEach(([l, v, key]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v, ...rFmt(key) }));
      if (ts.neutrals > 0) {
        rows.push({ '#': '', 'Joueur': 'Faits de jeu', 'Col3': ts.neutrals });
        ts.neutralDetails.forEach(([l, v]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v, ...rFmt(l) }));
      }
      rows.push({ '#': '', 'Joueur': 'Total', 'Col3': ts.scored + ts.faults + ts.neutrals, 'Note(+)': ts.totalRatings.pos || '', 'Note(!)': ts.totalRatings.neu || '', 'Note(-)': ts.totalRatings.neg || '' });
      rows.push({});
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, set.label);
  });

  const summaryRows: Record<string, unknown>[] = [];
  const allPoints = allSets.flatMap(s => s.pts);
  summaryRows.push({ 'Info': `${teamNames.blue} vs ${teamNames.red} — Résumé Global` });
  summaryRows.push({ 'Info': `Sets joués: ${allSets.length}` });
  const blueSetWins = completedSets.filter(s => s.winner === 'blue').length;
  const redSetWins = completedSets.filter(s => s.winner === 'red').length;
  summaryRows.push({ 'Info': `Score sets: ${teamNames.blue} ${blueSetWins} - ${redSetWins} ${teamNames.red}` });
  summaryRows.push({});
  summaryRows.push({ 'Info': '— Durées par Set —' });
  allSets.forEach(s => { summaryRows.push({ 'Info': s.label, 'Valeur': `${s.score.blue} - ${s.score.red}`, 'Détail': s.duration > 0 ? formatDuration(s.duration) : 'En cours' }); });
  const totalDuration = allSets.reduce((sum, s) => sum + s.duration, 0);
  if (totalDuration > 0) summaryRows.push({ 'Info': 'Durée totale', 'Détail': formatDuration(totalDuration) });
  summaryRows.push({});
  if (players.length > 0) {
    summaryRows.push({ 'Info': '— Stats Individuelles Globales (Équipe Bleue) —' });
    playerSetStats(allPoints, players).forEach(r => {
      const keys = Object.keys(r);
      const entry: Record<string, unknown> = { 'Info': r[keys[0]] };
      keys.slice(1).forEach((k, i) => { entry[`Col${i + 1}`] = `${k}: ${r[k as keyof typeof r]}`; });
      summaryRows.push(entry);
    });
    summaryRows.push({});
  }
  summaryRows.push({ 'Info': '— Stats Équipe Globales —' });
  (['blue', 'red'] as const).forEach(team => {
    const ts = teamSetStats(allPoints, team);
    summaryRows.push({ 'Info': teamNames[team], 'Valeur': `Pts: ${ts.scored}`, 'Détail': `Fautes adv: ${ts.faults}`, 'Col4': `Faits jeu: ${ts.neutrals}` });
  });
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');

  const filename = `${teamNames.blue}-vs-${teamNames.red}.xlsx`;
  XLSX.writeFile(wb, filename);
}
