import { useRef, useCallback } from 'react';
import { Point, Team } from '@/types/volleyball';

interface VolleyballCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  sidesSwapped: boolean;
  teamNames: { blue: string; red: string };
  onCourtClick: (x: number, y: number) => void;
}

export function VolleyballCourt({ points, selectedTeam, sidesSwapped = false, teamNames = { blue: 'Bleue', red: 'Rouge' }, onCourtClick }: VolleyballCourtProps) {
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

  const topTeam: Team = sidesSwapped ? 'red' : 'blue';
  const bottomTeam: Team = sidesSwapped ? 'blue' : 'red';

  return (
    <div className={`relative rounded-xl overflow-hidden transition-all ${selectedTeam ? 'ring-2 ring-primary cursor-crosshair' : ''}`}>
      {/* Horizontal layout: viewBox is landscape */}
      <svg
        ref={courtRef}
        viewBox="0 0 600 400"
        className="w-full h-auto"
        onClick={handleClick}
        onTouchStart={handleTouch}
      >
        {/* Court background */}
        <rect x="0" y="0" width="600" height="400" rx="8" fill="hsl(142, 40%, 28%)" />

        {/* Court border */}
        <rect x="20" y="20" width="560" height="360" rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />

        {/* Net (center vertical line) */}
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="3" />
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />

        {/* Attack lines (3m lines) */}
        <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="400" y1="20" x2="400" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />

        {/* Center horizontal guide */}
        <line x1="20" y1="200" x2="580" y2="200" stroke="white" strokeWidth="0.5" opacity="0.15" />

        {/* Team labels */}
        <text x="110" y="205" textAnchor="middle" fill={topTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.5">
          {teamNames[topTeam]}
        </text>
        <text x="490" y="205" textAnchor="middle" fill={bottomTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.5">
          {teamNames[bottomTeam]}
        </text>

        {/* Point markers */}
        {points.map((point) => {
          const cx = point.x * 600;
          const cy = point.y * 400;
          const color = point.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
          const isFault = point.type === 'fault';
          const actionLetter = point.action === 'service' ? 'S' : point.action === 'attack' ? 'A' : point.action === 'block_out' ? 'B' : null;
          return (
            <g key={point.id} className="animate-point-drop">
              <circle
                cx={cx}
                cy={cy}
                r={9}
                fill={color}
                opacity={0.85}
                stroke="white"
                strokeWidth={isFault ? 1 : 1.5}
              />
              {isFault && !actionLetter && (
                <>
                  <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} stroke="white" strokeWidth="1.5" />
                  <line x1={cx + 3.5} y1={cy - 3.5} x2={cx - 3.5} y2={cy + 3.5} stroke="white" strokeWidth="1.5" />
                </>
              )}
              {actionLetter && (
                <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{actionLetter}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
