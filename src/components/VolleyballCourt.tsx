import { useRef, useCallback, useMemo } from 'react';
import { Point, Team, ActionType, PointType, isOffensiveAction } from '@/types/volleyball';

interface VolleyballCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  selectedAction: ActionType | null;
  selectedPointType: PointType | null;
  sidesSwapped: boolean;
  teamNames: { blue: string; red: string };
  onCourtClick: (x: number, y: number) => void;
}

// Court dimensions in SVG coordinates
const COURT_LEFT = 20;
const COURT_RIGHT = 580;
const COURT_TOP = 20;
const COURT_BOTTOM = 380;
const NET_X = 300;

type ZoneType = 'left_court' | 'right_court' | 'outside_left' | 'outside_right' | 'net' | 'outside_sides_left' | 'outside_sides_right' | 'none';

function getClickZone(svgX: number, svgY: number): ZoneType {
  const isInsideCourt = svgX >= COURT_LEFT && svgX <= COURT_RIGHT && svgY >= COURT_TOP && svgY <= COURT_BOTTOM;
  
  if (isInsideCourt) {
    // Net zone: within 15px of center line
    if (Math.abs(svgX - NET_X) < 15) return 'net';
    if (svgX < NET_X) return 'left_court';
    return 'right_court';
  }
  
  // Outside zones
  if (svgX < COURT_LEFT || svgX > COURT_RIGHT || svgY < COURT_TOP || svgY > COURT_BOTTOM) {
    if (svgX < NET_X) return 'outside_left';
    return 'outside_right';
  }
  
  return 'none';
}

function isZoneAllowed(
  zone: ZoneType,
  team: Team,
  action: ActionType,
  pointType: PointType,
  sidesSwapped: boolean
): boolean {
  // Determine which side is whose
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';
  const opponentCourt = opponentSide === 'left' ? 'left_court' : 'right_court';
  const ownCourt = teamSide === 'left' ? 'left_court' : 'right_court';
  const outsideOpponent = opponentSide === 'left' ? 'outside_left' : 'outside_right';
  const outsideOwn = teamSide === 'left' ? 'outside_left' : 'outside_right';

  if (isOffensiveAction(action)) {
    // Offensive: only opponent court
    return zone === opponentCourt;
  }

  // Faults
  switch (action) {
    case 'service_miss':
    case 'out':
      // Outside opponent zone
      return zone === outsideOpponent;
    case 'net_fault':
      return zone === 'net';
    case 'block_out':
      // Outside own camp (where ball rebounded after block)
      return zone === outsideOwn;
    default:
      return true;
  }
}

// Returns SVG zone rects for highlighting
function getZoneHighlights(
  team: Team,
  action: ActionType,
  pointType: PointType,
  sidesSwapped: boolean
): { allowed: { x: number; y: number; w: number; h: number }[]; isNet?: boolean } {
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  if (isOffensiveAction(action)) {
    // Opponent court
    if (opponentSide === 'right') {
      return { allowed: [{ x: NET_X, y: COURT_TOP, w: COURT_RIGHT - NET_X, h: COURT_BOTTOM - COURT_TOP }] };
    }
    return { allowed: [{ x: COURT_LEFT, y: COURT_TOP, w: NET_X - COURT_LEFT, h: COURT_BOTTOM - COURT_TOP }] };
  }

  switch (action) {
    case 'service_miss':
    case 'out': {
      // Outside opponent
      if (opponentSide === 'right') {
        return { allowed: [
          { x: COURT_RIGHT, y: 0, w: 600 - COURT_RIGHT, h: 400 },
          { x: NET_X, y: 0, w: COURT_RIGHT - NET_X, h: COURT_TOP },
          { x: NET_X, y: COURT_BOTTOM, w: COURT_RIGHT - NET_X, h: 400 - COURT_BOTTOM },
        ]};
      }
      return { allowed: [
        { x: 0, y: 0, w: COURT_LEFT, h: 400 },
        { x: COURT_LEFT, y: 0, w: NET_X - COURT_LEFT, h: COURT_TOP },
        { x: COURT_LEFT, y: COURT_BOTTOM, w: NET_X - COURT_LEFT, h: 400 - COURT_BOTTOM },
      ]};
    }
    case 'net_fault':
      return { allowed: [{ x: NET_X - 15, y: COURT_TOP, w: 30, h: COURT_BOTTOM - COURT_TOP }], isNet: true };
    case 'block_out': {
      // Outside own camp
      if (teamSide === 'left') {
        return { allowed: [
          { x: 0, y: 0, w: COURT_LEFT, h: 400 },
          { x: COURT_LEFT, y: 0, w: NET_X - COURT_LEFT, h: COURT_TOP },
          { x: COURT_LEFT, y: COURT_BOTTOM, w: NET_X - COURT_LEFT, h: 400 - COURT_BOTTOM },
        ]};
      }
      return { allowed: [
        { x: COURT_RIGHT, y: 0, w: 600 - COURT_RIGHT, h: 400 },
        { x: NET_X, y: 0, w: COURT_RIGHT - NET_X, h: COURT_TOP },
        { x: NET_X, y: COURT_BOTTOM, w: COURT_RIGHT - NET_X, h: 400 - COURT_BOTTOM },
      ]};
    }
    default:
      return { allowed: [{ x: 0, y: 0, w: 600, h: 400 }] };
  }
}

export function VolleyballCourt({ points, selectedTeam, selectedAction, selectedPointType, sidesSwapped = false, teamNames = { blue: 'Bleue', red: 'Rouge' }, onCourtClick }: VolleyballCourtProps) {
  const courtRef = useRef<SVGSVGElement>(null);

  const hasSelection = !!selectedTeam && !!selectedAction && !!selectedPointType;

  const zoneHighlights = useMemo(() => {
    if (!hasSelection) return null;
    return getZoneHighlights(selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped);
  }, [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped]);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!hasSelection || !courtRef.current) return;
      const rect = courtRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      
      // Convert to SVG coords for zone check
      const svgX = x * 600;
      const svgY = y * 400;
      const zone = getClickZone(svgX, svgY);
      
      if (isZoneAllowed(zone, selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped)) {
        onCourtClick(x, y);
      }
    },
    [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, onCourtClick]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      handleInteraction(e.clientX, e.clientY);
    },
    [handleInteraction]
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!hasSelection) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    },
    [hasSelection, handleInteraction]
  );

  const topTeam: Team = sidesSwapped ? 'red' : 'blue';
  const bottomTeam: Team = sidesSwapped ? 'blue' : 'red';

  const ACTION_SHORT: Record<string, string> = {
    attack: 'A', ace: 'As', block: 'B', bidouille: 'Bi', seconde_main: '2M',
    out: 'O', net_fault: 'F', service_miss: 'SL', block_out: 'BO',
    other_offensive: '',
  };

  return (
    <div className={`relative rounded-xl overflow-hidden transition-all ${hasSelection ? 'ring-2 ring-primary' : ''}`}>
      <svg
        ref={courtRef}
        viewBox="0 0 600 400"
        className={`w-full h-auto ${hasSelection ? 'cursor-crosshair' : ''}`}
        onClick={handleClick}
        onTouchStart={handleTouch}
        data-court="true"
      >
        {/* Court background */}
        <rect x="0" y="0" width="600" height="400" rx="8" fill="hsl(142, 40%, 28%)" />

        {/* Dimming overlay when selection is active */}
        {hasSelection && (
          <>
            {/* Full dim */}
            <rect x="0" y="0" width="600" height="400" fill="black" opacity="0.5" />
            {/* Clear allowed zones */}
            <defs>
              <clipPath id="allowed-zones">
                {zoneHighlights?.allowed.map((z, i) => (
                  <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} />
                ))}
              </clipPath>
            </defs>
            {/* Redraw court in allowed zones */}
            <g clipPath="url(#allowed-zones)">
              <rect x="0" y="0" width="600" height="400" rx="8" fill="hsl(142, 40%, 28%)" />
              {/* Pulsing highlight */}
              <rect x="0" y="0" width="600" height="400" fill={selectedTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} opacity="0.15">
                <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
              </rect>
            </g>
          </>
        )}

        {/* Court border */}
        <rect x="20" y="20" width="560" height="360" rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />

        {/* Net */}
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="3" />
        <line x1="300" y1="20" x2="300" y2="380" stroke="white" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />

        {/* Attack lines */}
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
          const actionLetter = ACTION_SHORT[point.action] ?? null;
          return (
            <g key={point.id} className="animate-point-drop">
              <circle
                cx={cx}
                cy={cy}
                r={9}
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
