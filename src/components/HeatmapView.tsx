import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Point, SetData } from '@/types/volleyball';

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

function computeStats(pts: Point[]) {
  return {
    blue: {
      scored: pts.filter(p => p.team === 'blue' && p.type === 'scored').length,
      faults: pts.filter(p => p.team === 'blue' && p.type === 'fault').length,
      services: pts.filter(p => p.team === 'blue' && p.action === 'service').length,
      attacks: pts.filter(p => p.team === 'blue' && p.action === 'attack').length,
      blocks: pts.filter(p => p.team === 'blue' && p.action === 'block_out').length,
    },
    red: {
      scored: pts.filter(p => p.team === 'red' && p.type === 'scored').length,
      faults: pts.filter(p => p.team === 'red' && p.type === 'fault').length,
      services: pts.filter(p => p.team === 'red' && p.action === 'service').length,
      attacks: pts.filter(p => p.team === 'red' && p.action === 'attack').length,
      blocks: pts.filter(p => p.team === 'red' && p.action === 'block_out').length,
    },
    total: pts.length,
  };
}

export function HeatmapView({ points, completedSets, currentSetPoints, currentSetNumber, stats, teamNames }: HeatmapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [setFilter_, setSetFilter] = useState<SetFilter>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!statsRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(statsRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `stats-${teamNames.blue}-vs-${teamNames.red}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [teamNames]);

  const filteredPoints = useMemo(() => {
    if (setFilter_ === 'all') return points;
    if (setFilter_ === currentSetNumber) return currentSetPoints;
    const set = completedSets.find(s => s.number === setFilter_);
    return set ? set.points : [];
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_]);

  // Heatmap only shows scored points (both teams)
  const heatmapPoints = useMemo(() => {
    return filteredPoints.filter(p => p.type === 'scored');
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
    ...(currentSetNumber > 0 ? [{ key: currentSetNumber as SetFilter, label: `Set ${currentSetNumber} (en cours)` }] : []),
  ];

  const ds = displayStats;

  return (
    <div className="space-y-4">
      {/* Exportable area */}
      <div ref={statsRef} className="space-y-4 bg-background p-1">
        {/* Title for export */}
        <p className="text-center text-sm font-bold text-foreground">
          {teamNames.blue} vs {teamNames.red}
        </p>

        {/* Set filter */}
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
            <div key={team} className="bg-card rounded-xl p-4 border border-border">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${team === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>
                {teamNames[team]}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points marqués</span>
                  <span className="font-bold text-foreground">{ds[team].scored}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fautes</span>
                  <span className="font-bold text-destructive">{ds[team].faults}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Services</span>
                  <span className="font-bold text-foreground">{ds[team].services}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attaques</span>
                  <span className="font-bold text-foreground">{ds[team].attacks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocks Out</span>
                  <span className="font-bold text-foreground">{ds[team].blocks}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{ds[team].scored + ds[team].faults}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-2xl font-black text-foreground">{ds.total}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Points totaux</p>
        </div>

        {/* Heatmap inside exportable area */}
        {showHeatmap && (
          <div className="rounded-xl overflow-hidden">
            <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto" />
          </div>
        )}
      </div>

      {/* Toggle heatmap */}
      <button
        onClick={() => setShowHeatmap(prev => !prev)}
        className="w-full py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
      >
        {showHeatmap ? 'Masquer la Heatmap' : 'Afficher la Heatmap'}
      </button>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
      >
        <Download size={16} />
        {exporting ? 'Export en cours...' : 'Exporter en image'}
      </button>
    </div>
  );
}
