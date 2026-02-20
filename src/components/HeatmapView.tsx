import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Download, ChevronDown, Copy, Image, FileSpreadsheet, Map, Share2, Link as LinkIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Point, SetData, Player, isOffensiveAction, isBasketScoredAction, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS, BASKET_SCORED_ACTIONS, BASKET_FAULT_ACTIONS } from '@/types/sports';
import { PointTimeline } from './PointTimeline';
import { CourtDisplay } from './CourtDisplay';
import { PlayerStats } from './PlayerStats';
import { exportMatchToExcel } from '@/lib/excelExport';
import { generateShareToken } from '@/lib/cloudStorage';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
interface HeatmapViewProps {
  points: Point[];
  completedSets: SetData[];
  currentSetPoints: Point[];
  currentSetNumber: number;
  stats: {
    blue: { scored: number; faults: number };
    red: { scored: number; faults: number };
    total: number;
  };
  teamNames: { blue: string; red: string };
  players?: Player[];
  sport?: SportType;
  matchId?: string;
  isLoggedIn?: boolean;
}

type SetFilter = 'all' | number;

function createStyledEl(tag: string, styles: Record<string, string>, textContent?: string): HTMLElement {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (textContent !== undefined) el.textContent = textContent;
  return el;
}

function createStatRow(label: string, value: string | number, opts?: { bold?: boolean; indent?: boolean; borderTop?: boolean; valueColor?: string }) {
  const row = createStyledEl('div', {
    display: 'flex', justifyContent: 'space-between',
    ...(opts?.indent ? { paddingLeft: '8px' } : {}),
    ...(opts?.bold ? { fontWeight: '700' } : {}),
    ...(opts?.borderTop ? { borderTop: '1px solid hsl(var(--border))', paddingTop: '4px', marginTop: '4px' } : {}),
    color: 'hsl(var(--muted-foreground))',
  });
  row.appendChild(createStyledEl('span', {}, String(label)));
  row.appendChild(createStyledEl('span', { fontWeight: '700', color: opts?.valueColor || 'hsl(var(--foreground))' }, String(value)));
  return row;
}

function buildExportContainer(teamNames: { blue: string; red: string }, label: string, ds: ReturnType<typeof computeStats>, sport: SportType = 'volleyball'): HTMLElement {
  const isBasket = sport === 'basketball';
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;';
  container.className = 'bg-background rounded-2xl p-4 space-y-3';

  const header = createStyledEl('div', { textAlign: 'center' });
  const title = createStyledEl('p', { fontSize: '16px', fontWeight: '900', color: 'hsl(var(--foreground))' });
  title.textContent = `${isBasket ? '🏀' : '🏐'} ${teamNames.blue} vs ${teamNames.red}`;
  header.appendChild(title);
  const subtitle = createStyledEl('p', { fontSize: '10px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em' }, label);
  header.appendChild(subtitle);
  container.appendChild(header);

  const grid = createStyledEl('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' });
  for (const team of ['blue', 'red'] as const) {
    const card = createStyledEl('div', { background: 'hsl(var(--card))', borderRadius: '12px', padding: '12px', border: '1px solid hsl(var(--border))' });
    const teamTitle = createStyledEl('p', {
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px',
      color: team === 'blue' ? 'hsl(217,91%,60%)' : 'hsl(0,84%,60%)',
    }, teamNames[team]);
    card.appendChild(teamTitle);

    const statsEl = createStyledEl('div', { fontSize: '11px', color: 'hsl(var(--foreground))' });
    statsEl.appendChild(createStatRow(isBasket ? '🏀 Points' : '⚡ Gagnés', ds[team].scored, { bold: true }));
    const scoredRows = isBasket
      ? [['LF (1pt)', ds[team].freeThrows], ['Int. (2pts)', ds[team].twoPoints], ['Ext. (3pts)', ds[team].threePoints]] as [string, number][]
      : [['Attaques', ds[team].attacks], ['Aces', ds[team].aces], ['Blocks', ds[team].blocks], ['Bidouilles', ds[team].bidouilles], ['2ndes mains', ds[team].secondeMains], ['Autres', ds[team].otherOffensive]] as [string, number][];
    for (const [l, v] of scoredRows) statsEl.appendChild(createStatRow(l, v, { indent: true }));
    statsEl.appendChild(createStatRow('❌ ' + (isBasket ? 'Négatifs' : 'Fautes adv.'), ds[team].faults, { bold: true, borderTop: true, valueColor: 'hsl(var(--destructive))' }));
    const faultRows = isBasket
      ? [['Tirs manqués', ds[team].missedShots], ['Pertes', ds[team].turnovers], ['Fautes', ds[team].foulsCommitted]] as [string, number][]
      : [['Out', ds[team].outs], ['Filet', ds[team].netFaults], ['Srv loupés', ds[team].serviceMisses], ['Block Out', ds[team].blockOuts]] as [string, number][];
    for (const [l, v] of faultRows) statsEl.appendChild(createStatRow(l, v, { indent: true }));
    statsEl.appendChild(createStatRow('Total', ds[team].scored + ds[team].faults, { borderTop: true }));
    card.appendChild(statsEl);
    grid.appendChild(card);
  }
  container.appendChild(grid);

  const totalCard = createStyledEl('div', { textAlign: 'center', background: 'hsl(var(--card))', borderRadius: '12px', padding: '12px', border: '1px solid hsl(var(--border))' });
  totalCard.appendChild(createStyledEl('p', { fontSize: '24px', fontWeight: '900', color: 'hsl(var(--foreground))' }, String(ds.total)));
  totalCard.appendChild(createStyledEl('p', { fontSize: '10px', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.1em' }, 'Actions totales'));
  container.appendChild(totalCard);

  container.appendChild(createStyledEl('p', { fontSize: '8px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', opacity: '0.5' }, 'My Volley · Capbreton'));
  return container;
}

interface TeamStats {
  scored: number;
  faults: number;
  // Volleyball
  attacks: number; aces: number; blocks: number; bidouilles: number; secondeMains: number; otherOffensive: number;
  outs: number; netFaults: number; serviceMisses: number; blockOuts: number;
  // Basketball
  scoredPoints: number; freeThrows: number; twoPoints: number; threePoints: number;
  missedShots: number; turnovers: number; foulsCommitted: number;
}

function computeStats(pts: Point[], sport: SportType = 'volleyball'): { blue: TeamStats; red: TeamStats; total: number; sport: SportType } {
  const byTeam = (team: 'blue' | 'red'): TeamStats => {
    const opponent = team === 'blue' ? 'red' : 'blue';
    const scored = pts.filter(p => p.team === team && p.type === 'scored');
    const opponentFaults = pts.filter(p => p.team === opponent && p.type === 'fault');
    const teamFaults = pts.filter(p => p.team === team && p.type === 'fault');
    return {
      scored: sport === 'basketball' ? scored.reduce((s, p) => s + (p.pointValue ?? 0), 0) : scored.length,
      faults: sport === 'basketball' ? teamFaults.length : opponentFaults.length,
      // Volleyball
      attacks: scored.filter(p => p.action === 'attack').length,
      aces: scored.filter(p => p.action === 'ace').length,
      blocks: scored.filter(p => p.action === 'block').length,
      bidouilles: scored.filter(p => p.action === 'bidouille').length,
      secondeMains: scored.filter(p => p.action === 'seconde_main').length,
      otherOffensive: scored.filter(p => p.action === 'other_offensive').length,
      outs: opponentFaults.filter(p => p.action === 'out').length,
      netFaults: opponentFaults.filter(p => p.action === 'net_fault').length,
      serviceMisses: opponentFaults.filter(p => p.action === 'service_miss').length,
      blockOuts: opponentFaults.filter(p => p.action === 'block_out').length,
      // Basketball
      scoredPoints: scored.reduce((s, p) => s + (p.pointValue ?? 0), 0),
      freeThrows: scored.filter(p => p.action === 'free_throw').length,
      twoPoints: scored.filter(p => p.action === 'two_points').length,
      threePoints: scored.filter(p => p.action === 'three_points').length,
      missedShots: teamFaults.filter(p => p.action === 'missed_shot').length,
      turnovers: teamFaults.filter(p => p.action === 'turnover').length,
      foulsCommitted: teamFaults.filter(p => p.action === 'foul_committed').length,
    };
  };
  return { blue: byTeam('blue'), red: byTeam('red'), total: pts.length, sport };
}

export function HeatmapView({ points, completedSets, currentSetPoints, currentSetNumber, stats, teamNames, players = [], sport = 'volleyball', matchId, isLoggedIn }: HeatmapViewProps) {
  const isBasketball = sport === 'basketball';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [setFilter_, setSetFilter] = useState<SetFilter>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCourt, setShowCourt] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Build list of exports: all sets + each individual set
      const exports: { label: string; filename: string; pts: Point[] }[] = [
        { label: 'Tous les sets', filename: `stats-${teamNames.blue}-vs-${teamNames.red}-global`, pts: points },
      ];
      completedSets.forEach(s => {
        exports.push({
          label: `Set ${s.number}`,
          filename: `stats-${teamNames.blue}-vs-${teamNames.red}-set${s.number}`,
          pts: s.points,
        });
      });
      if (currentSetPoints.length > 0) {
        exports.push({
          label: `Set ${currentSetNumber} (en cours)`,
          filename: `stats-${teamNames.blue}-vs-${teamNames.red}-set${currentSetNumber}`,
          pts: currentSetPoints,
        });
      }

      for (const exp of exports) {
        const ds = computeStats(exp.pts, sport);
        const container = buildExportContainer(teamNames, exp.label, ds, sport);
        document.body.appendChild(container);
        const canvas = await html2canvas(container, { backgroundColor: '#1a1a2e', scale: 2 });
        document.body.removeChild(container);
        const link = document.createElement('a');
        link.download = `${exp.filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [teamNames, points, completedSets, currentSetPoints, currentSetNumber]);

  const exportCourtPng = useCallback(async (pts: Point[], label: string) => {
    const ACTION_SHORT: Record<string, string> = {
      attack: 'A', ace: 'As', block: 'B', bidouille: 'Bi', seconde_main: '2M',
      out: 'O', net_fault: 'F', service_miss: 'SL', block_out: 'BO', other_offensive: '',
    };
    // Build an offscreen SVG-based court with points
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 440');
    svg.setAttribute('width', '600');
    svg.setAttribute('height', '440');
    svg.style.display = 'block';

    // Title bar
    const titleRect = document.createElementNS(svgNS, 'rect');
    titleRect.setAttribute('x', '0'); titleRect.setAttribute('y', '0');
    titleRect.setAttribute('width', '600'); titleRect.setAttribute('height', '40');
    titleRect.setAttribute('fill', '#1a1a2e');
    svg.appendChild(titleRect);
    const titleText = document.createElementNS(svgNS, 'text');
    titleText.setAttribute('x', '300'); titleText.setAttribute('y', '26');
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('fill', 'white'); titleText.setAttribute('font-size', '14');
    titleText.setAttribute('font-weight', 'bold');
    titleText.textContent = `🏐 ${teamNames.blue} vs ${teamNames.red} — ${label}`;
    svg.appendChild(titleText);

    // Court background
    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '40');
    bg.setAttribute('width', '600'); bg.setAttribute('height', '400');
    bg.setAttribute('fill', 'hsl(142, 40%, 28%)');
    svg.appendChild(bg);

    // Court border
    const border = document.createElementNS(svgNS, 'rect');
    border.setAttribute('x', '20'); border.setAttribute('y', '60');
    border.setAttribute('width', '560'); border.setAttribute('height', '360');
    border.setAttribute('fill', 'none'); border.setAttribute('stroke', 'white');
    border.setAttribute('stroke-width', '2'); border.setAttribute('opacity', '0.9');
    svg.appendChild(border);

    // Net
    const net = document.createElementNS(svgNS, 'line');
    net.setAttribute('x1', '300'); net.setAttribute('y1', '60');
    net.setAttribute('x2', '300'); net.setAttribute('y2', '420');
    net.setAttribute('stroke', 'white'); net.setAttribute('stroke-width', '3');
    svg.appendChild(net);

    // Attack lines
    for (const lx of [200, 400]) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(lx)); line.setAttribute('y1', '60');
      line.setAttribute('x2', String(lx)); line.setAttribute('y2', '420');
      line.setAttribute('stroke', 'white'); line.setAttribute('stroke-width', '1.5');
      line.setAttribute('opacity', '0.6');
      svg.appendChild(line);
    }

    // Points
    pts.forEach(p => {
      const cx = p.x * 600;
      const cy = p.y * 400 + 40;
      const color = p.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
      const isFault = p.type === 'fault';
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', String(cx)); circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '9'); circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', isFault ? '2' : '1.5');
      circle.setAttribute('fill', isFault ? 'transparent' : color);
      circle.setAttribute('opacity', '0.85');
      if (isFault) circle.setAttribute('stroke-dasharray', '3 2');
      svg.appendChild(circle);
      const al = ACTION_SHORT[p.action] ?? '';
      if (al) {
        const txt = document.createElementNS(svgNS, 'text');
        txt.setAttribute('x', String(cx)); txt.setAttribute('y', String(cy + 4));
        txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('fill', isFault ? color : 'white');
        txt.setAttribute('font-size', '10'); txt.setAttribute('font-weight', 'bold');
        txt.textContent = al;
        svg.appendChild(txt);
      }
    });

    container.appendChild(svg);
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { backgroundColor: '#1a1a2e', scale: 2 });
      const link = document.createElement('a');
      link.download = `terrain-${teamNames.blue}-vs-${teamNames.red}-${label.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  }, [teamNames]);

  const getScoreText = useCallback(() => {
    const allSets = [...completedSets];
    const setsBlue = allSets.filter(s => s.winner === 'blue').length;
    const setsRed = allSets.filter(s => s.winner === 'red').length;
    const details = allSets.map(s => `${s.score.blue}-${s.score.red}`).join(', ');
    let text = `🏐 Match : ${teamNames.blue} vs ${teamNames.red}\n📊 Score Sets : ${setsBlue}-${setsRed}`;
    if (details) text += `\n📋 Détails : ${details}`;
    if (currentSetPoints.length > 0) {
      const blueNow = currentSetPoints.filter(p => p.team === 'blue').length;
      const redNow = currentSetPoints.filter(p => p.team === 'red').length;
      text += `\n⏳ Set ${currentSetNumber} en cours : ${blueNow}-${redNow}`;
    }
    return text;
  }, [completedSets, currentSetPoints, currentSetNumber, teamNames]);

  const copyScoreText = useCallback(() => {
    navigator.clipboard.writeText(getScoreText());
  }, [getScoreText]);

  const shareToWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getScoreText())}`, '_blank');
  }, [getScoreText]);

  const shareToTelegram = useCallback(() => {
    window.open(`https://t.me/share/url?text=${encodeURIComponent(getScoreText())}`, '_blank');
  }, [getScoreText]);

  const shareToX = useCallback(() => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(getScoreText())}`, '_blank');
  }, [getScoreText]);

  const shareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: getScoreText() });
      } catch {}
    } else {
      copyScoreText();
    }
  }, [getScoreText, copyScoreText]);

  const [generatingLink, setGeneratingLink] = useState(false);
  const shareMatchLink = useCallback(async () => {
    if (!matchId || !isLoggedIn) {
      toast.error('Connectez-vous pour générer un lien de partage');
      return;
    }
    setGeneratingLink(true);
    try {
      const token = await generateShareToken(matchId);
      if (!token) { toast.error('Erreur lors de la génération du lien'); return; }
      const url = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier !');
    } finally {
      setGeneratingLink(false);
    }
  }, [matchId, isLoggedIn]);

  const filteredPoints = useMemo(() => {
    if (setFilter_ === 'all') return points;
    // Check completed sets first (avoids returning empty currentSetPoints for a finished set)
    const set = completedSets.find(s => s.number === setFilter_);
    if (set) return set.points;
    if (setFilter_ === currentSetNumber) return currentSetPoints;
    return [];
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_]);

  // Heatmap: only scored points, normalized so blue always RIGHT, red always LEFT
  const heatmapPoints = useMemo(() => {
    // Volleyball: only 'scored' points; Basketball: only scored (baskets)
    const scoredOnly = filteredPoints.filter(p => p.type === 'scored');
    return scoredOnly.map(p => {
      const isBlue = p.team === 'blue';
      let nx = p.x;
      // Blue scored → always right side (x > 0.5)
      if (isBlue && nx < 0.5) nx = 1 - nx;
      // Red scored → always left side (x < 0.5)
      if (!isBlue && nx > 0.5) nx = 1 - nx;
      return { ...p, x: nx };
    });
  }, [filteredPoints]);

  const displayStats = useMemo(() => {
    return computeStats(filteredPoints, sport);
  }, [filteredPoints, sport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'hsl(142, 40%, 28%)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 10);
    ctx.lineTo(width / 2, height - 10);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.333, 10);
    ctx.lineTo(width * 0.333, height - 10);
    ctx.moveTo(width * 0.667, 10);
    ctx.lineTo(width * 0.667, height - 10);
    ctx.stroke();

    if (heatmapPoints.length === 0) return;

    const radius = 40;
    heatmapPoints.forEach(point => {
      const x = point.x * width;
      const y = point.y * height;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const hue = point.team === 'blue' ? '217, 91%, 60%' : '0, 84%, 60%';
      gradient.addColorStop(0, `hsla(${hue}, 0.6)`);
      gradient.addColorStop(0.5, `hsla(${hue}, 0.2)`);
      gradient.addColorStop(1, `hsla(${hue}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [heatmapPoints, showHeatmap]);

  const setOptions: { key: SetFilter; label: string }[] = [
    { key: 'all', label: 'Tous les sets' },
    ...completedSets.map(s => ({ key: s.number as SetFilter, label: `Set ${s.number}` })),
    ...(currentSetNumber > 0 && currentSetPoints.length > 0 ? [{ key: currentSetNumber as SetFilter, label: `Set ${currentSetNumber} (en cours)` }] : []),
  ];

  const ds = displayStats;

  return (
    <div className="space-y-4">
      <div className="space-y-4 bg-background rounded-2xl p-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-base font-black text-foreground">
            {isBasketball ? '🏀' : '🏐'} {teamNames.blue} vs {teamNames.red}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Statistiques du match</p>
        </div>

        <div className="flex gap-1.5 justify-center flex-wrap">
          {setOptions.map(o => (
            <button
              key={o.key}
              onClick={() => setSetFilter(o.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                setFilter_ === o.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Stats detail */}
        <div className="grid grid-cols-2 gap-3">
          {(['blue', 'red'] as const).map(team => (
            <div key={team} className="bg-card rounded-xl p-3 border border-border">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${team === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>
                {teamNames[team]}
              </p>
              <div className="space-y-0.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold text-xs">{isBasketball ? '🏀 Points' : '⚡ Gagnés'}</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].scored}</span>
                </div>
                {isBasketball ? (
                  <>
                    {[
                      ['Lancers francs (1pt)', ds[team].freeThrows],
                      ['Intérieur (2pts)', ds[team].twoPoints],
                      ['Extérieur (3pts)', ds[team].threePoints],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between pl-2">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      ['Attaques', ds[team].attacks],
                      ['Aces', ds[team].aces],
                      ['Blocks', ds[team].blocks],
                      ['Bidouilles', ds[team].bidouilles],
                      ['2ndes mains', ds[team].secondeMains],
                      ['Autres', ds[team].otherOffensive],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between pl-2">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground font-semibold text-xs">{isBasketball ? '❌ Actions négatives' : '❌ Fautes commises'}</span>
                  <span className="font-bold text-destructive text-xs">{ds[team].faults}</span>
                </div>
                {isBasketball ? (
                  <>
                    {[
                      ['Tirs manqués', ds[team].missedShots],
                      ['Pertes de balle', ds[team].turnovers],
                      ['Fautes commises', ds[team].foulsCommitted],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between pl-2">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      ['Out', ds[team].outs],
                      ['Filet', ds[team].netFaults],
                      ['Srv loupés', ds[team].serviceMisses],
                      ['Block Out', ds[team].blockOuts],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between pl-2">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground text-xs">Total</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].scored + ds[team].faults}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-2xl font-black text-foreground">{ds.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points totaux</p>
        </div>

        {players.length > 0 && (
          <PlayerStats points={filteredPoints} players={players} teamName={teamNames.blue} sport={sport} />
        )}

        {showHeatmap && (
          <div>
            <p className="text-[10px] text-center text-muted-foreground mb-1">Heatmap — 🔵 Points marqués (droite) · 🔴 Points pris (gauche)</p>
            <div className="rounded-xl overflow-hidden">
              <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto" />
            </div>
          </div>
        )}


      </div>

      {setFilter_ !== 'all' && showTimeline && (
        <PointTimeline points={filteredPoints} teamNames={teamNames} />
      )}

      {setFilter_ !== 'all' && showCourt && (
        <div className="space-y-1">
          <p className="text-[10px] text-center text-muted-foreground">
            Terrain — {setOptions.find(o => o.key === setFilter_)?.label}
          </p>
          <CourtDisplay points={filteredPoints} teamNames={teamNames} sport={sport} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {setFilter_ !== 'all' && (
          <button
            onClick={() => setShowTimeline(prev => !prev)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {showTimeline ? 'Masquer l\'historique' : 'Afficher l\'historique'}
          </button>
        )}
        {setFilter_ !== 'all' && (
          <button
            onClick={() => setShowCourt(prev => !prev)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {showCourt ? 'Masquer le terrain' : 'Afficher le terrain'}
          </button>
        )}
        <button
          onClick={() => setShowHeatmap(prev => !prev)}
          className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        >
          {showHeatmap ? 'Masquer la Heatmap' : 'Afficher la Heatmap'}
        </button>
      </div>

      {/* Export & Share buttons */}
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Download size={16} />
              Export
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Images PNG</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExport} disabled={exporting} className="cursor-pointer">
              <Image size={14} className="mr-2" />
              {exporting ? 'Export en cours...' : 'Exporter stats (PNG)'}
            </DropdownMenuItem>
            {completedSets.map(s => (
              <DropdownMenuItem key={`court-${s.number}`} onClick={() => exportCourtPng(s.points, `Set ${s.number}`)} className="cursor-pointer">
                <Map size={14} className="mr-2" />
                Terrain Set {s.number} (PNG)
              </DropdownMenuItem>
            ))}
            {currentSetPoints.length > 0 && (
              <DropdownMenuItem onClick={() => exportCourtPng(currentSetPoints, `Set ${currentSetNumber} (en cours)`)} className="cursor-pointer">
                <Map size={14} className="mr-2" />
                Terrain Set {currentSetNumber} en cours (PNG)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportMatchToExcel(completedSets, currentSetPoints, currentSetNumber, teamNames, players, sport)} className="cursor-pointer">
              <FileSpreadsheet size={14} className="mr-2" />
              Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
              <Share2 size={16} />
              Partager
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuItem onClick={shareNative} className="cursor-pointer">
              <Share2 size={14} className="mr-2" />
              Partager…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shareToWhatsApp} className="cursor-pointer">
              <span className="mr-2 text-sm">💬</span>
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToTelegram} className="cursor-pointer">
              <span className="mr-2 text-sm">✈️</span>
              Telegram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareToX} className="cursor-pointer">
              <span className="mr-2 text-sm">𝕏</span>
              X (Twitter)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyScoreText} className="cursor-pointer">
              <Copy size={14} className="mr-2" />
              Copier le score
            </DropdownMenuItem>
            {matchId && isLoggedIn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={shareMatchLink} disabled={generatingLink} className="cursor-pointer">
                  <LinkIcon size={14} className="mr-2" />
                  {generatingLink ? 'Génération...' : '🔗 Lien de partage'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-[8px] text-muted-foreground/50 text-center">My Volley · Capbreton</p>
    </div>
  );
}
