import { Point, SportType } from '@/types/sports';

interface CourtDisplayProps {
  points: Point[];
  teamNames: { blue: string; red: string };
  sport?: SportType;
  sidesSwapped?: boolean;
}

const VOLLEY_ACTION_SHORT: Record<string, string> = {
  attack: 'A', ace: 'As', block: 'B', bidouille: 'Bi', seconde_main: '2M',
  out: 'O', net_fault: 'F', service_miss: 'SL', block_out: 'BO',
  gameplay_fault: 'FJ', opponent_fault: 'FA',
  other_offensive: '',
};

export function CourtDisplay({ points, teamNames, sidesSwapped = false }: CourtDisplayProps) {
  return (
    <div className="rounded-xl overflow-hidden">
      <svg viewBox="0 0 600 400" className="w-full h-auto">
        <rect x="0" y="0" width="600" height="400" rx="8" fill="hsl(142, 40%, 28%)" />
        <rect x="20" y="20" width="560" height="360" rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="3" />
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />
        <line x1="400" y1="20" x2="400" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />

        <text x="110" y="205" textAnchor="middle" fill={sidesSwapped ? 'hsl(0, 84%, 60%)' : 'hsl(217, 91%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.5">{sidesSwapped ? teamNames.red : teamNames.blue}</text>
        <text x="490" y="205" textAnchor="middle" fill={sidesSwapped ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.5">{sidesSwapped ? teamNames.blue : teamNames.red}</text>

        {points.filter(p => !['service_miss'].includes(p.action)).map((point) => {
          const cx = (sidesSwapped ? (1 - point.x) : point.x) * 600;
          const cy = point.y * 400;
          const color = point.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
          const isFault = point.type === 'fault';
          const actionLetter = VOLLEY_ACTION_SHORT[point.action] ?? null;
          return (
            <g key={point.id}>
              <circle cx={cx} cy={cy} r={9} fill={isFault ? 'transparent' : color} opacity={0.85} stroke={color} strokeWidth={isFault ? 2 : 1.5} strokeDasharray={isFault ? '3 2' : 'none'} />
              {isFault && !actionLetter && (
                <>
                  <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} stroke={color} strokeWidth="1.5" />
                  <line x1={cx + 3.5} y1={cy - 3.5} x2={cx - 3.5} y2={cy + 3.5} stroke={color} strokeWidth="1.5" />
                </>
              )}
              {actionLetter && (
                <text x={cx} y={cy + 4} textAnchor="middle" fill={isFault ? color : 'white'} fontSize="10" fontWeight="bold">{actionLetter}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
