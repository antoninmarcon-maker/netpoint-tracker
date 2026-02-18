import { useRef, useEffect, useState, useMemo } from 'react';
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

type Filter = 'all' | 'blue' | 'red';
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
  const [filter, setFilter] = useState<Filter>('all');
  const [setFilter_, setSetFilter] = useState<SetFilter>('all');

  const displayPoints = useMemo(() => {
    let pts: Point[];
    if (setFilter_ === 'all') {
      pts = points;
    } else if (setFilter_ === currentSetNumber) {
      pts = currentSetPoints;
    } else {
      const set = completedSets.find(s => s.number === setFilter_);
      pts = set ? set.points : [];
    }
    if (filter === 'all') return pts;
    return pts.filter(p => p.team === filter);
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_, filter]);

  const displayStats = useMemo(() => {
    if (setFilter_ === 'all') return computeStats(points);
    if (setFilter_ === currentSetNumber) return computeStats(currentSetPoints);
    const set = completedSets.find(s => s.number === setFilter_);
    return computeStats(set ? set.points : []);
  }, [points, completedSets, currentSetPoints, currentSetNumber, setFilter_]);

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

    if (displayPoints.length === 0) return;

    const radius = 40;
    displayPoints.forEach(point => {
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
  }, [displayPoints]);

  const setOptions: { key: SetFilter; label: string }[] = [
    { key: 'all', label: 'Tous les sets' },
    ...completedSets.map(s => ({ key: s.number as SetFilter, label: `Set ${s.number}` })),
    ...(currentSetNumber > 0 ? [{ key: currentSetNumber as SetFilter, label: `Set ${currentSetNumber} (en cours)` }] : []),
  ];

  const ds = displayStats;

  return (
    <div className="space-y-4">
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

      {/* Team filter */}
      <div className="flex gap-2 justify-center">
        {([
          { key: 'all' as Filter, label: 'Tous' },
          { key: 'blue' as Filter, label: `🔵 ${teamNames.blue}` },
          { key: 'red' as Filter, label: `🔴 ${teamNames.red}` },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              filter === f.key
                ? f.key === 'blue'
                  ? 'bg-team-blue text-team-blue-foreground'
                  : f.key === 'red'
                  ? 'bg-team-red text-team-red-foreground'
                  : 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Heatmap */}
      <div className="rounded-xl overflow-hidden">
        <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto" />
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
    </div>
  );
}
