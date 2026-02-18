import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Point, SetData, isOffensiveAction, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/volleyball';
import { PointTimeline } from './PointTimeline';

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
}

type SetFilter = 'all' | number;

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function computeStats(pts: Point[]) {
  const byTeam = (team: 'blue' | 'red') => {
    const teamPts = pts.filter(p => p.team === team);
    const scored = teamPts.filter(p => p.type === 'scored');
    const faults = teamPts.filter(p => p.type === 'fault');
    return {
      scored: scored.length,
      faults: faults.length,
      // Offensive breakdown
      attacks: scored.filter(p => p.action === 'attack').length,
      aces: scored.filter(p => p.action === 'ace').length,
      blocks: scored.filter(p => p.action === 'block').length,
      bidouilles: scored.filter(p => p.action === 'bidouille').length,
      secondeMains: scored.filter(p => p.action === 'seconde_main').length,
      otherOffensive: scored.filter(p => p.action === 'other_offensive').length,
      // Fault breakdown
      outs: faults.filter(p => p.action === 'out').length,
      netFaults: faults.filter(p => p.action === 'net_fault').length,
      serviceMisses: faults.filter(p => p.action === 'service_miss').length,
      blockOuts: faults.filter(p => p.action === 'block_out').length,
    };
  };
  return { blue: byTeam('blue'), red: byTeam('red'), total: pts.length };
}

export function HeatmapView({ points, completedSets, currentSetPoints, currentSetNumber, stats, teamNames }: HeatmapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [setFilter_, setSetFilter] = useState<SetFilter>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
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
        const ds = computeStats(exp.pts);
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;';
        container.className = 'bg-background rounded-2xl p-4 space-y-3';
        const safeBlueName = escapeHtml(teamNames.blue);
        const safeRedName = escapeHtml(teamNames.red);
        container.innerHTML = `
          <div style="text-align:center;">
            <p style="font-size:16px;font-weight:900;color:hsl(var(--foreground))">🏐 ${safeBlueName} vs ${safeRedName}</p>
            <p style="font-size:10px;color:hsl(var(--muted-foreground));text-transform:uppercase;letter-spacing:0.1em">${escapeHtml(exp.label)}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            ${(['blue', 'red'] as const).map(team => `
              <div style="background:hsl(var(--card));border-radius:12px;padding:12px;border:1px solid hsl(var(--border))">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;color:${team === 'blue' ? 'hsl(217,91%,60%)' : 'hsl(0,84%,60%)'}">${escapeHtml(teamNames[team])}</p>
                <div style="font-size:11px;color:hsl(var(--foreground))">
                  <div style="display:flex;justify-content:space-between;font-weight:700;color:hsl(var(--muted-foreground))"><span>⚡ Gagnés</span><span style="color:hsl(var(--foreground))">${ds[team].scored}</span></div>
                  ${[['Attaques', ds[team].attacks], ['Aces', ds[team].aces], ['Blocks', ds[team].blocks], ['Bidouilles', ds[team].bidouilles], ['2ndes mains', ds[team].secondeMains], ['Autres', ds[team].otherOffensive]].map(([l, v]) =>
                    `<div style="display:flex;justify-content:space-between;padding-left:8px;color:hsl(var(--muted-foreground))"><span>${l}</span><span style="font-weight:700;color:hsl(var(--foreground))">${v}</span></div>`
                  ).join('')}
                  <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid hsl(var(--border));padding-top:4px;margin-top:4px;color:hsl(var(--muted-foreground))"><span>❌ Fautes</span><span style="color:hsl(var(--destructive))">${ds[team].faults}</span></div>
                  ${[['Out', ds[team].outs], ['Filet', ds[team].netFaults], ['Srv loupés', ds[team].serviceMisses], ['Block Out', ds[team].blockOuts]].map(([l, v]) =>
                    `<div style="display:flex;justify-content:space-between;padding-left:8px;color:hsl(var(--muted-foreground))"><span>${l}</span><span style="font-weight:700;color:hsl(var(--foreground))">${v}</span></div>`
                  ).join('')}
                  <div style="display:flex;justify-content:space-between;border-top:1px solid hsl(var(--border));padding-top:4px;margin-top:4px;color:hsl(var(--muted-foreground))"><span>Total</span><span style="font-weight:700;color:hsl(var(--foreground))">${ds[team].scored + ds[team].faults}</span></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="text-align:center;background:hsl(var(--card));border-radius:12px;padding:12px;border:1px solid hsl(var(--border))">
            <p style="font-size:24px;font-weight:900;color:hsl(var(--foreground))">${ds.total}</p>
            <p style="font-size:10px;color:hsl(var(--muted-foreground));text-transform:uppercase;letter-spacing:0.1em">Points totaux</p>
          </div>
          <p style="font-size:8px;text-align:center;color:hsl(var(--muted-foreground));opacity:0.5">Volley Tracker · Capbreton</p>
        `;
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

  const filteredPoints = useMemo(() => {
    if (setFilter_ === 'all') return points;
    // Check completed sets first (avoids returning empty currentSetPoints for a finished set)
    const set = completedSets.find(s => s.number === setFilter_);
    if (set) return set.points;
    if (setFilter_ === currentSetNumber) return currentSetPoints;
    return [];
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_]);

  // Heatmap only shows offensive actions (points gagnés)
  const heatmapPoints = useMemo(() => {
    return filteredPoints.filter(p => p.type === 'scored' && isOffensiveAction(p.action));
  }, [filteredPoints]);

  const displayStats = useMemo(() => {
    return computeStats(filteredPoints);
  }, [filteredPoints]);

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
            🏐 {teamNames.blue} vs {teamNames.red}
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
                  <span className="text-muted-foreground font-semibold text-xs">⚡ Gagnés</span>
                  <span className="font-bold text-foreground text-xs">{ds[team].scored}</span>
                </div>
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

                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground font-semibold text-xs">❌ Fautes</span>
                  <span className="font-bold text-destructive text-xs">{ds[team].faults}</span>
                </div>
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

        {showHeatmap && (
          <div>
            <p className="text-[10px] text-center text-muted-foreground mb-1">Heatmap — Actions Offensives</p>
            <div className="rounded-xl overflow-hidden">
              <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto" />
            </div>
          </div>
        )}

        {/* Watermark for export */}
        <p className="text-[8px] text-muted-foreground/50 text-center">Volley Tracker · Capbreton</p>
      </div>

      {setFilter_ !== 'all' && showTimeline && (
        <PointTimeline points={filteredPoints} teamNames={teamNames} />
      )}

      <div className="flex gap-2">
        {setFilter_ !== 'all' && (
          <button
            onClick={() => setShowTimeline(prev => !prev)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {showTimeline ? 'Masquer l\'historique' : 'Afficher l\'historique'}
          </button>
        )}
        <button
          onClick={() => setShowHeatmap(prev => !prev)}
          className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        >
          {showHeatmap ? 'Masquer la Heatmap' : 'Afficher la Heatmap'}
        </button>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
      >
        <Download size={16} />
        {exporting ? 'Export en cours...' : 'Exporter toutes les stats'}
      </button>
    </div>
  );
}
