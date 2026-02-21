import { useMemo } from 'react';
import { Point, ActionType, PointType } from '@/types/sports';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import { useTranslation } from 'react-i18next';

const ACTION_LABELS: Partial<Record<ActionType, { abbr: string; full: string }>> = {
  attack: { abbr: 'ATK', full: 'Attaque' },
  ace: { abbr: 'ACE', full: 'Ace' },
  block: { abbr: 'BLK', full: 'Block' },
  bidouille: { abbr: 'BDL', full: 'Bidouille' },
  seconde_main: { abbr: '2M', full: 'Seconde main' },
  other_offensive: { abbr: 'AUT', full: 'Autre offensif' },
  out: { abbr: 'OUT', full: 'Out' },
  net_fault: { abbr: 'FIL', full: 'Filet' },
  service_miss: { abbr: 'SRV', full: 'Service loupé' },
  block_out: { abbr: 'BKO', full: 'Block Out' },
  free_throw: { abbr: '1PT', full: 'Lancer franc' },
  two_points: { abbr: '2PT', full: 'Intérieur' },
  three_points: { abbr: '3PT', full: 'Extérieur' },
  missed_shot: { abbr: 'MIS', full: 'Tir manqué' },
  turnover: { abbr: 'TOV', full: 'Perte de balle' },
  foul_committed: { abbr: 'FOU', full: 'Faute commise' },
};

interface PointTimelineProps {
  points: Point[];
  teamNames: { blue: string; red: string };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface DataPoint {
  index: number;
  blue: number;
  red: number;
  time: number;
  timeLabel: string;
  action: ActionType;
  team: 'blue' | 'red';
  type: PointType;
}

export function PointTimeline({ points, teamNames }: PointTimelineProps) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    if (points.length === 0) return [];
    const startTime = points[0].timestamp;
    let blueScore = 0;
    let redScore = 0;

    const initial: DataPoint = {
      index: 0, blue: 0, red: 0, time: 0, timeLabel: '0:00',
      action: 'attack', team: 'blue', type: 'scored',
    };

    const rows: DataPoint[] = [initial];

    points.forEach((p, i) => {
      if (p.team === 'blue') blueScore++;
      else redScore++;
      const elapsed = Math.round((p.timestamp - startTime) / 1000);
      rows.push({
        index: i + 1, blue: blueScore, red: redScore,
        time: elapsed, timeLabel: formatTime(elapsed),
        action: p.action, team: p.team, type: p.type,
      });
    });

    return rows;
  }, [points]);

  const maxScore = useMemo(() => {
    if (data.length <= 1) return 25;
    const max = Math.max(...data.map(d => Math.max(d.blue, d.red)));
    return Math.max(max + 2, 5);
  }, [data]);

  const yTicks = useMemo(() => {
    const step = maxScore <= 10 ? 1 : maxScore <= 20 ? 2 : 5;
    const ticks: number[] = [];
    for (let i = 0; i <= maxScore; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== maxScore) ticks.push(maxScore);
    return ticks;
  }, [maxScore]);

  if (data.length <= 1) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border text-center">
        <p className="text-xs text-muted-foreground">{t('timeline.noPoints')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
        {t('timeline.title')}
      </p>
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: t('timeline.time'), position: 'insideBottom', offset: -20, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, maxScore]}
              ticks={yTicks}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: t('timeline.points'), angle: -90, position: 'insideLeft', offset: 20, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip teamNames={teamNames} />} />
            <Line type="stepAfter" dataKey="blue" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={<CustomDot color="hsl(217, 91%, 60%)" />} name={teamNames.blue} />
            <Line type="stepAfter" dataKey="red" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={<CustomDot color="hsl(0, 84%, 60%)" />} name={teamNames.red} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-team-blue inline-block" /> {teamNames.blue}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded bg-team-red inline-block" /> {teamNames.red}
        </span>
      </div>
    </div>
  );
}

function CustomDot({ cx, cy, color, payload }: any) {
  if (!payload || payload.index === 0) return null;
  const label = ACTION_LABELS[payload.action as ActionType];
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="hsl(var(--card))" strokeWidth={1.5} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={8} fontWeight="bold" fill="hsl(var(--foreground))">
        {label?.abbr ?? '?'}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload, teamNames }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DataPoint | undefined;
  if (!d || d.index === 0) return null;

  const actionInfo = ACTION_LABELS[d.action];
  const teamName = d.team === 'blue' ? teamNames.blue : teamNames.red;

  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-1">
      <p className="font-bold text-foreground">Point #{d.index} — {d.timeLabel}</p>
      <p className={`font-semibold ${d.team === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamName}</p>
      <p className="text-muted-foreground">{d.type === 'scored' ? 'Point ✓' : 'Fault ✗'}</p>
      <p className="text-foreground">
        <span className="font-bold">{actionInfo?.abbr}</span> — {actionInfo?.full}
      </p>
      <p className="text-muted-foreground">
        {teamNames.blue} {d.blue} - {d.red} {teamNames.red}
      </p>
    </div>
  );
}
