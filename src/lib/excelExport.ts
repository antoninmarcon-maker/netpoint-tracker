import * as XLSX from '@e965/xlsx';
import { Point, SetData, Player, SportType, isBasketScoredAction, getBasketPointValue, BASKET_SCORED_ACTIONS, BASKET_FAULT_ACTIONS, TENNIS_SCORED_ACTIONS, TENNIS_FAULT_ACTIONS, PADEL_SCORED_ACTIONS, PADEL_FAULT_ACTIONS, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/sports';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function playerSetStatsVolley(pts: Point[], players: Player[]) {
  return players.map(player => {
    const pp = pts.filter(p => p.playerId === player.id);
    const scored = pp.filter(p => p.team === 'blue' && p.type === 'scored');
    const faultWins = pp.filter(p => p.team === 'blue' && p.type === 'fault');
    const faults = pp.filter(p => p.team === 'red');
    const neutrals = pp.filter(p => p.type === 'neutral');

    const totalPositive = scored.length + faultWins.length;
    const totalNegative = faults.length;
    const total = totalPositive + totalNegative + neutrals.length;

    return {
      'Joueur': player.name || '—',
      'Attaques': scored.filter(p => p.action === 'attack').length,
      'Aces': scored.filter(p => p.action === 'ace').length,
      'Blocks': scored.filter(p => p.action === 'block').length,
      'Bidouilles': scored.filter(p => p.action === 'bidouille').length,
      '2ndes mains': scored.filter(p => p.action === 'seconde_main').length,
      'Autres offensifs': scored.filter(p => p.action === 'other_offensive').length,
      'Pts gagnés (offensifs)': scored.length,
      'Pts gagnés (fautes adv.)': faultWins.length,
      'Total pts gagnés': totalPositive,
      'Fautes commises': totalNegative,
      'Faits de jeu (Total)': neutrals.length,
      'Total actions': total,
      'Efficacité (%)': total > 0 ? Math.round(totalPositive / total * 100) : 0,
    };
  });
}

function playerSetStatsBasket(pts: Point[], players: Player[]) {
  return players.map(player => {
    const pp = pts.filter(p => p.playerId === player.id);
    const scored = pp.filter(p => p.team === 'blue' && p.type === 'scored');
    const negatives = pp.filter(p => p.team === 'red');
    const neutrals = pp.filter(p => p.type === 'neutral');

    const totalPoints = scored.reduce((s, p) => s + (p.pointValue ?? 0), 0);
    const total = scored.length + negatives.length + neutrals.length;

    return {
      'Joueur': player.name || '—',
      'LF (1pt)': scored.filter(p => p.action === 'free_throw').length,
      'Int. (2pts)': scored.filter(p => p.action === 'two_points').length,
      'Ext. (3pts)': scored.filter(p => p.action === 'three_points').length,
      'Total paniers': scored.length,
      'Total points': totalPoints,
      'Pts encaissés': negatives.filter(p => p.type === 'scored').length,
      'Tirs manqués': negatives.filter(p => p.action === 'missed_shot').length,
      'Pertes balle': negatives.filter(p => p.action === 'turnover').length,
      'Fautes': negatives.filter(p => p.action === 'foul_committed').length,
      'Total négatifs': negatives.length,
      'Faits de jeu (Total)': neutrals.length,
      'Total actions': total,
      'Efficacité (%)': total > 0 ? Math.round(scored.length / total * 100) : 0,
    };
  });
}

function playerSetStatsTennis(pts: Point[], players: Player[]) {
  return players.map(player => {
    const pp = pts.filter(p => p.playerId === player.id);
    const scored = pp.filter(p => p.team === 'blue' && p.type === 'scored');
    const faults = pp.filter(p => p.team === 'red');
    const neutrals = pp.filter(p => p.type === 'neutral');

    const total = scored.length + faults.length + neutrals.length;

    return {
      'Joueur': player.name || '—',
      'Aces': scored.filter(p => p.action === 'tennis_ace').length,
      'CD gagnants': scored.filter(p => p.action === 'winner_forehand').length,
      'Revers gagnants': scored.filter(p => p.action === 'winner_backhand').length,
      'Volées gagnantes': scored.filter(p => p.action === 'volley_winner').length,
      'Smashs': scored.filter(p => p.action === 'smash').length,
      'Amortis': scored.filter(p => p.action === 'drop_shot_winner').length,
      'Autres gagnants': scored.filter(p => p.action === 'other_tennis_winner').length,
      'Total gagnants': scored.length,
      'Doubles fautes': faults.filter(p => p.action === 'double_fault').length,
      'Fautes CD': faults.filter(p => p.action === 'unforced_error_forehand').length,
      'Fautes revers': faults.filter(p => p.action === 'unforced_error_backhand').length,
      'Filet': faults.filter(p => p.action === 'net_error').length,
      'Out': faults.filter(p => p.action === 'out_long' || p.action === 'out_wide').length,
      'Total fautes': faults.length,
      'Faits de jeu (Total)': neutrals.length,
      'Total actions': total,
      'Efficacité (%)': total > 0 ? Math.round(scored.length / total * 100) : 0,
    };
  });
}

function playerSetStatsPadel(pts: Point[], players: Player[]) {
  return players.map(player => {
    const pp = pts.filter(p => p.playerId === player.id);
    const scored = pp.filter(p => p.team === 'blue' && p.type === 'scored');
    const faults = pp.filter(p => p.team === 'red');
    const neutrals = pp.filter(p => p.type === 'neutral');

    const total = scored.length + faults.length + neutrals.length;

    return {
      'Joueur': player.name || '—',
      'Víbora': scored.filter(p => p.action === 'vibora').length,
      'Bandeja': scored.filter(p => p.action === 'bandeja').length,
      'Smash': scored.filter(p => p.action === 'smash_padel').length,
      'Volée': scored.filter(p => p.action === 'volee').length,
      'Bajada': scored.filter(p => p.action === 'bajada').length,
      'Chiquita': scored.filter(p => p.action === 'chiquita_winner').length,
      'Par 3': scored.filter(p => p.action === 'par_3').length,
      'Autres gagnants': scored.filter(p => p.action === 'other_padel_winner').length,
      'Total gagnants': scored.length,
      'Doubles fautes': faults.filter(p => p.action === 'padel_double_fault').length,
      'Fautes directes': faults.filter(p => p.action === 'padel_unforced_error').length,
      'Filet': faults.filter(p => p.action === 'padel_net_error').length,
      'Out': faults.filter(p => p.action === 'padel_out').length,
      'Grille': faults.filter(p => p.action === 'grille_error').length,
      'Vitre': faults.filter(p => p.action === 'vitre_error').length,
      'Total fautes': faults.length,
      'Faits de jeu (Total)': neutrals.length,
      'Total actions': total,
      'Efficacité (%)': total > 0 ? Math.round(scored.length / total * 100) : 0,
    };
  });
}

function getPlayerStats(pts: Point[], players: Player[], sport: SportType) {
  switch (sport) {
    case 'basketball': return playerSetStatsBasket(pts, players);
    case 'tennis': return playerSetStatsTennis(pts, players);
    case 'padel': return playerSetStatsPadel(pts, players);
    default: return playerSetStatsVolley(pts, players);
  }
}

function teamSetStats(pts: Point[], team: 'blue' | 'red', sport: SportType = 'volleyball') {
  const opponent = team === 'blue' ? 'red' : 'blue';
  const scored = pts.filter(p => p.team === team && p.type === 'scored');
  const teamFaults = pts.filter(p => p.team === team && p.type === 'fault');
  const opponentFaults = pts.filter(p => p.team === opponent && p.type === 'fault');

  const base = {
    scoredCount: scored.length,
    faultsCount: sport === 'basketball' ? teamFaults.length : opponentFaults.length,
  };

  if (sport === 'basketball') {
    return {
      ...base,
      scored: scored.reduce((s, p) => s + (p.pointValue ?? 0), 0),
      faults: teamFaults.length,
      details: [
        ['LF (1pt)', scored.filter(p => p.action === 'free_throw').length],
        ['Int. (2pts)', scored.filter(p => p.action === 'two_points').length],
        ['Ext. (3pts)', scored.filter(p => p.action === 'three_points').length],
      ] as [string, number][],
      faultDetails: [
        ['Tirs manqués', teamFaults.filter(p => p.action === 'missed_shot').length],
        ['Pertes de balle', teamFaults.filter(p => p.action === 'turnover').length],
        ['Fautes commises', teamFaults.filter(p => p.action === 'foul_committed').length],
      ] as [string, number][],
    };
  }

  if (sport === 'tennis') {
    return {
      ...base,
      scored: scored.length,
      faults: opponentFaults.length,
      details: TENNIS_SCORED_ACTIONS.map(a => [a.label, scored.filter(p => p.action === a.key).length] as [string, number]),
      faultDetails: TENNIS_FAULT_ACTIONS.map(a => [a.label, opponentFaults.filter(p => p.action === a.key).length] as [string, number]),
    };
  }

  if (sport === 'padel') {
    return {
      ...base,
      scored: scored.length,
      faults: opponentFaults.length,
      details: PADEL_SCORED_ACTIONS.map(a => [a.label, scored.filter(p => p.action === a.key).length] as [string, number]),
      faultDetails: PADEL_FAULT_ACTIONS.map(a => [a.label, opponentFaults.filter(p => p.action === a.key).length] as [string, number]),
    };
  }

  // Volleyball
  return {
    ...base,
    scored: scored.length,
    faults: opponentFaults.length,
    details: OFFENSIVE_ACTIONS.map(a => [a.label, scored.filter(p => p.action === a.key).length] as [string, number]),
    faultDetails: FAULT_ACTIONS.map(a => [a.label, opponentFaults.filter(p => p.action === a.key).length] as [string, number]),
  };
}

export function exportMatchToExcel(
  completedSets: SetData[],
  currentSetPoints: Point[],
  currentSetNumber: number,
  teamNames: { blue: string; red: string },
  players: Player[],
  sport: SportType = 'volleyball',
) {
  const isBasketball = sport === 'basketball';
  const periodLabel = sport === 'basketball' ? 'QT' : 'Set';
  const wb = XLSX.utils.book_new();

  const allSets: { label: string; pts: Point[]; score: { blue: number; red: number }; duration: number }[] = [];
  completedSets.forEach(s => {
    allSets.push({ label: `${periodLabel} ${s.number}`, pts: s.points, score: s.score, duration: s.duration });
  });
  if (currentSetPoints.length > 0) {
    let blue: number, red: number;
    if (isBasketball) {
      blue = currentSetPoints.filter(p => p.team === 'blue' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0);
      red = currentSetPoints.filter(p => p.team === 'red' && p.type === 'scored').reduce((s, p) => s + (p.pointValue ?? 0), 0);
    } else {
      blue = currentSetPoints.filter(p => p.team === 'blue').length;
      red = currentSetPoints.filter(p => p.team === 'red').length;
    }
    allSets.push({ label: `${periodLabel} ${currentSetNumber}`, pts: currentSetPoints, score: { blue, red }, duration: 0 });
  }

  // Per-set sheets
  allSets.forEach(set => {
    const rows: Record<string, unknown>[] = [];
    rows.push({ '#': `${teamNames.blue} vs ${teamNames.red}` });
    rows.push({ '#': set.label, 'Joueur': `Score: ${set.score.blue} - ${set.score.red}`, ...(set.duration > 0 ? { 'Col3': `Durée: ${formatDuration(set.duration)}` } : {}) });
    rows.push({});

    if (players.length > 0) {
      rows.push({ '#': '— Stats Individuelles (Équipe Bleue) —' });
      const pStats = getPlayerStats(set.pts, players, sport);
      pStats.forEach(r => rows.push(r));
      rows.push({});
    }

    rows.push({ '#': '— Stats Équipe —' });
    (['blue', 'red'] as const).forEach(team => {
      const ts = teamSetStats(set.pts, team, sport);
      rows.push({ '#': teamNames[team] });
      rows.push({ '#': '', 'Joueur': isBasketball ? 'Points marqués' : 'Pts gagnés', 'Col3': ts.scored });
      ts.details.forEach(([l, v]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v }));
      rows.push({ '#': '', 'Joueur': isBasketball ? 'Actions négatives' : 'Fautes', 'Col3': ts.faults });
      ts.faultDetails.forEach(([l, v]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v }));
      rows.push({});
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, set.label);
  });

  // Summary sheet
  const summaryRows: Record<string, unknown>[] = [];
  const allPoints = allSets.flatMap(s => s.pts);

  summaryRows.push({ 'Info': `${teamNames.blue} vs ${teamNames.red} — Résumé Global` });
  summaryRows.push({ 'Info': `${periodLabel}s joués: ${allSets.length}` });

  const blueSetWins = completedSets.filter(s => s.winner === 'blue').length;
  const redSetWins = completedSets.filter(s => s.winner === 'red').length;
  summaryRows.push({ 'Info': `Score ${periodLabel.toLowerCase()}s: ${teamNames.blue} ${blueSetWins} - ${redSetWins} ${teamNames.red}` });
  summaryRows.push({});

  // Chrono: durée par set
  summaryRows.push({ 'Info': `— Durées par ${periodLabel} —` });
  allSets.forEach(s => {
    summaryRows.push({ 'Info': s.label, 'Valeur': `${s.score.blue} - ${s.score.red}`, 'Détail': s.duration > 0 ? formatDuration(s.duration) : 'En cours' });
  });
  const totalDuration = allSets.reduce((sum, s) => sum + s.duration, 0);
  if (totalDuration > 0) {
    summaryRows.push({ 'Info': 'Durée totale', 'Détail': formatDuration(totalDuration) });
  }
  summaryRows.push({});

  if (players.length > 0) {
    summaryRows.push({ 'Info': '— Stats Individuelles Globales (Équipe Bleue) —' });
    const globalPlayerStats = getPlayerStats(allPoints, players, sport);
    globalPlayerStats.forEach(r => {
      const keys = Object.keys(r);
      const entry: Record<string, unknown> = { 'Info': r[keys[0]] };
      keys.slice(1).forEach((k, i) => { entry[`Col${i + 1}`] = `${k}: ${r[k as keyof typeof r]}`; });
      summaryRows.push(entry);
    });
    summaryRows.push({});
  }

  summaryRows.push({ 'Info': '— Stats Équipe Globales —' });
  (['blue', 'red'] as const).forEach(team => {
    const ts = teamSetStats(allPoints, team, sport);
    summaryRows.push({ 'Info': teamNames[team], 'Valeur': `Pts: ${ts.scored}`, 'Détail': isBasketball ? `Négatifs: ${ts.faults}` : `Fautes: ${ts.faults}` });
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');

  const filename = `${teamNames.blue}-vs-${teamNames.red}.xlsx`;
  XLSX.writeFile(wb, filename);
}
