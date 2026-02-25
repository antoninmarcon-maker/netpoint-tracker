import { ChevronLeft, ChevronRight, Radio, X } from 'lucide-react';
import { Point, RallyAction, ActionType } from '@/types/sports';
import { useTranslation } from 'react-i18next';

interface PlayByPlayNavigatorProps {
  points: Point[];
  viewingPointIndex: number;
  viewingActionIndex: number;
  onChangePoint: (index: number) => void;
  onChangeAction: (index: number) => void;
  onBackToLive: () => void;
}

const ACTION_LABELS: Partial<Record<ActionType, string>> = {
  attack: 'Attaque', ace: 'Ace', block: 'Block', bidouille: 'Bidouille',
  seconde_main: '2M', out: 'Out', net_fault: 'Filet', service_miss: 'Srv',
  block_out: 'BkO', gameplay_fault: 'FJ', opponent_fault: 'FA',
  timeout: 'T.Mort', other_offensive: 'Autre', other_volley_fault: 'Autre',
  other_volley_neutral: 'Autre',
};

export function PlayByPlayNavigator({
  points, viewingPointIndex, viewingActionIndex,
  onChangePoint, onChangeAction, onBackToLive,
}: PlayByPlayNavigatorProps) {
  const { t } = useTranslation();
  const point = points[viewingPointIndex];
  if (!point) return null;

  const rallyActions = point.rallyActions ?? [];
  const hasRally = rallyActions.length > 0;
  const currentAction: RallyAction | null = hasRally ? rallyActions[viewingActionIndex] ?? null : null;

  const actionLabel = currentAction
    ? (currentAction.customActionLabel || t(`actions.${currentAction.action}`, ACTION_LABELS[currentAction.action] ?? currentAction.action))
    : null;

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Back to live button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToLive}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-all"
        >
          <Radio size={14} /> {t('playByPlay.backToLive')}
        </button>
        <span className="text-xs text-muted-foreground font-mono">
          {t('playByPlay.pointOf', { current: viewingPointIndex + 1, total: points.length })}
        </span>
      </div>

      {/* Point navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onChangePoint(viewingPointIndex - 1)}
          disabled={viewingPointIndex <= 0}
          className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-foreground">
            {t('playByPlay.point')} #{viewingPointIndex + 1}
          </p>
          <p className={`text-xs font-semibold ${point.team === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>
            {point.type === 'scored' ? '⚡' : point.type === 'fault' ? '❌' : '📊'}{' '}
            {point.customActionLabel || t(`actions.${point.action}`, ACTION_LABELS[point.action] ?? point.action)}
            {hasRally && <span className="ml-1 text-muted-foreground">({rallyActions.length} actions)</span>}
          </p>
        </div>
        <button
          onClick={() => onChangePoint(viewingPointIndex + 1)}
          disabled={viewingPointIndex >= points.length - 1}
          className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Rally sub-action navigation */}
      {hasRally && (
        <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg p-2">
          <button
            onClick={() => onChangeAction(viewingActionIndex - 1)}
            disabled={viewingActionIndex <= 0}
            className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-foreground">
              {t('playByPlay.actionOf', { current: viewingActionIndex + 1, total: rallyActions.length })}
              {' : '}
              <span className={currentAction?.team === 'blue' ? 'text-team-blue' : 'text-team-red'}>
                {actionLabel}
              </span>
              {currentAction?.playerId && (
                <span className="text-muted-foreground ml-1">
                  (#{currentAction.playerId.slice(0, 4)})
                </span>
              )}
            </p>
            {currentAction?.type && (
              <p className="text-[10px] text-muted-foreground">
                {currentAction.type === 'scored' ? '⚡ Point' : currentAction.type === 'fault' ? '❌ Faute' : '📊 Neutre'}
                {currentAction.startX != null && currentAction.endX != null && ' — 🎯 Direction'}
              </p>
            )}
          </div>
          <button
            onClick={() => onChangeAction(viewingActionIndex + 1)}
            disabled={viewingActionIndex >= rallyActions.length - 1}
            className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
