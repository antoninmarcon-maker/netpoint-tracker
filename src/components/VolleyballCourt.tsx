import { useRef, useCallback } from 'react';
import { Point, Team } from '@/types/volleyball';

interface VolleyballCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  onCourtClick: (x: number, y: number) => void;
}

export function VolleyballCourt({ points, selectedTeam, onCourtClick }: VolleyballCourtProps) {
  const courtRef = useRef<SVGSVGElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!selectedTeam || !courtRef.current) return;
      const rect = courtRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      onCourtClick(x, y);
    },
    [selectedTeam, onCourtClick]
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!selectedTeam || !courtRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = courtRef.current.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      onCourtClick(x, y);
    },
    [selectedTeam, onCourtClick]
  );

  return (
    <div className={`relative rounded-xl overflow-hidden transition-all ${selectedTeam ? 'ring-2 ring-primary cursor-crosshair' : ''}`}>
      <svg
        ref={courtRef}
        viewBox="0 0 400 600"
        className="w-full h-auto"
        onClick={handleClick}
        onTouchStart={handleTouch}
      >
        {/* Court background */}
        <rect x="0" y="0" width="400" height="600" rx="8" fill="hsl(142, 40%, 28%)" />

        {/* Court border */}
        <rect x="20" y="20" width="360" height="560" rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />

        {/* Net (center line) */}
        <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeWidth="3" />
        <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />

        {/* Attack lines (3m lines) */}
        <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="20" y1="400" x2="380" y2="400" stroke="white" strokeWidth="1.5" opacity="0.6" />

        {/* Center marks */}
        <line x1="200" y1="20" x2="200" y2="580" stroke="white" strokeWidth="0.5" opacity="0.15" />

        {/* Team labels */}
        <text x="200" y="160" textAnchor="middle" fill="hsl(217, 91%, 60%)" fontSize="14" fontWeight="bold" opacity="0.6">
          BLEUE
        </text>
        <text x="200" y="460" textAnchor="middle" fill="hsl(0, 84%, 60%)" fontSize="14" fontWeight="bold" opacity="0.6">
          ROUGE
        </text>

        {/* Point markers */}
        {points.map((point) => {
          const cx = point.x * 400;
          const cy = point.y * 600;
          const color = point.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
          const isFault = point.type === 'fault';
          return (
            <g key={point.id} className="animate-point-drop">
              <circle
                cx={cx}
                cy={cy}
                r={isFault ? 8 : 10}
                fill={color}
                opacity={0.85}
                stroke="white"
                strokeWidth={isFault ? 1 : 1.5}
              />
              {isFault && (
                <>
                  <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke="white" strokeWidth="1.5" />
                  <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke="white" strokeWidth="1.5" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
