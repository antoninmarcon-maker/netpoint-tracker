import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Download, ChevronDown, Copy, Image, FileSpreadsheet, Map, Share2, Link as LinkIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Point, SetData, Player, isOffensiveAction, SportType, OFFENSIVE_ACTIONS, FAULT_ACTIONS, getSportIcon } from '@/types/sports';
import { PointTimeline } from './PointTimeline';
import { CourtDisplay } from './CourtDisplay';
import { PlayerStats } from './PlayerStats';
import { exportMatchToExcel } from '@/lib/excelExport';
import { generateShareToken } from '@/lib/cloudStorage';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

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
  hasCourt?: boolean;
  onSelectPoint?: (index: number) => void;
  viewingPointIndex?: number | null;
  showRatings?: boolean;
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

function buildExportContainer(teamNames: { blue: string; red: string }, label: string, ds: ReturnType<typeof computeStats>): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;';
  container.className = 'bg-background rounded-2xl p-4 space-y-3';

  const header = createStyledEl('div', { textAlign: 'center' });
  const title = createStyledEl('p', { fontSize: '16px', fontWeight: '900', color: 'hsl(var(--foreground))' });
  title.textContent = `🏐 ${teamNames.blue} vs ${teamNames.red}`;
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
    statsEl.appendChild(createStatRow('⚡ Gagnés', ds[team].scored, { bold: true }));
    const scoredRows: [string, number][] = [
      ['Attaques', ds[team].attacks], ['Aces', ds[team].aces], ['Blocks', ds[team].blocks],
      ['Bidouilles', ds[team].bidouilles], ['2ndes mains', ds[team].secondeMains], ['Autres', ds[team].otherOffensive],
    ];
    for (const [l, v] of scoredRows) statsEl.appendChild(createStatRow(l, v, { indent: true }));
    statsEl.appendChild(createStatRow('❌ Fautes adv.', ds[team].faults, { bold: true, borderTop: true, valueColor: 'hsl(var(--destructive))' }));
    const faultRows: [string, number][] = [
      ['Out', ds[team].outs], ['Filet', ds[team].netFaults], ['Srv loupés', ds[team].serviceMisses], ['Block Out', ds[team].blockOuts],
    ];
    for (const [l, v] of faultRows) statsEl.appendChild(createStatRow(l, v, { indent: true }));
    if (ds[team].neutral > 0) {
      statsEl.appendChild(createStatRow('📊 Faits de jeu', ds[team].neutral, { borderTop: true }));
    }
    if (Object.keys(ds[team].customStats).length > 0) {
      statsEl.appendChild(createStatRow('✨ Personnalisés', '', { borderTop: true, bold: true }));
      for (const [l, v] of Object.entries(ds[team].customStats)) {
        statsEl.appendChild(createStatRow(l, v, { indent: true }));
      }
    }
    statsEl.appendChild(createStatRow('Total', ds[team].scored + ds[team].faults + ds[team].neutral, { borderTop: true }));
    card.appendChild(statsEl);
    grid.appendChild(card);
  }
  container.appendChild(grid);

  container.appendChild(createStyledEl('p', { fontSize: '8px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', opacity: '0.5' }, 'My Volley · my-volley.com'));
  return container;
}

interface ActionRating {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface TeamStats {
  scored: number; faults: number; neutral: number; customNeutralCount: number;
  attacks: number; aces: number; blocks: number; bidouilles: number; secondeMains: number; otherOffensive: number;
  outs: number; netFaults: number; serviceMisses: number; blockOuts: number;
  customStats: Record<string, number>;
  neutralBreakdown: Record<string, number>;
  ratingsPositive: number; ratingsNeutral: number; ratingsNegative: number;
  actionRatings: Record<string, ActionRating>;
}

function computeStats(pts: Point[]): { blue: TeamStats; red: TeamStats; total: number } {
  const byTeam = (team: 'blue' | 'red'): TeamStats => {
    const opponent = team === 'blue' ? 'red' : 'blue';

    const actionRatings: Record<string, ActionRating> = {};
    const customStats: Record<string, number> = {};
    const neutralBreakdown: Record<string, number> = {};
    let scoredTotal = 0;
    let faultTotal = 0;
    let neutralTotal = 0;
    let attacks = 0;
    let aces = 0;
    let blocks = 0;
    let bidouilles = 0;
    let secondeMains = 0;
    let otherOffensive = 0;
    let outs = 0;
    let netFaults = 0;
    let serviceMisses = 0;
    let blockOuts = 0;
    let ratingsPositive = 0;
    let ratingsNeutral = 0;
    let ratingsNegative = 0;

    pts.forEach(p => {
      const actionsToProcess = (p.rallyActions && p.rallyActions.length > 0)
        ? p.rallyActions
        : [{
          team: p.team,
          type: p.type,
          action: p.action,
          customActionLabel: p.customActionLabel,
          rating: p.rating,
        }];

      actionsToProcess.forEach(a => {
        const isNeutral = a.type === 'neutral' && a.team === team;
        const isScoredByUs = a.type === 'scored' && a.team === team;
        const isFaultByOpponent = a.type === 'fault' && a.team === opponent;

        const isOurAction = isNeutral || isScoredByUs || isFaultByOpponent;
        if (isOurAction && 'rating' in a && a.rating) {
          if (a.rating === 'positive') ratingsPositive++;
          else if (a.rating === 'neutral') ratingsNeutral++;
          else if (a.rating === 'negative') ratingsNegative++;

          const actionLabel = a.customActionLabel || a.action;
          if (!actionRatings[actionLabel]) actionRatings[actionLabel] = { positive: 0, neutral: 0, negative: 0, total: 0 };
          actionRatings[actionLabel][a.rating]++;
          actionRatings[actionLabel].total++;
        }

        if (isNeutral) {
          neutralTotal++;
          const label = a.customActionLabel || a.action;
          neutralBreakdown[label] = (neutralBreakdown[label] || 0) + 1;
        } else if (isScoredByUs) {
          scoredTotal++;
          if (a.action === 'attack') attacks++;
          else if (a.action === 'ace') aces++;
          else if (a.action === 'block') blocks++;
          else if (a.action === 'bidouille') bidouilles++;
          else if (a.action === 'seconde_main') secondeMains++;
          else if (a.action === 'other_offensive') otherOffensive++;

          if (a.customActionLabel) {
            customStats[a.customActionLabel] = (customStats[a.customActionLabel] || 0) + 1;
          }
        } else if (isFaultByOpponent) {
          faultTotal++;
          if (a.action === 'out') outs++;
          else if (a.action === 'net_fault') netFaults++;
          else if (a.action === 'service_miss') serviceMisses++;
          else if (a.action === 'block_out') blockOuts++;

          if (a.customActionLabel) {
            customStats[a.customActionLabel] = (customStats[a.customActionLabel] || 0) + 1;
          }
        }
      });
    });

    const customNeutralCount = neutralTotal;

    return {
      scored: scoredTotal,
      neutral: neutralTotal,
      customNeutralCount,
      faults: faultTotal,
      attacks, aces, blocks, bidouilles, secondeMains, otherOffensive,
      outs, netFaults, serviceMisses, blockOuts,
      customStats, neutralBreakdown,
      ratingsPositive, ratingsNeutral, ratingsNegative, actionRatings,
    };
  };

  // Total display on bottom card (points scored in match)
  const scoreTotal = pts.filter(p => p.type !== 'neutral').length;

  return { blue: byTeam('blue'), red: byTeam('red'), total: scoreTotal };
}

export function HeatmapView({ points, completedSets, currentSetPoints, currentSetNumber, stats, teamNames, players = [], sport = 'volleyball', matchId, isLoggedIn, hasCourt = true, onSelectPoint, viewingPointIndex, showRatings = true }: HeatmapViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [setFilter_, setSetFilter] = useState<SetFilter>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCourt, setShowCourt] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredPoints = useMemo(() => {
    if (setFilter_ === 'all') return points;
    const set = completedSets.find(s => s.number === setFilter_);
    if (set) return set.points;
    if (setFilter_ === currentSetNumber) return currentSetPoints;
    return [];
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const label = setFilter_ === 'all'
        ? t('heatmap.allSets')
        : `Set ${setFilter_}${setFilter_ === currentSetNumber && !completedSets.some(s => s.number === setFilter_) ? ` (${t('home.setInProgress')})` : ''}`;
      const filename = `stats-${teamNames.blue}-vs-${teamNames.red}-${setFilter_ === 'all' ? 'global' : `set${setFilter_}`}`;
      const ds = computeStats(filteredPoints);
      const container = buildExportContainer(teamNames, label, ds);
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { backgroundColor: '#1a1a2e', scale: 2 });
      document.body.removeChild(container);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [teamNames, filteredPoints, setFilter_, currentSetNumber, completedSets, t]);

  const exportCourtPng = useCallback(async (pts: Point[], label: string) => {
    const ACTION_SHORT: Record<string, string> = {
      attack: 'A', ace: 'As', block: 'B', bidouille: 'Bi', seconde_main: '2M',
      out: 'O', net_fault: 'F', service_miss: 'SL', block_out: 'BO', other_offensive: '',
    };

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 440');
    svg.setAttribute('width', '600');
    svg.setAttribute('height', '440');
    svg.style.display = 'block';

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

    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '40');
    bg.setAttribute('width', '600'); bg.setAttribute('height', '400');
    bg.setAttribute('fill', 'hsl(142, 40%, 28%)');
    svg.appendChild(bg);

    const border = document.createElementNS(svgNS, 'rect');
    border.setAttribute('x', '20'); border.setAttribute('y', '60');
    border.setAttribute('width', '560'); border.setAttribute('height', '360');
    border.setAttribute('fill', 'none'); border.setAttribute('stroke', 'white');
    border.setAttribute('stroke-width', '2'); border.setAttribute('opacity', '0.9');
    svg.appendChild(border);

    const makeLine = (x1: number, y1: number, x2: number, y2: number, sw: string, op: string) => {
      const l = document.createElementNS(svgNS, 'line');
      l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1));
      l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2));
      l.setAttribute('stroke', 'white'); l.setAttribute('stroke-width', sw);
      l.setAttribute('opacity', op);
      return l;
    };

    // Volleyball court lines
    svg.appendChild(makeLine(300, 60, 300, 420, '3', '1'));
    svg.appendChild(makeLine(200, 60, 200, 420, '1.5', '0.6'));
    svg.appendChild(makeLine(400, 60, 400, 420, '1.5', '0.6'));

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
      const blueNow = currentSetPoints.filter(p => p.team === 'blue' && p.type !== 'neutral').length;
      const redNow = currentSetPoints.filter(p => p.team === 'red' && p.type !== 'neutral').length;
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
      try { await navigator.share({ text: getScoreText() }); } catch { }
    } else { copyScoreText(); }
  }, [getScoreText, copyScoreText]);

  const [generatingLink, setGeneratingLink] = useState(false);
  const [shareLinkUrl, setShareLinkUrl] = useState('');
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);

  const copyGeneratedLink = useCallback(async () => {
    if (!shareLinkUrl) return;

    try {
      await navigator.clipboard.writeText(shareLinkUrl);
      toast.success(t('heatmap.linkCopied'));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Clipboard copy failed:', error);
      toast.error(t('heatmap.linkCopyError'));
    }
  }, [shareLinkUrl, t]);

  const shareMatchLink = useCallback(async () => {
    if (!matchId || !isLoggedIn) {
      toast.error(t('heatmap.loginForLink'));
      return;
    }

    setGeneratingLink(true);
    try {
      const token = await generateShareToken(matchId);
      if (!token) {
        toast.error(t('heatmap.linkError'));
        return;
      }

      const baseUrl = 'https://www.my-volley.com';
      const url = `${baseUrl}/shared/${token}`;
      setShareLinkUrl(url);
      setShareLinkDialogOpen(true);
    } finally {
      setGeneratingLink(false);
    }
  }, [matchId, isLoggedIn, t]);

  const heatmapPoints = useMemo(() => {
    // 1. Inclure les points gagnés ET les fautes
    const validPoints = filteredPoints.filter(p => p.type === 'scored' || p.type === 'fault');

    return validPoints.map(p => {
      let nx = p.x;
      let ny = p.y;

      // 2. Si Mode Perf : forcer l'utilisation de la destination de la DERNIÈRE action
      if (p.rallyActions && p.rallyActions.length > 0) {
        const lastAction = p.rallyActions[p.rallyActions.length - 1];
        nx = lastAction.endX !== undefined ? lastAction.endX : lastAction.x;
        ny = lastAction.endY !== undefined ? lastAction.endY : lastAction.y;
      }

      // Normalisation de la position en fonction du côté du terrain
      const isBlue = p.team === 'blue';
      if (isBlue && nx < 0.5) nx = 1 - nx;
      if (!isBlue && nx > 0.5) nx = 1 - nx;

      return { ...p, x: nx, y: ny };
    });
  }, [filteredPoints]);

  const displayStats = useMemo(() => computeStats(filteredPoints), [filteredPoints]);

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
    { key: 'all', label: t('heatmap.allSets') },
    ...completedSets.map(s => ({ key: s.number as SetFilter, label: t('heatmap.set', { n: s.number }) })),
    ...(currentSetNumber > 0 && currentSetPoints.length > 0 ? [{ key: currentSetNumber as SetFilter, label: t('heatmap.setInProgress', { n: currentSetNumber }) }] : []),
  ];

  const ds = displayStats;

  return (
    <div className="space-y-4">
      <div className="space-y-4 bg-background rounded-2xl p-4">
        <div className="text-center space-y-1">
          <p className="text-base font-black text-foreground">
            🏐 {teamNames.blue} vs {teamNames.red}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('heatmap.matchStats')}</p>
        </div>

        <div className="flex gap-1.5 justify-center flex-wrap">
          {setOptions.map(o => (
            <button
              key={o.key}
              onClick={() => setSetFilter(o.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${setFilter_ === o.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['blue', 'red'] as const).map(team => (
            <div key={team} className="bg-card rounded-xl p-3 border border-border">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${team === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>
                {teamNames[team]}
              </p>
              <div className="space-y-0.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold text-xs">{t('heatmap.scored')}</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].scored}</span>
                </div>
                {[
                  [t('heatmap.attacks'), ds[team].attacks],
                  [t('heatmap.aces'), ds[team].aces],
                  [t('heatmap.blocks'), ds[team].blocks],
                  [t('heatmap.bidouilles'), ds[team].bidouilles],
                  [t('heatmap.secondeMains'), ds[team].secondeMains],
                  [t('heatmap.others'), ds[team].otherOffensive],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between pl-2">
                    <span className="text-muted-foreground text-[11px]">{label}</span>
                    <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                  </div>
                ))}

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground font-semibold text-xs">{t('heatmap.faults')}</span>
                  <span className="font-bold text-destructive text-xs">{ds[team].faults}</span>
                </div>
                {[
                  [t('heatmap.outs'), ds[team].outs],
                  [t('heatmap.netFaults'), ds[team].netFaults],
                  [t('heatmap.serviceMisses'), ds[team].serviceMisses],
                  [t('heatmap.blockOuts'), ds[team].blockOuts],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between pl-2">
                    <span className="text-muted-foreground text-[11px]">{label}</span>
                    <span className="font-bold text-foreground text-[11px]">{val as number}</span>
                  </div>
                ))}

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground font-semibold text-xs text-primary/80">Faits de jeu</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].neutral}</span>
                </div>
                {Object.entries(ds[team].neutralBreakdown).map(([label, val]) => (
                  <div key={label} className="flex justify-between pl-2">
                    <span className="text-muted-foreground text-[11px]">{t(`actionsDesc.${label}`, label)}</span>
                    <span className="font-bold text-foreground text-[11px]">{val}</span>
                  </div>
                ))}
                {Object.keys(ds[team].customStats).length > 0 && (
                  <>
                    <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                      <span className="text-muted-foreground font-semibold text-[11px]">✨ Personnalisés</span>
                    </div>
                    {Object.entries(ds[team].customStats).map(([label, val]) => (
                      <div key={label} className="flex justify-between pl-2">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-bold text-foreground text-[11px]">{val}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground text-xs">{t('common.total')}</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].scored + ds[team].faults + ds[team].neutral}</span>
                </div>

                {(ds[team].ratingsPositive > 0 || ds[team].ratingsNeutral > 0 || ds[team].ratingsNegative > 0) && (
                  <div className="border-t border-border pt-1 mt-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold text-xs">Notations</span>
                      <div className="flex items-center gap-2">
                        {ds[team].ratingsPositive > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-[11px] font-bold text-green-500">{ds[team].ratingsPositive}</span>
                          </span>
                        )}
                        {ds[team].ratingsNeutral > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-[11px] font-bold text-orange-500">{ds[team].ratingsNeutral}</span>
                          </span>
                        )}
                        {ds[team].ratingsNegative > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="w-2 h-2 rounded-full bg-destructive" />
                            <span className="text-[11px] font-bold text-destructive">{ds[team].ratingsNegative}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {showRatings && Object.keys(ds[team].actionRatings).length > 0 && (
                      <div className="space-y-0.5 pl-1">
                        {Object.entries(ds[team].actionRatings).map(([action, r]) => (
                          <div key={action} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground truncate flex-1">{action}</span>
                            <div className="flex items-center gap-1.5 ml-2">
                              <span className="text-muted-foreground font-mono w-4 text-right">{r.total}</span>
                              {r.positive > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  <span className="font-semibold text-green-500">{r.positive}</span>
                                </span>
                              )}
                              {r.neutral > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  <span className="font-semibold text-orange-500">{r.neutral}</span>
                                </span>
                              )}
                              {r.negative > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                  <span className="font-semibold text-destructive">{r.negative}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {players.length > 0 && (
          <PlayerStats points={filteredPoints} players={players} teamName={teamNames.blue} sport={sport} matchId={matchId} showRatings={showRatings} />
        )}

        {hasCourt && showHeatmap && (
          <div>
            <p className="text-[10px] text-center text-muted-foreground mb-1">{t('heatmap.heatmapLabel')}</p>
            <div className="rounded-xl overflow-hidden">
              <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto" />
            </div>
          </div>
        )}
      </div>

      {setFilter_ !== 'all' && showTimeline && (
        <PointTimeline points={filteredPoints} teamNames={teamNames} onSelectPoint={onSelectPoint} viewingPointIndex={viewingPointIndex} />
      )}

      {hasCourt && setFilter_ !== 'all' && showCourt && (
        <div className="space-y-1">
          <p className="text-[10px] text-center text-muted-foreground">
            {t('heatmap.court')} — {setOptions.find(o => o.key === setFilter_)?.label}
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
            {showTimeline ? t('heatmap.hideTimeline') : t('heatmap.showTimeline')}
          </button>
        )}
        {hasCourt && setFilter_ !== 'all' && (
          <button
            onClick={() => setShowCourt(prev => !prev)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {showCourt ? t('heatmap.hideCourt') : t('heatmap.showCourt')}
          </button>
        )}
        {hasCourt && (
          <button
            onClick={() => setShowHeatmap(prev => !prev)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {showHeatmap ? t('heatmap.hideHeatmap') : t('heatmap.showHeatmap')}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Download size={16} />
              {t('heatmap.export')}
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('heatmap.pngImages')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExport} disabled={exporting} className="cursor-pointer">
              <Image size={14} className="mr-2" />
              {exporting ? t('heatmap.exporting') : t('heatmap.exportStatsPng', { suffix: setFilter_ !== 'all' ? ` — Set ${setFilter_}` : '' })}
            </DropdownMenuItem>
            {hasCourt && setFilter_ !== 'all' && (
              <DropdownMenuItem onClick={() => exportCourtPng(filteredPoints, `Set ${setFilter_}${setFilter_ === currentSetNumber && !completedSets.some(s => s.number === setFilter_) ? ` (${t('home.setInProgress')})` : ''}`)} className="cursor-pointer">
                <Map size={14} className="mr-2" />
                {t('heatmap.courtSetPng', { n: setFilter_ })}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportMatchToExcel(completedSets, currentSetPoints, currentSetNumber, teamNames, players, sport)} className="cursor-pointer">
              <FileSpreadsheet size={14} className="mr-2" />
              {t('heatmap.excelXlsx')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
              <Share2 size={16} />
              {t('common.share')}
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border border-border shadow-lg z-50">
            <DropdownMenuItem onClick={shareNative} className="cursor-pointer">
              <Share2 size={14} className="mr-2" />
              {t('heatmap.shareDots')}
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
              {t('heatmap.copyScore')}
            </DropdownMenuItem>
            {matchId && isLoggedIn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); shareMatchLink(); }} disabled={generatingLink} className="cursor-pointer">
                  <LinkIcon size={14} className="mr-2" />
                  {generatingLink ? t('heatmap.generatingLink') : t('heatmap.shareLink')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={shareLinkDialogOpen} onOpenChange={setShareLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('heatmap.linkReadyTitle')}</DialogTitle>
            <DialogDescription>{t('heatmap.linkReadyDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              readOnly
              value={shareLinkUrl}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={copyGeneratedLink}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('heatmap.copyLink')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!shareLinkUrl) return;
                  window.open(shareLinkUrl, '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                {t('heatmap.openSharedPage')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
