import { useRef, useCallback, useMemo, useEffect } from 'react';
import { Point, Team, ActionType, PointType, isPadelScoredAction, isAceAction } from '@/types/sports';

interface PadelCourtProps {
  points: Point[];
  selectedTeam: Team | null;
  selectedAction: ActionType | null;
  selectedPointType: PointType | null;
  sidesSwapped: boolean;
  teamNames: { blue: string; red: string };
  onCourtClick: (x: number, y: number) => void;
  servingSide?: 'deuce' | 'ad';
}

// Court dimensions in SVG (landscape: glass walls left/right)
const W = 600;
const H = 400;
const CL = 30;   // court left (back glass)
const CR = 570;  // court right (back glass)
const CT = 30;   // court top (side wall)
const CB = 370;  // court bottom (side wall)
const NET_X = 300;
const MID_Y = 200;

// Service lines
const SERVICE_LEFT = 165;
const SERVICE_RIGHT = 435;

// Glass/wall zones (outside court lines but inside enclosure)
const WALL_THICKNESS = 20;
const ENCLOSURE_L = CL - WALL_THICKNESS;
const ENCLOSURE_R = CR + WALL_THICKNESS;
const ENCLOSURE_T = CT - WALL_THICKNESS;
const ENCLOSURE_B = CB + WALL_THICKNESS;

// Side grilles (partial glass on top/bottom walls, near net)
const GRILLE_WIDTH = 80;

type ZoneType = 'left_court' | 'right_court' | 'net' | 'back_glass_left' | 'back_glass_right' | 'side_wall_top' | 'side_wall_bottom' | 'grille' | 'outside' | 'service_box_left_top' | 'service_box_left_bottom' | 'service_box_right_top' | 'service_box_right_bottom';

function getClickZone(svgX: number, svgY: number): ZoneType {
  const inCourt = svgX >= CL && svgX <= CR && svgY >= CT && svgY <= CB;

  if (inCourt) {
    if (Math.abs(svgX - NET_X) < 12) return 'net';
    // Service boxes split by center line
    if (svgX >= SERVICE_LEFT && svgX < NET_X && svgY >= CT && svgY <= CB) {
      return svgY < MID_Y ? 'service_box_left_top' : 'service_box_left_bottom';
    }
    if (svgX > NET_X && svgX <= SERVICE_RIGHT && svgY >= CT && svgY <= CB) {
      return svgY < MID_Y ? 'service_box_right_top' : 'service_box_right_bottom';
    }
    return svgX < NET_X ? 'left_court' : 'right_court';
  }

  // Grille zones (side walls near net)
  if ((svgY < CT || svgY > CB) && Math.abs(svgX - NET_X) < GRILLE_WIDTH) {
    return 'grille';
  }

  // Back glass walls
  if (svgX < CL && svgY >= CT && svgY <= CB) return 'back_glass_left';
  if (svgX > CR && svgY >= CT && svgY <= CB) return 'back_glass_right';

  // Side walls
  if (svgY < CT) return 'side_wall_top';
  if (svgY > CB) return 'side_wall_bottom';

  return 'outside';
}

/** Get the single service box zone an ace should land in (diagonal rule) */
function getAceTargetZone(
  serverSide: 'left' | 'right',
  opponentSide: 'left' | 'right',
  servingSide?: 'deuce' | 'ad'
): ZoneType {
  const side = servingSide ?? 'deuce';
  const targetTop = serverSide === 'left' ? (side === 'deuce') : (side === 'ad');
  const suffix = targetTop ? '_top' : '_bottom';
  return (opponentSide === 'left' ? 'service_box_left' : 'service_box_right') + suffix as ZoneType;
}

function isZoneAllowed(
  zone: ZoneType,
  team: Team, action: ActionType, pointType: PointType,
  sidesSwapped: boolean,
  servingSide?: 'deuce' | 'ad'
): boolean {
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  if (isAceAction(action)) {
    const targetZone = getAceTargetZone(teamSide, opponentSide, servingSide);
    return zone === targetZone;
  }

  if (isPadelScoredAction(action)) {
    const courtZones = opponentSide === 'left'
      ? ['left_court', 'service_box_left_top', 'service_box_left_bottom']
      : ['right_court', 'service_box_right_top', 'service_box_right_bottom'];
    const glassZone = opponentSide === 'left' ? 'back_glass_left' : 'back_glass_right';
    if (action === 'par_3') {
      return [glassZone, 'grille', 'side_wall_top', 'side_wall_bottom'].includes(zone);
    }
    return [...courtZones, glassZone, 'grille'].includes(zone);
  }

  // Faults
  switch (action) {
    case 'padel_double_fault':
      return zone === 'outside' || zone === 'net' || (zone.startsWith('service_box') && zone !== getAceTargetZone(teamSide, opponentSide, servingSide));
    case 'padel_net_error':
      return zone === 'net';
    case 'padel_out':
      return zone === 'outside' || zone === 'side_wall_top' || zone === 'side_wall_bottom';
    case 'grille_error':
      return zone === 'grille';
    case 'vitre_error':
      return zone === 'back_glass_left' || zone === 'back_glass_right' || zone === 'side_wall_top' || zone === 'side_wall_bottom';
    case 'padel_unforced_error':
      return true;
    default:
      return true;
  }
}

function getZoneHighlights(
  team: Team, action: ActionType, pointType: PointType, sidesSwapped: boolean,
  servingSide?: 'deuce' | 'ad'
): { x: number; y: number; w: number; h: number }[] {
  const teamSide = sidesSwapped
    ? (team === 'blue' ? 'right' : 'left')
    : (team === 'blue' ? 'left' : 'right');
  const opponentSide = teamSide === 'left' ? 'right' : 'left';

  if (isAceAction(action)) {
    const targetZone = getAceTargetZone(teamSide, opponentSide, servingSide);
    const isLeft = targetZone.includes('left');
    const isTop = targetZone.includes('_top');
    const x = isLeft ? SERVICE_LEFT : NET_X;
    const w = isLeft ? (NET_X - SERVICE_LEFT) : (SERVICE_RIGHT - NET_X);
    const y = isTop ? CT : MID_Y;
    const h = isTop ? (MID_Y - CT) : (CB - MID_Y);
    return [{ x, y, w, h }];
  }

  if (isPadelScoredAction(action)) {
    if (action === 'par_3') {
      // Walls and grilles
      return [
        { x: ENCLOSURE_L, y: ENCLOSURE_T, w: WALL_THICKNESS, h: ENCLOSURE_B - ENCLOSURE_T },
        { x: CR, y: ENCLOSURE_T, w: WALL_THICKNESS, h: ENCLOSURE_B - ENCLOSURE_T },
        { x: ENCLOSURE_L, y: ENCLOSURE_T, w: ENCLOSURE_R - ENCLOSURE_L, h: WALL_THICKNESS },
        { x: ENCLOSURE_L, y: CB, w: ENCLOSURE_R - ENCLOSURE_L, h: WALL_THICKNESS },
      ];
    }
    if (opponentSide === 'right') {
      return [
        { x: NET_X, y: ENCLOSURE_T, w: ENCLOSURE_R - NET_X, h: ENCLOSURE_B - ENCLOSURE_T },
      ];
    }
    return [
      { x: ENCLOSURE_L, y: ENCLOSURE_T, w: NET_X - ENCLOSURE_L, h: ENCLOSURE_B - ENCLOSURE_T },
    ];
  }

  switch (action) {
    case 'padel_net_error':
      return [{ x: NET_X - 12, y: CT, w: 24, h: CB - CT }];
    case 'grille_error':
      return [
        { x: NET_X - GRILLE_WIDTH, y: ENCLOSURE_T, w: GRILLE_WIDTH * 2, h: WALL_THICKNESS },
        { x: NET_X - GRILLE_WIDTH, y: CB, w: GRILLE_WIDTH * 2, h: WALL_THICKNESS },
      ];
    case 'vitre_error':
      return [
        { x: ENCLOSURE_L, y: CT, w: WALL_THICKNESS, h: CB - CT },
        { x: CR, y: CT, w: WALL_THICKNESS, h: CB - CT },
        { x: CL, y: ENCLOSURE_T, w: CR - CL, h: WALL_THICKNESS },
        { x: CL, y: CB, w: CR - CL, h: WALL_THICKNESS },
      ];
    default:
      return [{ x: 0, y: 0, w: W, h: H }];
  }
}

const ACTION_SHORT: Record<string, string> = {
  padel_ace: 'As', vibora: 'Vi', bandeja: 'Bd', smash_padel: 'Sm', volee: 'V',
  bajada: 'Bj', chiquita_winner: 'Ch', par_3: 'P3', other_padel_winner: '+',
  padel_double_fault: 'DF', padel_unforced_error: 'FD', padel_net_error: 'F',
  padel_out: 'O', grille_error: 'Gr', vitre_error: 'Vt',
};

export function PadelCourt({
  points, selectedTeam, selectedAction, selectedPointType,
  sidesSwapped, teamNames, onCourtClick, servingSide
}: PadelCourtProps) {
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
    return getZoneHighlights(selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped, servingSide);
  }, [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, servingSide]);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!hasSelection || !courtRef.current) return;
      const rect = courtRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      const svgX = x * W;
      const svgY = y * H;
      const zone = getClickZone(svgX, svgY);
      if (isZoneAllowed(zone, selectedTeam!, selectedAction!, selectedPointType!, sidesSwapped, servingSide)) {
        onCourtClick(x, y);
      }
    },
    [hasSelection, selectedTeam, selectedAction, selectedPointType, sidesSwapped, onCourtClick, servingSide]
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
        {/* Background - blue padel court */}
        <rect x="0" y="0" width={W} height={H} rx="8" fill="hsl(210, 55%, 30%)" />

        {/* Enclosure walls (glass + grilles) */}
        {/* Back glass walls */}
        <rect x={ENCLOSURE_L} y={CT} width={WALL_THICKNESS} height={CB - CT} fill="hsl(210, 30%, 45%)" opacity="0.4" rx="2" />
        <rect x={CR} y={CT} width={WALL_THICKNESS} height={CB - CT} fill="hsl(210, 30%, 45%)" opacity="0.4" rx="2" />
        {/* Side walls */}
        <rect x={CL} y={ENCLOSURE_T} width={CR - CL} height={WALL_THICKNESS} fill="hsl(210, 30%, 45%)" opacity="0.3" rx="2" />
        <rect x={CL} y={CB} width={CR - CL} height={WALL_THICKNESS} fill="hsl(210, 30%, 45%)" opacity="0.3" rx="2" />
        {/* Grilles near net (distinctive) */}
        <rect x={NET_X - GRILLE_WIDTH} y={ENCLOSURE_T} width={GRILLE_WIDTH * 2} height={WALL_THICKNESS} fill="hsl(45, 50%, 50%)" opacity="0.3" rx="2" />
        <rect x={NET_X - GRILLE_WIDTH} y={CB} width={GRILLE_WIDTH * 2} height={WALL_THICKNESS} fill="hsl(45, 50%, 50%)" opacity="0.3" rx="2" />
        {/* Grille hatching pattern */}
        <line x1={NET_X - GRILLE_WIDTH} y1={ENCLOSURE_T} x2={NET_X + GRILLE_WIDTH} y2={ENCLOSURE_T + WALL_THICKNESS} stroke="hsl(45, 50%, 60%)" strokeWidth="0.5" opacity="0.4" />
        <line x1={NET_X - GRILLE_WIDTH + 20} y1={ENCLOSURE_T} x2={NET_X + GRILLE_WIDTH + 20} y2={ENCLOSURE_T + WALL_THICKNESS} stroke="hsl(45, 50%, 60%)" strokeWidth="0.5" opacity="0.4" />
        <line x1={NET_X - GRILLE_WIDTH} y1={CB} x2={NET_X + GRILLE_WIDTH} y2={CB + WALL_THICKNESS} stroke="hsl(45, 50%, 60%)" strokeWidth="0.5" opacity="0.4" />
        <line x1={NET_X - GRILLE_WIDTH + 20} y1={CB} x2={NET_X + GRILLE_WIDTH + 20} y2={CB + WALL_THICKNESS} stroke="hsl(45, 50%, 60%)" strokeWidth="0.5" opacity="0.4" />

        {/* Dimming + highlight */}
        {hasSelection && zoneHighlights && (
          <>
            <rect x="0" y="0" width={W} height={H} fill="black" opacity="0.5" />
            <defs>
              <clipPath id="padel-allowed">
                {zoneHighlights.map((z, i) => (
                  <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} />
                ))}
              </clipPath>
            </defs>
            <g clipPath="url(#padel-allowed)">
              <rect x="0" y="0" width={W} height={H} fill="hsl(210, 55%, 30%)" />
              {/* Re-draw walls in allowed zone */}
              <rect x={ENCLOSURE_L} y={CT} width={WALL_THICKNESS} height={CB - CT} fill="hsl(210, 30%, 45%)" opacity="0.4" />
              <rect x={CR} y={CT} width={WALL_THICKNESS} height={CB - CT} fill="hsl(210, 30%, 45%)" opacity="0.4" />
              <rect x={CL} y={ENCLOSURE_T} width={CR - CL} height={WALL_THICKNESS} fill="hsl(210, 30%, 45%)" opacity="0.3" />
              <rect x={CL} y={CB} width={CR - CL} height={WALL_THICKNESS} fill="hsl(210, 30%, 45%)" opacity="0.3" />
              <rect x={NET_X - GRILLE_WIDTH} y={ENCLOSURE_T} width={GRILLE_WIDTH * 2} height={WALL_THICKNESS} fill="hsl(45, 50%, 50%)" opacity="0.3" />
              <rect x={NET_X - GRILLE_WIDTH} y={CB} width={GRILLE_WIDTH * 2} height={WALL_THICKNESS} fill="hsl(45, 50%, 50%)" opacity="0.3" />
              <rect x="0" y="0" width={W} height={H} fill={selectedTeam === 'blue' ? 'hsl(217, 91%, 60%)' : 'hsl(0, 84%, 60%)'} opacity="0.15">
                <animate attributeName="opacity" values="0.1;0.2;0.1" dur="1.5s" repeatCount="indefinite" />
              </rect>
            </g>
          </>
        )}

        {/* Court border */}
        <rect x={CL} y={CT} width={CR - CL} height={CB - CT} fill="none" stroke="white" strokeWidth="2.5" />

        {/* Net */}
        <line x1={NET_X} y1={CT - 5} x2={NET_X} y2={CB + 5} stroke="white" strokeWidth="3" />
        <line x1={NET_X} y1={CT - 5} x2={NET_X} y2={CB + 5} stroke="white" strokeWidth="1" strokeDasharray="6 3" opacity="0.4" />

        {/* Service lines */}
        <line x1={SERVICE_LEFT} y1={CT} x2={SERVICE_LEFT} y2={CB} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={SERVICE_RIGHT} y1={CT} x2={SERVICE_RIGHT} y2={CB} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Center service line */}
        <line x1={SERVICE_LEFT} y1={MID_Y} x2={NET_X} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1={NET_X} y1={MID_Y} x2={SERVICE_RIGHT} y2={MID_Y} stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Wall labels */}
        <text x={ENCLOSURE_L + WALL_THICKNESS / 2} y={MID_Y} textAnchor="middle" fill="white" fontSize="8" opacity="0.3" transform={`rotate(-90, ${ENCLOSURE_L + WALL_THICKNESS / 2}, ${MID_Y})`}>
          VITRE
        </text>
        <text x={CR + WALL_THICKNESS / 2} y={MID_Y} textAnchor="middle" fill="white" fontSize="8" opacity="0.3" transform={`rotate(90, ${CR + WALL_THICKNESS / 2}, ${MID_Y})`}>
          VITRE
        </text>
        <text x={NET_X} y={ENCLOSURE_T + WALL_THICKNESS / 2 + 3} textAnchor="middle" fill="white" fontSize="7" opacity="0.3">
          GRILLE
        </text>
        <text x={NET_X} y={CB + WALL_THICKNESS / 2 + 3} textAnchor="middle" fill="white" fontSize="7" opacity="0.3">
          GRILLE
        </text>

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
