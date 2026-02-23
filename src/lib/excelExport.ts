import * as XLSX from '@e965/xlsx';
import { Point, SetData, Player, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/sports';

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

function teamSetStats(pts: Point[], team: 'blue' | 'red') {
  const opponent = team === 'blue' ? 'red' : 'blue';
  const scored = pts.filter(p => p.team === team && p.type === 'scored');
  const opponentFaults = pts.filter(p => p.team === opponent && p.type === 'fault');
  return {
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
      rows.push({ '#': teamNames[team] });
      rows.push({ '#': '', 'Joueur': 'Pts gagnés', 'Col3': ts.scored });
      ts.details.forEach(([l, v]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v }));
      rows.push({ '#': '', 'Joueur': 'Fautes', 'Col3': ts.faults });
      ts.faultDetails.forEach(([l, v]) => rows.push({ '#': '', 'Joueur': `  ${l}`, 'Col3': v }));
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
    summaryRows.push({ 'Info': teamNames[team], 'Valeur': `Pts: ${ts.scored}`, 'Détail': `Fautes: ${ts.faults}` });
  });
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé Global');

  const filename = `${teamNames.blue}-vs-${teamNames.red}.xlsx`;
  XLSX.writeFile(wb, filename);
}
