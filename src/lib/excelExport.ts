import * as XLSX from 'xlsx';
import { Point, SetData, Player } from '@/types/volleyball';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function playerSetStats(pts: Point[], players: Player[]) {
  return players.map(player => {
    const pp = pts.filter(p => p.playerId === player.id);
    const scored = pp.filter(p => p.team === 'blue' && p.type === 'scored');
    const faultWins = pp.filter(p => p.team === 'blue' && p.type === 'fault');
    const faults = pp.filter(p => p.team === 'red' && p.type === 'fault');

    const totalPositive = scored.length + faultWins.length;
    const totalNegative = faults.length;
    const total = totalPositive + totalNegative;

    return {
      '#': player.number,
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

function teamSetStats(pts: Point[], team: 'blue' | 'red') {
  const opponent = team === 'blue' ? 'red' : 'blue';
  const scored = pts.filter(p => p.team === team && p.type === 'scored');
  const faults = pts.filter(p => p.team === opponent && p.type === 'fault');
  return {
    scored: scored.length,
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
  };
}

export function exportMatchToExcel(
  completedSets: SetData[],
  currentSetPoints: Point[],
  currentSetNumber: number,
  teamNames: { blue: string; red: string },
  players: Player[],
) {
  const wb = XLSX.utils.book_new();

  // Collect all sets (completed + current if has points)
  const allSets: { label: string; pts: Point[]; score: { blue: number; red: number }; duration: number }[] = [];
  completedSets.forEach(s => {
    allSets.push({ label: `Set ${s.number}`, pts: s.points, score: s.score, duration: s.duration });
  });
  if (currentSetPoints.length > 0) {
    const blue = currentSetPoints.filter(p => p.team === 'blue').length;
    const red = currentSetPoints.filter(p => p.team === 'red').length;
    allSets.push({ label: `Set ${currentSetNumber}`, pts: currentSetPoints, score: { blue, red }, duration: 0 });
  }

  // --- Per-set sheets ---
  allSets.forEach(set => {
    const rows: Record<string, unknown>[] = [];

    // Header info
    rows.push({ '#': `${teamNames.blue} vs ${teamNames.red}` });
    rows.push({ '#': set.label, 'Joueur': `Score: ${set.score.blue} - ${set.score.red}`, 'Attaques': set.duration > 0 ? `Durée: ${formatDuration(set.duration)}` : '' });
    rows.push({}); // blank row

    // Player stats
    if (players.length > 0) {
      rows.push({ '#': '— Stats Individuelles —' });
      const pStats = playerSetStats(set.pts, players);
      pStats.forEach(r => rows.push(r));
      rows.push({}); // blank
    }

    // Team stats
    rows.push({ '#': '— Stats Équipe —' });
    (['blue', 'red'] as const).forEach(team => {
      const ts = teamSetStats(set.pts, team);
      rows.push({ '#': teamNames[team] });
      rows.push({ '#': '', 'Joueur': 'Pts gagnés (offensifs)', 'Attaques': ts.scored });
      rows.push({ '#': '', 'Joueur': '  Attaques', 'Attaques': ts.attacks });
      rows.push({ '#': '', 'Joueur': '  Aces', 'Attaques': ts.aces });
      rows.push({ '#': '', 'Joueur': '  Blocks', 'Attaques': ts.blocks });
      rows.push({ '#': '', 'Joueur': '  Bidouilles', 'Attaques': ts.bidouilles });
      rows.push({ '#': '', 'Joueur': '  2ndes mains', 'Attaques': ts.secondeMains });
      rows.push({ '#': '', 'Joueur': '  Autres', 'Attaques': ts.otherOffensive });
      rows.push({ '#': '', 'Joueur': 'Fautes commises', 'Attaques': ts.faults });
      rows.push({ '#': '', 'Joueur': '  Out', 'Attaques': ts.outs });
      rows.push({ '#': '', 'Joueur': '  Filet', 'Attaques': ts.netFaults });
      rows.push({ '#': '', 'Joueur': '  Srv loupés', 'Attaques': ts.serviceMisses });
      rows.push({ '#': '', 'Joueur': '  Block Out', 'Attaques': ts.blockOuts });
      rows.push({});
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, set.label);
  });

  // --- Summary sheet ---
  const summaryRows: Record<string, unknown>[] = [];
  const allPoints = allSets.flatMap(s => s.pts);

  summaryRows.push({ 'Info': `${teamNames.blue} vs ${teamNames.red} — Résumé Global` });
  summaryRows.push({ 'Info': `Sets joués: ${allSets.length}` });

  const blueSetWins = completedSets.filter(s => s.winner === 'blue').length;
  const redSetWins = completedSets.filter(s => s.winner === 'red').length;
  summaryRows.push({ 'Info': `Score sets: ${teamNames.blue} ${blueSetWins} - ${redSetWins} ${teamNames.red}` });
  summaryRows.push({});

  // Per-set scores
  summaryRows.push({ 'Info': '— Scores par Set —' });
  allSets.forEach(s => {
    summaryRows.push({ 'Info': s.label, 'Valeur': `${s.score.blue} - ${s.score.red}`, 'Détail': s.duration > 0 ? formatDuration(s.duration) : '' });
  });
  summaryRows.push({});

  // Global player stats
  if (players.length > 0) {
    summaryRows.push({ 'Info': '— Stats Individuelles Globales —' });
    const globalPlayerStats = playerSetStats(allPoints, players);
    // Re-map keys to match summary columns
    globalPlayerStats.forEach(r => {
      summaryRows.push({
        'Info': `#${r['#']}`,
        'Valeur': r['Joueur'],
        'Détail': `Pts: ${r['Total pts gagnés']}`,
        'Extra1': `Att: ${r['Attaques']}`,
        'Extra2': `Ace: ${r['Aces']}`,
        'Extra3': `Blk: ${r['Blocks']}`,
        'Extra4': `Fts: ${r['Fautes commises']}`,
        'Extra5': `Eff: ${r['Efficacité (%)']}%`,
      });
    });
    summaryRows.push({});
  }

  // Global team stats
  summaryRows.push({ 'Info': '— Stats Équipe Globales —' });
  (['blue', 'red'] as const).forEach(team => {
    const ts = teamSetStats(allPoints, team);
    summaryRows.push({ 'Info': teamNames[team], 'Valeur': `Pts: ${ts.scored}`, 'Détail': `Fautes: ${ts.faults}` });
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');

  // Download
  const filename = `${teamNames.blue}-vs-${teamNames.red}.xlsx`;
  XLSX.writeFile(wb, filename);
}
