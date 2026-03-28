import { Trash2, CheckCircle2, MoreVertical, FileSpreadsheet, BarChart2, Share2, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MatchSummary } from '@/types/sports';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/formatters';

function matchScore(match: MatchSummary) {
  const blue = match.completedSets.filter(s => s.winner === 'blue').length;
  const red = match.completedSets.filter(s => s.winner === 'red').length;
  return { blue, red };
}

interface MatchCardProps {
  match: MatchSummary;
  onResume: (id: string) => void;
  onFinish: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (match: MatchSummary) => void;
  onViewStats: (id: string) => void;
}

export function MatchCard({ match, onResume, onFinish, onDelete, onShare, onViewStats }: MatchCardProps) {
  const { t } = useTranslation();
  const sc = matchScore(match);
  const isLive = !match.finished;
  const blueWins = sc.blue > sc.red;
  const redWins = sc.red > sc.blue;

  return (
    <div
      className="group border-b border-border py-4 last:border-b-0 flex items-center gap-3 cursor-pointer"
      onClick={() => onResume(match.id)}
    >
      {/* Left: teams + metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">{match.teamNames.blue}</span>
          <span className="text-[11px] text-border">vs</span>
          <span className="text-sm font-medium text-foreground truncate">{match.teamNames.red}</span>
          {match.metadata?.isPerformanceMode && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/20">PERF</span>
          )}
          {isLive && (
            <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[9px] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-live-pulse" />
              Live
            </span>
          )}
        </div>
        <p className="text-[11px] text-border mt-0.5">
          {t('common.volleyball', 'Volleyball')} · {formatDate(match.updatedAt)}
        </p>
      </div>

      {/* Center: score */}
      <div className="flex items-baseline gap-1.5 tabular-nums text-lg shrink-0">
        <span className={isLive ? 'text-accent font-bold' : blueWins ? 'text-foreground font-bold' : 'text-muted-foreground font-bold'}>
          {sc.blue}
        </span>
        <span className="text-border text-sm">-</span>
        <span className={isLive ? 'text-accent font-bold' : redWins ? 'text-foreground font-bold' : 'text-muted-foreground font-bold'}>
          {sc.red}
        </span>
      </div>

      {/* Right: actions + chevron */}
      <div className="flex items-center gap-1.5 shrink-0">
        {match.finished ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-border hover:text-foreground hover:bg-secondary transition-all outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card shadow-lg">
              <DropdownMenuItem onClick={() => onViewStats(match.id)} className="cursor-pointer py-2.5">
                <BarChart2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-xs">{t('home.viewStats', 'Statistiques detaillees')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { const { exportMatchToExcel } = await import('@/lib/excelExport'); exportMatchToExcel(match.completedSets, match.points, match.currentSetNumber, match.teamNames, match.players || []); }} className="cursor-pointer py-2.5">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-xs">{t('heatmap.excelXlsx', 'Excel (.xlsx)')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(match)} className="cursor-pointer py-2.5">
                <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-xs">{t('home.shareMatch', 'Partager le match')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => onDelete(match.id)} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2.5">
                <Trash2 className="mr-2 h-4 w-4" />
                <span className="font-semibold text-xs">{t('common.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onFinish(match.id); }}
              className="p-1.5 rounded-lg text-border hover:text-foreground hover:bg-secondary transition-all"
              title={t('home.finishMatch')}
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(match.id); }}
              className="p-1.5 rounded-lg text-border hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        <span className="text-border group-hover:text-foreground transition-colors">
          <ChevronRight size={16} />
        </span>
      </div>
    </div>
  );
}
