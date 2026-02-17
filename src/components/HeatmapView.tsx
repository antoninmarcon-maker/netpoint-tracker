import { useRef, useEffect, useState } from 'react';
import { Point, Team } from '@/types/volleyball';

interface HeatmapViewProps {
  points: Point[];
  stats: {
    blue: { scored: number; faults: number };
    red: { scored: number; faults: number };
    total: number;
  };
}

type Filter = 'all' | 'blue' | 'red';

export function HeatmapView({ points, stats }: HeatmapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const filteredPoints = points.filter(p => {
    if (filter === 'all') return true;
    return p.team === filter;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw court background
    ctx.fillStyle = 'hsl(142, 40%, 28%)';
    ctx.roundRect(0, 0, width, height, 8);
    ctx.fill();

    // Court lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, height / 2);
    ctx.lineTo(width - 10, height / 2);
    ctx.stroke();

    // Attack lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, height * 0.333);
    ctx.lineTo(width - 10, height * 0.333);
    ctx.moveTo(10, height * 0.667);
    ctx.lineTo(width - 10, height * 0.667);
    ctx.stroke();

    if (filteredPoints.length === 0) return;

    // Draw heatmap using radial gradients
    const radius = 40;

    filteredPoints.forEach(point => {
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
  }, [filteredPoints]);

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 justify-center">
        {([
          { key: 'all', label: 'Tous' },
          { key: 'blue', label: '🔵 Bleue' },
          { key: 'red', label: '🔴 Rouge' },
        ] as { key: Filter; label: string }[]).map(f => (
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

      {/* Heatmap canvas */}
      <div className="rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="w-full h-auto"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-team-blue mb-2">Équipe Bleue</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Points marqués</span>
              <span className="font-bold text-foreground">{stats.blue.scored}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fautes</span>
              <span className="font-bold text-destructive">{stats.blue.faults}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">{stats.blue.scored + stats.blue.faults}</span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-team-red mb-2">Équipe Rouge</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Points marqués</span>
              <span className="font-bold text-foreground">{stats.red.scored}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fautes</span>
              <span className="font-bold text-destructive">{stats.red.faults}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">{stats.red.scored + stats.red.faults}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border text-center">
        <p className="text-2xl font-black text-foreground">{stats.total}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Points totaux</p>
      </div>
    </div>
  );
}
