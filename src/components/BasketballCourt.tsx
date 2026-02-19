import { useRef, useCallback, useMemo } from 'react';
import { Point, Team, ActionType, PointType, isBasketScoredAction } from '@/types/volleyball';

interface BasketballCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  selectedAction: ActionType | null;
  selectedPointType: PointType | null;
  sidesSwapped: boolean;
  teamNames: { blue: string; red: string };
  onCourtClick: (x: number, y: number) => void;
}

// Court dimensions in SVG
const W = 600;
const H = 400;
const COURT_L = 20;
const COURT_R = 580;
const COURT_T = 20;
const COURT_B = 380;
const MID_X = 300;

// 3-point arc parameters (each half-court)
const ARC_RADIUS = 120;
const BASKET_X_LEFT = 70;   // basket position left side
const BASKET_X_RIGHT = 530; // basket position right side
const BASKET_Y = 200;

function isInside3ptArc(svgX: number, svgY: number, side: 'left' | 'right'): boolean {
  const bx = side === 'left' ? BASKET_X_LEFT : BASKET_X_RIGHT;
  const dist = Math.sqrt((svgX - bx) ** 2 + (svgY - BASKET_Y) ** 2);
  return dist <= ARC_RADIUS;
}

function isZoneAllowed(
  svgX: number, svgY: number,
  team: Team, action: ActionType, pointType: PointType,
  sidesSwapped: boolean
): boolean {
  const inCourt = svgX >= COURT_L && svgX <= COURT_R && svgY >= COURT_T && svgY <= COURT_B;
  if (!inCourt) return false;

  // Free throw: not placed on court (handled upstream), but allow anywhere as fallback
  if (action === 'free_throw') return true;

  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  if (pointType === 'scored') {
    // Shots: placed anywhere on court, zone check is relative to opponent's basket
    if (action === 'three_points') {
      return !isInside3ptArc(svgX, svgY, opponentSide);
    }
    if (action === 'two_points') {
      return isInside3ptArc(svgX, svgY, opponentSide);
    }
    return true;
  }

  // Faults: anywhere on court
  return true;
}

function getZoneHighlights(
  team: Team, action: ActionType, pointType: PointType, sidesSwapped: boolean
): 'full' | 'inside_arc' | 'outside_arc' {
  if (pointType === 'fault') return 'full';
  if (action === 'two_points') return 'inside_arc';
  if (action === 'three_points') return 'outside_arc';
  return 'full';
}

const ACTION_SHORT: Record<string, string> = {
  free_throw: '1', two_points: '2', three_points: '3',
  missed_shot: 'X', turnover: 'T', foul_committed: 'F',
};

export function BasketballCourt({ points, selectedTeam, selectedAction, selectedPointType, sidesSwapped, teamNames, onCourtClick }: BasketballCourtProps) {
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
      const svgX = x * W;
      const svgY = y * H;
      if (isZoneAllowed(svgX, svgY, selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped)) {
        onCourtClick(x, y);
      }
    },
    [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, onCourtClick]
  );

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleTouch = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!hasSelection) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
  }, [hasSelection, handleInteraction]);

  const leftTeam: Team = sidesSwapped ? 'red' : 'blue';
  const rightTeam: Team = sidesSwapped ? 'blue' : 'red';

  // Arc path for 3-point line (semicircle)
  const arcPathLeft = `M ${BASKET_X_LEFT} ${BASKET_Y - ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${BASKET_X_LEFT} ${BASKET_Y + ARC_RADIUS}`;
  const arcPathRight = `M ${BASKET_X_RIGHT} ${BASKET_Y + ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${BASKET_X_RIGHT} ${BASKET_Y - ARC_RADIUS}`;

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
        {/* Court background - wooden floor */}
        <rect x="0" y="0" width="600" height="400" rx="8" fill="hsl(30, 50%, 35%)" />

        {/* Dimming overlay when selection is active */}
        {hasSelection && zoneHighlights && (
          (() => {
            const teamSide = sidesSwapped
              ? (selectedTeam === 'blue' ? 'right' : 'left')
              : (selectedTeam === 'blue' ? 'left' : 'right');
            const oppSide = teamSide === 'left' ? 'right' : 'left';
            const bx = oppSide === 'left' ? BASKET_X_LEFT : BASKET_X_RIGHT;
            const color = selectedTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';

            return (
              <>
                <rect x="0" y="0" width="600" height="400" fill="black" opacity="0.5" />
                <defs>
                  {zoneHighlights === 'inside_arc' && (
                    <clipPath id="bk-zone-clip">
                      <circle cx={bx} cy={BASKET_Y} r={ARC_RADIUS} />
                    </clipPath>
                  )}
                  {zoneHighlights === 'outside_arc' && (
                    <clipPath id="bk-zone-clip">
                      {/* Full court rect, then subtract circle via two rects around it */}
                      <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} />
                    </clipPath>
                  )}
                </defs>
                {zoneHighlights === 'full' && (
                  <>
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill="hsl(30, 50%, 35%)" />
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill={color} opacity="0.15">
                      <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                  </>
                )}
                {zoneHighlights === 'inside_arc' && (
                  <g clipPath="url(#bk-zone-clip)">
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill="hsl(30, 50%, 35%)" />
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill={color} opacity="0.15">
                      <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                  </g>
                )}
                {zoneHighlights === 'outside_arc' && (
                  <>
                    {/* Full court highlight */}
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill="hsl(30, 50%, 35%)" />
                    <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} fill={color} opacity="0.15">
                      <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                    {/* Dark circle to "cut out" the inside of the arc */}
                    <circle cx={bx} cy={BASKET_Y} r={ARC_RADIUS} fill="black" opacity="0.5" />
                  </>
                )}
              </>
            );
          })()
        )}

        {/* Court border */}
        <rect x={COURT_L} y={COURT_T} width={COURT_R - COURT_L} height={COURT_B - COURT_T} rx="4" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />

        {/* Center line */}
        <line x1={MID_X} y1={COURT_T} x2={MID_X} y2={COURT_B} stroke="white" strokeWidth="2" opacity="0.8" />

        {/* Center circle */}
        <circle cx={MID_X} cy={BASKET_Y} r="40" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />

        {/* Left 3-point arc */}
        <path d={arcPathLeft} fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
        {/* Left baseline connector for arc */}
        <line x1={COURT_L} y1={BASKET_Y - ARC_RADIUS} x2={BASKET_X_LEFT} y2={BASKET_Y - ARC_RADIUS} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={COURT_L} y1={BASKET_Y + ARC_RADIUS} x2={BASKET_X_LEFT} y2={BASKET_Y + ARC_RADIUS} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Right 3-point arc */}
        <path d={arcPathRight} fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={BASKET_X_RIGHT} y1={BASKET_Y - ARC_RADIUS} x2={COURT_R} y2={BASKET_Y - ARC_RADIUS} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={BASKET_X_RIGHT} y1={BASKET_Y + ARC_RADIUS} x2={COURT_R} y2={BASKET_Y + ARC_RADIUS} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Baskets */}
        <circle cx={BASKET_X_LEFT - 20} cy={BASKET_Y} r="8" fill="none" stroke="orange" strokeWidth="2" opacity="0.8" />
        <rect x={COURT_L} y={BASKET_Y - 15} width="12" height="30" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
        <circle cx={BASKET_X_RIGHT + 20} cy={BASKET_Y} r="8" fill="none" stroke="orange" strokeWidth="2" opacity="0.8" />
        <rect x={COURT_R - 12} y={BASKET_Y - 15} width="12" height="30" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />

        {/* Free throw lines */}
        <line x1={BASKET_X_LEFT + 40} y1={BASKET_Y - 60} x2={BASKET_X_LEFT + 40} y2={BASKET_Y + 60} stroke="white" strokeWidth="1" opacity="0.4" />
        <line x1={BASKET_X_RIGHT - 40} y1={BASKET_Y - 60} x2={BASKET_X_RIGHT - 40} y2={BASKET_Y + 60} stroke="white" strokeWidth="1" opacity="0.4" />

        {/* Team labels */}
        <text x="150" y="205" textAnchor="middle" fill={leftTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.4">
          {teamNames[leftTeam]}
        </text>
        <text x="450" y="205" textAnchor="middle" fill={rightTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.4">
          {teamNames[rightTeam]}
        </text>

        {/* Point markers */}
        {points.filter(p => p.action !== 'free_throw').map((point) => {
          const cx = point.x * W;
          const cy = point.y * H;
          const color = point.team === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)';
          const isFault = point.type === 'fault';
          const label = ACTION_SHORT[point.action] ?? '';
          return (
            <g key={point.id} className="animate-point-drop">
              <circle
                cx={cx} cy={cy} r={9}
                fill={isFault ? 'transparent' : color}
                opacity={0.85}
                stroke={color}
                strokeWidth={isFault ? 2 : 1.5}
                strokeDasharray={isFault ? '3 2' : 'none'}
              />
              {label && (
                <text x={cx} y={cy + 4} textAnchor="middle" fill={isFault ? color : 'white'} fontSize="10" fontWeight="bold">{label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
