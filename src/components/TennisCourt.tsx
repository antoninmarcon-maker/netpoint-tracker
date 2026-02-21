import { useRef, useCallback, useMemo, useEffect } from 'react';
import { Point, Team, ActionType, PointType, isTennisScoredAction, isAceAction, MatchFormat } from '@/types/sports';

interface TennisCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  selectedAction: ActionType | null;
  selectedPointType: PointType | null;
  sidesSwapped: boolean;
  teamNames: { blue: string; red: string };
  onCourtClick: (x: number, y: number) => void;
  matchFormat?: MatchFormat;
  servingSide?: 'deuce' | 'ad';
}

// Court dimensions in SVG coordinates (landscape: baseline left/right)
const W = 600;
const H = 400;
const CL = 30;  // court left
const CR = 570; // court right
const CT = 40;  // court top (doubles sideline)
const CB = 360; // court bottom (doubles sideline)
const ST = 80;  // singles sideline top
const SB = 320; // singles sideline bottom
const NET_X = 300;
const SERVICE_LEFT = 165;  // service line left side
const SERVICE_RIGHT = 435; // service line right side
const MID_Y = 200;

type ZoneType = 'left_court' | 'right_court' | 'outside' | 'net' | 'alley_left' | 'alley_right' | 'service_box_left_top' | 'service_box_left_bottom' | 'service_box_right_top' | 'service_box_right_bottom';

function getClickZone(svgX: number, svgY: number): ZoneType {
  const inDoublesBox = svgX >= CL && svgX <= CR && svgY >= CT && svgY <= CB;
  if (!inDoublesBox) return 'outside';

  // Net zone
  if (Math.abs(svgX - NET_X) < 12) return 'net';

  // Alleys (between doubles and singles sidelines)
  if (svgY < ST || svgY > SB) {
    return svgX < NET_X ? 'alley_left' : 'alley_right';
  }

  // Service boxes split by center line (top = y < MID_Y, bottom = y >= MID_Y)
  if (svgX >= SERVICE_LEFT && svgX < NET_X && svgY >= ST && svgY <= SB) {
    return svgY < MID_Y ? 'service_box_left_top' : 'service_box_left_bottom';
  }
  if (svgX > NET_X && svgX <= SERVICE_RIGHT && svgY >= ST && svgY <= SB) {
    return svgY < MID_Y ? 'service_box_right_top' : 'service_box_right_bottom';
  }

  if (svgX < NET_X) return 'left_court';
  return 'right_court';
}

function isZoneAllowed(
  zone: ZoneType,
  team: Team, action: ActionType, pointType: PointType,
  sidesSwapped: boolean,
  matchFormat?: MatchFormat,
  servingSide?: 'deuce' | 'ad'
): boolean {
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  // In singles, alleys are treated as outside
  const isSingles = matchFormat === 'singles' || !matchFormat;

  // Aces: must land in the diagonally opposite service box
  if (isAceAction(action)) {
    const targetZone = getAceTargetZone(teamSide, opponentSide, servingSide);
    return zone === targetZone;
  }

  if (isTennisScoredAction(action)) {
    if (isSingles) {
      const allowed = opponentSide === 'left'
        ? ['left_court', 'service_box_left_top', 'service_box_left_bottom']
        : ['right_court', 'service_box_right_top', 'service_box_right_bottom'];
      return allowed.includes(zone);
    }
    const allowed = opponentSide === 'left'
      ? ['left_court', 'alley_left', 'service_box_left_top', 'service_box_left_bottom']
      : ['right_court', 'alley_right', 'service_box_right_top', 'service_box_right_bottom'];
    return allowed.includes(zone);
  }

  // Faults
  switch (action) {
    case 'double_fault': {
      const targetZone = getAceTargetZone(teamSide, opponentSide, servingSide);
      // Double fault: the ball was SUPPOSED to go in the target zone, so allow clicks outside/net/wrong box
      return zone === 'outside' || zone === 'net' || (zone !== targetZone && zone.startsWith('service_box'));
    }
    case 'net_error':
      return zone === 'net';
    case 'out_long':
    case 'out_wide':
      return zone === 'outside' || (isSingles && (zone === 'alley_left' || zone === 'alley_right'));
    case 'unforced_error_forehand':
    case 'unforced_error_backhand':
      return true;
    default:
      return true;
  }
}

/** Get the single service box zone an ace should land in (diagonal rule) */
function getAceTargetZone(
  serverSide: 'left' | 'right',
  opponentSide: 'left' | 'right',
  servingSide?: 'deuce' | 'ad'
): ZoneType {
  const side = servingSide ?? 'deuce';
  // In landscape SVG: top = one half, bottom = other half
  // Server on left: deuce = bottom of baseline → diagonal = opponent top; ad = top → opponent bottom
  // Server on right: deuce = top of baseline → diagonal = opponent bottom; ad = bottom → opponent top
  const targetTop = serverSide === 'left' ? (side === 'deuce') : (side === 'ad');
  const suffix = targetTop ? '_top' : '_bottom';
  return (opponentSide === 'left' ? 'service_box_left' : 'service_box_right') + suffix as ZoneType;
}

function getZoneHighlights(
  team: Team, action: ActionType, pointType: PointType, sidesSwapped: boolean,
  matchFormat?: MatchFormat,
  servingSide?: 'deuce' | 'ad'
): { x: number; y: number; w: number; h: number }[] {
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  const isSingles = matchFormat === 'singles' || !matchFormat;

  // Aces: only the diagonal service box
  if (isAceAction(action)) {
    const targetZone = getAceTargetZone(teamSide, opponentSide, servingSide);
    const isLeft = targetZone.includes('left');
    const isTop = targetZone.includes('_top');
    const x = isLeft ? SERVICE_LEFT : NET_X;
    const w = isLeft ? (NET_X - SERVICE_LEFT) : (SERVICE_RIGHT - NET_X);
    const y = isTop ? ST : MID_Y;
    const h = isTop ? (MID_Y - ST) : (SB - MID_Y);
    return [{ x, y, w, h }];
  }

  if (isTennisScoredAction(action)) {
    if (isSingles) {
      // Singles: only between singles sidelines
      if (opponentSide === 'right') {
        return [{ x: NET_X, y: ST, w: CR - NET_X, h: SB - ST }];
      }
      return [{ x: CL, y: ST, w: NET_X - CL, h: SB - ST }];
    }
    // Doubles: full doubles court
    if (opponentSide === 'right') {
      return [{ x: NET_X, y: CT, w: CR - NET_X, h: CB - CT }];
    }
    return [{ x: CL, y: CT, w: NET_X - CL, h: CB - CT }];
  }

  switch (action) {
    case 'net_error':
      return [{ x: NET_X - 12, y: CT, w: 24, h: CB - CT }];
    case 'out_long':
    case 'out_wide': {
      const zones = [
        { x: 0, y: 0, w: CL, h: H },
        { x: CR, y: 0, w: W - CR, h: H },
        { x: CL, y: 0, w: CR - CL, h: CT },
        { x: CL, y: CB, w: CR - CL, h: H - CB },
      ];
      // In singles, alleys are also "out"
      if (isSingles) {
        zones.push({ x: CL, y: CT, w: CR - CL, h: ST - CT });
        zones.push({ x: CL, y: SB, w: CR - CL, h: CB - SB });
      }
      return zones;
    }
    default:
      return [{ x: 0, y: 0, w: W, h: H }];
  }
}

const ACTION_SHORT: Record<string, string> = {
  tennis_ace: 'As', winner_forehand: 'CD', winner_backhand: 'R',
  volley_winner: 'V', smash: 'Sm', drop_shot_winner: 'Am',
  other_tennis_winner: '+',
  double_fault: 'DF', unforced_error_forehand: 'eCD', unforced_error_backhand: 'eR',
  net_error: 'F', out_long: 'OL', out_wide: 'OW',
};

export function TennisCourt({
  points, selectedTeam, selectedAction, selectedPointType,
  sidesSwapped, teamNames, onCourtClick, matchFormat, servingSide
}: TennisCourtProps) {
  const courtRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasSelection = !!selectedTeam && !!selectedAction && !!selectedPointType;

  useEffect(() => {
    if (hasSelection && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [hasSelection]);

  const zoneHighlights = useMemo(() => {
    if (!hasSelection) return null;
    return getZoneHighlights(selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped, matchFormat, servingSide);
  }, [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, matchFormat, servingSide]);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!hasSelection || !courtRef.current) return;
      const rect = courtRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const svgX = x * W;
      const svgY = y * H;
      const zone = getClickZone(svgX, svgY);
      if (isZoneAllowed(zone, selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped, matchFormat, servingSide)) {
        onCourtClick(x, y);
      }
    },
    [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, onCourtClick, matchFormat]
  );

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleTouch = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!hasSelection) return;
    e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  }, [hasSelection, handleInteraction]);

  const leftTeam: Team = sidesSwapped ? 'red' : 'blue';
  const rightTeam: Team = sidesSwapped ? 'blue' : 'red';

  return (
    <div ref={containerRef} id="court-container" className={`relative rounded-xl overflow-hidden transition-all ${hasSelection ? 'ring-2 ring-primary' : ''}`}>
      <svg
        ref={courtRef}
        viewBox="0 0 600 400"
        className={`w-full h-auto ${hasSelection ? 'cursor-crosshair' : ''}`}
        onClick={handleClick}
        onTouchStart={handleTouch}
        data-court="true"
      >
        {/* Background - terre battue */}
        <rect x="0" y="0" width={W} height={H} rx="8" fill="hsl(15, 60%, 40%)" />

        {/* Dimming + highlight */}
        {hasSelection && zoneHighlights && (
          <>
            <rect x="0" y="0" width={W} height={H} fill="black" opacity="0.5" />
            <defs>
              <clipPath id="tennis-allowed">
                {zoneHighlights.map((z, i) => (
                  <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} />
                ))}
              </clipPath>
            </defs>
            <g clipPath="url(#tennis-allowed)">
              <rect x="0" y="0" width={W} height={H} fill="hsl(15, 60%, 40%)" />
              <rect x="0" y="0" width={W} height={H} fill={selectedTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} opacity="0.15">
                <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
              </rect>
            </g>
          </>
        )}

        {/* Doubles court border */}
        <rect x={CL} y={CT} width={CR - CL} height={CB - CT} fill="none" stroke="white" strokeWidth="2.5" />

        {/* Singles sidelines */}
        <line x1={CL} y1={ST} x2={CR} y2={ST} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={CL} y1={SB} x2={CR} y2={SB} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Net */}
        <line x1={NET_X} y1={CT - 8} x2={NET_X} y2={CB + 8} stroke="white" strokeWidth="3" />
        <line x1={NET_X} y1={CT - 8} x2={NET_X} y2={CB + 8} stroke="white" strokeWidth="1" strokeDasharray="6 3" opacity="0.4" />

        {/* Service lines */}
        <line x1={SERVICE_LEFT} y1={ST} x2={SERVICE_LEFT} y2={SB} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={SERVICE_RIGHT} y1={ST} x2={SERVICE_RIGHT} y2={SB} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Center service line */}
        <line x1={SERVICE_LEFT} y1={MID_Y} x2={NET_X} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={NET_X} y1={MID_Y} x2={SERVICE_RIGHT} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Center marks on baselines */}
        <line x1={CL} y1={MID_Y} x2={CL + 10} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.5" />
        <line x1={CR - 10} y1={MID_Y} x2={CR} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.5" />

        {/* Team labels */}
        <text x="120" y={MID_Y + 5} textAnchor="middle" fill={leftTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.4">
          {teamNames[leftTeam]}
        </text>
        <text x="480" y={MID_Y + 5} textAnchor="middle" fill={rightTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} fontSize="13" fontWeight="bold" opacity="0.4">
          {teamNames[rightTeam]}
        </text>

        {/* Point markers (exclude fault points — opponent faults have no court position) */}
        {points.filter(p => p.type !== 'fault').map((point) => {
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
                <text x={cx} y={cy + 4} textAnchor="middle" fill={isFault ? color : 'white'} fontSize="9" fontWeight="bold">{label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
