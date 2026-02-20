import { Point, SportType } from '@/types/sports';

interface CourtDisplayProps {
  points: Point[];
  teamNames: { blue: string; red: string };
  sport?: SportType;
}

const VOLLEY_ACTION_SHORT: Record<string, string> = {
  attack: 'A', ace: 'As', block: 'B', bidouille: 'Bi', seconde_main: '2M',
  out: 'O', net_fault: 'F', service_miss: 'SL', block_out: 'BO',
  other_offensive: '',
};

const BASKET_ACTION_SHORT: Record<string, string> = {
  free_throw: '1', two_points: '2', three_points: '3',
  missed_shot: 'X', turnover: 'T', foul_committed: 'F',
};

const TENNIS_ACTION_SHORT: Record<string, string> = {
  tennis_ace: 'As', winner_forehand: 'CD', winner_backhand: 'R',
  volley_winner: 'V', smash: 'Sm', drop_shot_winner: 'Am',
  other_tennis_winner: '+',
  double_fault: 'DF', unforced_error_forehand: 'eCD', unforced_error_backhand: 'eR',
  net_error: 'F', out_long: 'OL', out_wide: 'OW',
};

const PADEL_ACTION_SHORT: Record<string, string> = {
  vibora: 'Vi', bandeja: 'Bd', smash_padel: 'Sm', volee: 'V',
  bajada: 'Bj', chiquita_winner: 'Ch', par_3: 'P3', other_padel_winner: '+',
  padel_double_fault: 'DF', padel_unforced_error: 'FD', padel_net_error: 'F',
  padel_out: 'O', grille_error: 'Gr', vitre_error: 'Vt',
};

function getActionShort(sport: SportType): Record<string, string> {
  switch (sport) {
    case 'basketball': return BASKET_ACTION_SHORT;
    case 'tennis': return TENNIS_ACTION_SHORT;
    case 'padel': return PADEL_ACTION_SHORT;
    default: return VOLLEY_ACTION_SHORT;
  }
}

function getCourtBackground(sport: SportType): string {
  switch (sport) {
    case 'basketball': return 'hsl(30, 50%, 35%)';
    case 'tennis': return 'hsl(15, 60%, 40%)';
    case 'padel': return 'hsl(210, 55%, 30%)';
    default: return 'hsl(142, 40%, 28%)';
  }
}

function CourtLines({ sport }: { sport: SportType }) {
  switch (sport) {
    case 'basketball':
      return (
        <>
          <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="2" opacity="0.8" />
          <circle cx="300" cy="200" r="40" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
          <path d="M 70 80 A 120 120 0 0 1 70 320" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="20" y1="80" x2="70" y2="80" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="20" y1="320" x2="70" y2="320" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <path d="M 530 320 A 120 120 0 0 1 530 80" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="530" y1="80" x2="580" y2="80" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="530" y1="320" x2="580" y2="320" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <circle cx="50" cy="200" r="8" fill="none" stroke="orange" strokeWidth="2" opacity="0.8" />
          <circle cx="550" cy="200" r="8" fill="none" stroke="orange" strokeWidth="2" opacity="0.8" />
        </>
      );
    case 'tennis':
      return (
        <>
          {/* Doubles border */}
          <rect x="30" y="40" width="540" height="320" fill="none" stroke="white" strokeWidth="2.5" />
          {/* Singles sidelines */}
          <line x1="30" y1="80" x2="570" y2="80" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="30" y1="320" x2="570" y2="320" stroke="white" strokeWidth="1.5" opacity="0.7" />
          {/* Net */}
          <line x1="300" y1="32" x2="300" y2="368" stroke="white" strokeWidth="3" />
          {/* Service lines */}
          <line x1="165" y1="80" x2="165" y2="320" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="435" y1="80" x2="435" y2="320" stroke="white" strokeWidth="1.5" opacity="0.7" />
          {/* Center service line */}
          <line x1="165" y1="200" x2="300" y2="200" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="300" y1="200" x2="435" y2="200" stroke="white" strokeWidth="1.5" opacity="0.7" />
        </>
      );
    case 'padel':
      return (
        <>
          {/* Back glass walls */}
          <rect x="10" y="30" width="20" height="340" fill="hsl(210, 30%, 45%)" opacity="0.4" rx="2" />
          <rect x="570" y="30" width="20" height="340" fill="hsl(210, 30%, 45%)" opacity="0.4" rx="2" />
          {/* Side walls */}
          <rect x="30" y="10" width="540" height="20" fill="hsl(210, 30%, 45%)" opacity="0.3" rx="2" />
          <rect x="30" y="370" width="540" height="20" fill="hsl(210, 30%, 45%)" opacity="0.3" rx="2" />
          {/* Grilles */}
          <rect x="220" y="10" width="160" height="20" fill="hsl(45, 50%, 50%)" opacity="0.3" rx="2" />
          <rect x="220" y="370" width="160" height="20" fill="hsl(45, 50%, 50%)" opacity="0.3" rx="2" />
          {/* Court border */}
          <rect x="30" y="30" width="540" height="340" fill="none" stroke="white" strokeWidth="2.5" />
          {/* Net */}
          <line x1="300" y1="25" x2="300" y2="375" stroke="white" strokeWidth="3" />
          {/* Service lines */}
          <line x1="165" y1="30" x2="165" y2="370" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="435" y1="30" x2="435" y2="370" stroke="white" strokeWidth="1.5" opacity="0.7" />
          {/* Center service line */}
          <line x1="165" y1="200" x2="300" y2="200" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="300" y1="200" x2="435" y2="200" stroke="white" strokeWidth="1.5" opacity="0.7" />
        </>
      );
    default: // volleyball
      return (
        <>
          <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="3" />
          <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <line x1="400" y1="20" x2="400" y2="380" stroke="white" strokeWidth="1.5" opacity="0.6" />
        </>
      );
  }
}

export function CourtDisplay({ points, teamNames, sport = 'volleyball' }: CourtDisplayProps) {
  const ACTION_SHORT = getActionShort(sport);
  const bgColor = getCourtBackground(sport);
  const isTennisOrPadel = sport === 'tennis' || sport === 'padel';

  return (
    <div className="rounded-xl overflow-hidden">
      <svg viewBox="0 0 600 400" className="w-full h-auto">
        {/* Court background */}
        <rect x="0" y="0" width="600" height="400" rx="8" fill={bgColor} />

        {/* Court border (not for tennis/padel which draw their own) */}
        {!isTennisOrPadel && (
          <rect x="20" y="20" width="560" height="360" rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />
        )}

        <CourtLines sport={sport} />

        {/* Team labels */}
        <text x="110" y="205" textAnchor="middle" fill="hsl(217, 91%, 60%)" fontSize="13" fontWeight="bold" opacity="0.5">
          {teamNames.blue}
        </text>
        <text x="490" y="205" textAnchor="middle" fill="hsl(0, 84%, 60%)" fontSize="13" fontWeight="bold" opacity="0.5">
          {teamNames.red}
        </text>

        {/* Point markers (exclude service faults and tennis/padel opponent faults — no real coordinates) */}
        {points.filter(p => {
          const serviceFaults = ['service_miss', 'double_fault', 'padel_double_fault'];
          if (serviceFaults.includes(p.action)) return false;
          if (isTennisOrPadel && p.type === 'fault') return false;
          return true;
        }).map((point) => {
          const cx = point.x * 600;
          const cy = point.y * 400;
          const color = point.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
          const isFault = point.type === 'fault';
          const actionLetter = ACTION_SHORT[point.action] ?? null;
          return (
            <g key={point.id}>
              <circle
                cx={cx} cy={cy} r={9}
                fill={isFault ? 'transparent' : color}
                opacity={0.85}
                stroke={color}
                strokeWidth={isFault ? 2 : 1.5}
                strokeDasharray={isFault ? '3 2' : 'none'}
              />
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
