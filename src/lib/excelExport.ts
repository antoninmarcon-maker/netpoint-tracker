import * as XLSX from '@e965/xlsx';
import { Point, SetData, Player, SportType, isBasketScoredAction, getBasketPointValue, BASKET_SCORED_ACTIONS, BASKET_FAULT_ACTIONS } from '@/types/sports';

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

    const totalPositive = scored.length + faultWins.length;
    const totalNegative = faults.length;
    const total = totalPositive + totalNegative;

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

    const totalPoints = scored.reduce((s, p) => s + (p.pointValue ?? 0), 0);
    const total = scored.length + negatives.length;

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
      'Total actions': total,
      'Efficacité (%)': total > 0 ? Math.round(scored.length / total * 100) : 0,
    };
  });
}

function teamSetStats(pts: Point[], team: 'blue' | 'red', sport: SportType = 'volleyball') {
  if (sport === 'basketball') {
    const scored = pts.filter(p => p.team === team && p.type === 'scored');
    const faults = pts.filter(p => p.team === team && p.type === 'fault');
    return {
      scored: scored.reduce((s, p) => s + (p.pointValue ?? 0), 0),
      scoredCount: scored.length,
      freeThrows: scored.filter(p => p.action === 'free_throw').length,
      twoPoints: scored.filter(p => p.action === 'two_points').length,
      threePoints: scored.filter(p => p.action === 'three_points').length,
      faults: faults.length,
      missedShots: faults.filter(p => p.action === 'missed_shot').length,
      turnovers: faults.filter(p => p.action === 'turnover').length,
      foulsCommitted: faults.filter(p => p.action === 'foul_committed').length,
      // Volley fields (0)
      attacks: 0, aces: 0, blocks: 0, bidouilles: 0, secondeMains: 0, otherOffensive: 0,
      outs: 0, netFaults: 0, serviceMisses: 0, blockOuts: 0,
    };
  }
  const opponent = team === 'blue' ? 'red' : 'blue';
  const scored = pts.filter(p => p.team === team && p.type === 'scored');
  const faults = pts.filter(p => p.team === opponent && p.type === 'fault');
  return {
    scored: scored.length,
    scoredCount: scored.length,
    attacks: scored.filter(p => p.action === 'attack').length,
    aces: scored.filter(p => p.action === 'ace').length,
    blocks: scored.filter(p => p.action === 'block').length,
    bidouilles: scored.filter(p => p.action === 'bidouille').length,
    secondeMains: scored.filter(p => p.action === 'seconde_main').length,
    otherOffensive: scored.filter(p => p.action === 'other_offensive').length,
    faults: faults.length,
    outs: faults.filter(p => p.action === 'out').length,
    netFaults: faults.filter(p => p.action === 'net_fault').length,
    serviceMisses: faults.filter(p => p.action === 'service_miss').length,
    blockOuts: faults.filter(p => p.action === 'block_out').length,
    // Basket fields (0)
    freeThrows: 0, twoPoints: 0, threePoints: 0, missedShots: 0, turnovers: 0, foulsCommitted: 0,
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
  const periodLabel = isBasketball ? 'QT' : 'Set';
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
      rows.push({ '#': '— Stats Individuelles —' });
      const pStats = isBasketball ? playerSetStatsBasket(set.pts, players) : playerSetStatsVolley(set.pts, players);
      pStats.forEach(r => rows.push(r));
      rows.push({});
    }

    rows.push({ '#': '— Stats Équipe —' });
    (['blue', 'red'] as const).forEach(team => {
      const ts = teamSetStats(set.pts, team, sport);
      rows.push({ '#': teamNames[team] });
      if (isBasketball) {
        rows.push({ '#': '', 'Joueur': 'Points marqués', 'Col3': ts.scored });
        rows.push({ '#': '', 'Joueur': '  LF (1pt)', 'Col3': ts.freeThrows });
        rows.push({ '#': '', 'Joueur': '  Int. (2pts)', 'Col3': ts.twoPoints });
        rows.push({ '#': '', 'Joueur': '  Ext. (3pts)', 'Col3': ts.threePoints });
        rows.push({ '#': '', 'Joueur': 'Actions négatives', 'Col3': ts.faults });
        rows.push({ '#': '', 'Joueur': '  Tirs manqués', 'Col3': ts.missedShots });
        rows.push({ '#': '', 'Joueur': '  Pertes de balle', 'Col3': ts.turnovers });
        rows.push({ '#': '', 'Joueur': '  Fautes commises', 'Col3': ts.foulsCommitted });
      } else {
        rows.push({ '#': '', 'Joueur': 'Pts gagnés (offensifs)', 'Col3': ts.scored });
        rows.push({ '#': '', 'Joueur': '  Attaques', 'Col3': ts.attacks });
        rows.push({ '#': '', 'Joueur': '  Aces', 'Col3': ts.aces });
        rows.push({ '#': '', 'Joueur': '  Blocks', 'Col3': ts.blocks });
        rows.push({ '#': '', 'Joueur': '  Bidouilles', 'Col3': ts.bidouilles });
        rows.push({ '#': '', 'Joueur': '  2ndes mains', 'Col3': ts.secondeMains });
        rows.push({ '#': '', 'Joueur': '  Autres', 'Col3': ts.otherOffensive });
        rows.push({ '#': '', 'Joueur': 'Fautes commises', 'Col3': ts.faults });
        rows.push({ '#': '', 'Joueur': '  Out', 'Col3': ts.outs });
        rows.push({ '#': '', 'Joueur': '  Filet', 'Col3': ts.netFaults });
        rows.push({ '#': '', 'Joueur': '  Srv loupés', 'Col3': ts.serviceMisses });
        rows.push({ '#': '', 'Joueur': '  Block Out', 'Col3': ts.blockOuts });
      }
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

  summaryRows.push({ 'Info': `— Scores par ${periodLabel} —` });
  allSets.forEach(s => {
    summaryRows.push({ 'Info': s.label, 'Valeur': `${s.score.blue} - ${s.score.red}`, 'Détail': s.duration > 0 ? formatDuration(s.duration) : '' });
  });
  summaryRows.push({});

  if (players.length > 0) {
    summaryRows.push({ 'Info': '— Stats Individuelles Globales —' });
    if (isBasketball) {
      const globalPlayerStats = playerSetStatsBasket(allPoints, players);
      globalPlayerStats.forEach(r => {
        summaryRows.push({
          'Info': r['Joueur'],
          'Détail': `Pts: ${r['Total points']}`,
          'Extra1': `LF: ${r['LF (1pt)']}`,
          'Extra2': `2pt: ${r['Int. (2pts)']}`,
          'Extra3': `3pt: ${r['Ext. (3pts)']}`,
          'Extra4': `Miss: ${r['Tirs manqués']}`,
          'Extra5': `Eff: ${r['Efficacité (%)']}%`,
        });
      });
    } else {
      const globalPlayerStats = playerSetStatsVolley(allPoints, players);
      globalPlayerStats.forEach(r => {
        summaryRows.push({
          'Info': r['Joueur'],
          'Détail': `Pts: ${r['Total pts gagnés']}`,
          'Extra1': `Att: ${r['Attaques']}`,
          'Extra2': `Ace: ${r['Aces']}`,
          'Extra3': `Blk: ${r['Blocks']}`,
          'Extra4': `Fts: ${r['Fautes commises']}`,
          'Extra5': `Eff: ${r['Efficacité (%)']}%`,
        });
      });
    }
    summaryRows.push({});
  }

  summaryRows.push({ 'Info': '— Stats Équipe Globales —' });
  (['blue', 'red'] as const).forEach(team => {
    const ts = teamSetStats(allPoints, team, sport);
    summaryRows.push({ 'Info': teamNames[team], 'Valeur': `Pts: ${ts.scored}`, 'Détail': isBasketball ? `Négatifs: ${ts.faults}` : `Fautes: ${ts.faults}` });
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');

  const filename = `${teamNames.blue}-vs-${teamNames.red}.xlsx`;
  XLSX.writeFile(wb, filename);
}
