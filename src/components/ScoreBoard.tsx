import { Undo2, RotateCcw, Flag, ArrowLeftRight, Play, Pause, Timer, Pencil, Plus, X, ChevronDown, Trophy, Square } from 'lucide-react';
import { Team, PointType, ActionType, SportType, Point, MatchMetadata, getScoredActionsForSport, getFaultActionsForSport, getNeutralActionsForSport, getPeriodLabel } from '@/types/sports';
import { getVisibleActions } from '@/lib/actionsConfig';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ScoreBoardProps {
  onCustomActionLabel?: (label: string) => void;
  score: { blue: number; red: number };
  points: Point[];
  selectedTeam: Team | null;
  selectedPointType: PointType | null;
  selectedAction: ActionType | null;
  currentSetNumber: number;
  teamNames: { blue: string; red: string };
  sidesSwapped: boolean;
  chronoRunning: boolean;
  chronoSeconds: number;
  servingTeam: Team | null;
  sport: SportType;
  metadata?: MatchMetadata;
  onSelectAction: (team: Team, type: PointType, action: ActionType) => void;
  onCancelSelection: () => void;
  onUndo: () => void;
  onReset: () => void;
  onEndSet: () => void;
  onFinishMatch: () => void;
  onSwitchSides: () => void;
  onStartChrono: () => void;
  onPauseChrono: () => void;
  onSetTeamNames: (names: { blue: string; red: string }) => void;
  canUndo: boolean;
  isFinished?: boolean;
  waitingForNewSet?: boolean;
  lastEndedSetScore?: { blue: number; red: number } | null;
  onStartNewSet?: () => void;
  /** Performance Mode props */
  rallyInProgress?: boolean;
  rallyActionCount?: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type MenuTab = 'scored' | 'fault' | 'neutral';

export function ScoreBoard({
  score, points, selectedTeam, selectedPointType, selectedAction,
  onSelectAction, onCancelSelection, onUndo, onReset, onEndSet, onFinishMatch, onSwitchSides,
  onStartChrono, onPauseChrono, onSetTeamNames, canUndo,
  currentSetNumber, teamNames, sidesSwapped, chronoRunning, chronoSeconds,
  servingTeam, sport, metadata,
  isFinished = false, waitingForNewSet = false, lastEndedSetScore, onStartNewSet,
  rallyInProgress = false, rallyActionCount = 0,
}: ScoreBoardProps) {
  const { t } = useTranslation();
  const [editingNames, setEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(teamNames);
  const [menuTeam, setMenuTeam] = useState<Team | null>(null);
  const [menuTab, setMenuTab] = useState<MenuTab>('scored');
  const [confirmEndSet, setConfirmEndSet] = useState(false);
  const [confirmEndMatch, setConfirmEndMatch] = useState(false);

  const periodLabel = getPeriodLabel(sport);

  const left: Team = sidesSwapped ? 'red' : 'blue';
  const right: Team = sidesSwapped ? 'blue' : 'red';

  const saveNames = () => {
    onSetTeamNames({
      blue: nameInputs.blue.trim() || t('scoreboard.blue'),
      red: nameInputs.red.trim() || t('scoreboard.red'),
    });
    setEditingNames(false);
  };

  const handleActionSelect = (action: ActionType, customLabel?: string, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean, hasDirection?: boolean) => {
    if (!menuTeam) return;
    const type: PointType = menuTab;

    const placeOnCourt = showOnCourt ?? (type === 'neutral' ? false : true);
    (window as any).__pendingPlaceOnCourt = placeOnCourt;
    (window as any).__pendingCustomAssignToPlayer = assignToPlayer ?? true;

    if (customLabel) { (window as any).__pendingCustomActionLabel = customLabel; }
    if (sigil) { (window as any).__pendingCustomSigil = sigil; }
    if (showOnCourt) { (window as any).__pendingCustomShowOnCourt = true; }
    if (hasDirection) { (window as any).__pendingHasDirection = true; }

    onSelectAction(menuTeam, type, action);
    setMenuTeam(null);
  };

  const openMenu = (team: Team) => { setMenuTeam(team); setMenuTab('scored'); };
  const closeMenu = () => { setMenuTeam(null); };

  const SERVICE_SCORED_ACTIONS: ActionType[] = ['ace'];
  const SERVICE_FAULT_ACTIONS: ActionType[] = ['service_miss'];

  const getScoredActions = () => {
    const defaults = getScoredActionsForSport(sport);
    const visible = getVisibleActions(sport, 'scored', defaults);
    if (!servingTeam || !menuTeam) return visible;
    return visible.filter(a => {
      if (SERVICE_SCORED_ACTIONS.includes(a.key as ActionType) && servingTeam !== menuTeam) return false;
      return true;
    });
  };

  const getFilteredFaultActions = () => {
    const defaults = getFaultActionsForSport(sport);
    const visible = getVisibleActions(sport, 'fault', defaults);
    if (!servingTeam || !menuTeam) return visible;
    const opponent = menuTeam === 'blue' ? 'red' : 'blue';
    const faultingTeam = opponent;
    return visible.filter(a => {
      if (SERVICE_FAULT_ACTIONS.includes(a.key as ActionType) && faultingTeam !== servingTeam) return false;
      return true;
    });
  };

  const allActions = [...getScoredActionsForSport(sport), ...getFaultActionsForSport(sport), ...getNeutralActionsForSport(sport)];

  const hasNeutralActions = useMemo(() => {
    const neutralDefaults = getNeutralActionsForSport(sport);
    const neutralVisible = getVisibleActions(sport, 'neutral', neutralDefaults);
    return neutralVisible.length > 0;
  }, [sport]);

  return (
    <div className="space-y-3">
      {/* Set + Chrono */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{periodLabel} {currentSetNumber}</p>
        <div className="flex items-center gap-2">
          <Timer size={14} className="text-muted-foreground" />
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">{formatTime(chronoSeconds)}</span>
          <button
            onClick={chronoRunning ? onPauseChrono : onStartChrono}
            className={`p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all ${!chronoRunning && !isFinished ? 'animate-pulse ring-2 ring-primary/40' : ''}`}
          >
            {chronoRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Rally in progress badge */}
      {rallyInProgress && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 animate-pulse">
          <span className="text-xs font-bold text-primary">⚡ {t('scoreboard.rallyInProgress')}</span>
          <span className="text-xs font-mono font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">{rallyActionCount}</span>
        </div>
      )}

      {/* Action buttons */}
      {!isFinished && !waitingForNewSet && (
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={onUndo} disabled={!canUndo} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all">
            <Undo2 size={16} /> {t('scoreboard.undo')}
          </button>
          <button onClick={onSwitchSides} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
            <ArrowLeftRight size={16} /> {t('scoreboard.switch')}
          </button>
          <button onClick={() => setConfirmEndSet(true)} disabled={!canUndo} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all">
            <Flag size={16} /> {t('scoreboard.endPeriod', { period: periodLabel })}
          </button>
        </div>
      )}

      {/* Team names editing */}
      {editingNames ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-team-blue font-semibold">{t('scoreboard.blueTeam')}</label>
            <Input value={nameInputs.blue} onChange={e => setNameInputs(prev => ({ ...prev, blue: e.target.value }))} className="h-8 text-sm" placeholder={t('scoreboard.blue')} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-team-red font-semibold">{t('scoreboard.redTeam')}</label>
            <Input value={nameInputs.red} onChange={e => setNameInputs(prev => ({ ...prev, red: e.target.value }))} className="h-8 text-sm" placeholder={t('scoreboard.red')} />
          </div>
          <button onClick={saveNames} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground">OK</button>
        </div>
      ) : (
        <button onClick={() => { setNameInputs(teamNames); setEditingNames(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <Pencil size={10} /> {t('scoreboard.editNames')}
        </button>
      )}

      {/* Score display */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[left]}</p>
            {servingTeam === left && <span className="text-[10px]" title="Au service">🏐</span>}
          </div>
          <p className={`text-5xl font-black tabular-nums ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{score[left]}</p>
          {menuTeam === left && (
            <div className="flex justify-center mt-1">
              <ChevronDown size={28} strokeWidth={3} className={`${left === 'blue' ? 'text-team-blue' : 'text-team-red'} opacity-60 animate-bounce`} />
            </div>
          )}
          <button
            onClick={() => openMenu(left)}
            disabled={!!selectedTeam || isFinished || waitingForNewSet}
            className={`mt-2 w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              left === 'blue' ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30' : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
            }`}
          >
            <Plus size={24} className="mx-auto" />
          </button>
        </div>
        <div className="text-muted-foreground text-lg font-bold">VS</div>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[right]}</p>
            {servingTeam === right && <span className="text-[10px]" title="Au service">🏐</span>}
          </div>
          <p className={`text-5xl font-black tabular-nums ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{score[right]}</p>
          {menuTeam === right && (
            <div className="flex justify-center mt-1">
              <ChevronDown size={28} strokeWidth={3} className={`${right === 'blue' ? 'text-team-blue' : 'text-team-red'} opacity-60 animate-bounce`} />
            </div>
          )}
          <button
            onClick={() => openMenu(right)}
            disabled={!!selectedTeam || isFinished || waitingForNewSet}
            className={`mt-2 w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              right === 'blue' ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30' : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
            }`}
          >
            <Plus size={24} className="mx-auto" />
          </button>
        </div>
      </div>

      {/* Action selection menu */}
      {menuTeam && (
        <div className="bg-card rounded-xl border border-border p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-2 flex-1">
              <button onClick={() => setMenuTab('scored')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${menuTab === 'scored' ? 'bg-action-scored text-action-scored-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                ⚡ {t('scoreboard.scoredVolley')}
              </button>
              <button onClick={() => setMenuTab('fault')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${menuTab === 'fault' ? 'bg-action-fault text-action-fault-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                ❌ {t('scoreboard.faultVolley')}
              </button>
              {hasNeutralActions && (
                <button onClick={() => setMenuTab('neutral')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${menuTab === 'neutral' ? 'bg-muted text-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  📊 {t('scoreboard.neutralTab')}
                </button>
              )}
            </div>
            <button onClick={closeMenu} className="p-1 rounded-md text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(menuTab === 'scored' ? getScoredActions() : menuTab === 'fault' ? getFilteredFaultActions() : getVisibleActions(sport, 'neutral', getNeutralActionsForSport(sport))).map(a => (
              <button
                key={a.customId ?? a.key}
                onClick={() => handleActionSelect(a.key as ActionType, a.customId ? a.label : undefined, a.sigil, a.showOnCourt, (a as any).assignToPlayer, (a as any).hasDirection)}
                className={`py-2.5 px-2 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                  menuTab === 'scored' ? 'bg-action-scored/10 text-action-scored hover:bg-action-scored/20 border border-action-scored/20'
                    : menuTab === 'fault' ? 'bg-action-fault/10 text-action-fault hover:bg-action-fault/20 border border-action-fault/20'
                    : 'bg-muted/50 text-foreground hover:bg-muted border border-border'
                }`}
              >
                {a.customId ? a.label : t(`actions.${a.key}`, a.label)}
                {a.sigil && <span className="ml-1 text-[10px] opacity-60">({a.sigil})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active selection indicator */}
      {selectedTeam && selectedAction && (window as any).__pendingPlaceOnCourt !== false && (
        <div className="flex items-center justify-between bg-accent/50 rounded-lg p-2.5 border border-accent">
          <p className="text-sm text-foreground">
            <span className="font-bold">{teamNames[selectedTeam]}</span> — {
              (window as any).__pendingCustomActionLabel || t(`actions.${selectedAction}`, allActions.find(a => a.key === selectedAction)?.label ?? selectedAction)
            }
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground animate-pulse">{selectedPointType === 'neutral' ? t('scoreboard.touchCourtNeutral') : t('scoreboard.touchCourt')}</span>
            <button onClick={onCancelSelection} className="p-1 rounded-md text-muted-foreground hover:text-foreground"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Status indicators */}
      {isFinished ? (
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('scoreboard.matchFinished')}</p>
        </div>
      ) : waitingForNewSet ? (
        <div className="space-y-3">
          <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20 space-y-1">
            <p className="text-sm font-bold text-primary">{t('scoreboard.periodFinished', { period: periodLabel })}</p>
            {lastEndedSetScore && (
              <p className="text-xs text-muted-foreground">
                <Trophy size={12} className="inline mr-1" />
                {t('scoreboard.setWinner', { team: lastEndedSetScore.blue >= lastEndedSetScore.red ? teamNames.blue : teamNames.red })} — <span className="font-bold text-team-blue">{lastEndedSetScore.blue}</span> – <span className="font-bold text-team-red">{lastEndedSetScore.red}</span>
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onStartNewSet} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] hover:opacity-90">
              <Play size={16} /> {t('scoreboard.newPeriod', { period: periodLabel })}
            </button>
            <button onClick={() => setConfirmEndMatch(true)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm transition-all active:scale-[0.98] hover:bg-secondary/80 border border-border">
              <Square size={16} /> {t('scoreboard.endMatch')}
            </button>
          </div>
        </div>
      ) : null}

      {/* AlertDialog: Confirm end match */}
      {confirmEndMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmEndMatch(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">{t('scoreboard.confirmEndMatchTitle')}</h2>
            <p className="text-sm text-muted-foreground text-center">{t('scoreboard.confirmEndMatchDesc')}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEndMatch(false)} className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">{t('common.cancel')}</button>
              <button onClick={() => { setConfirmEndMatch(false); onFinishMatch(); }} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center">
                {t('scoreboard.confirmEndMatchAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEndSet && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmEndSet(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">{t('scoreboard.confirmEndPeriod', { period: periodLabel.toLowerCase() })}</h2>
            <p className="text-sm text-muted-foreground text-center">
              {t('scoreboard.currentScore')} <span className="font-bold text-team-blue">{score.blue}</span> – <span className="font-bold text-team-red">{score.red}</span>. {t('scoreboard.sidesSwapped')}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEndSet(false)} className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">{t('common.cancel')}</button>
              <button onClick={() => { setConfirmEndSet(false); onEndSet(); }} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5">
                <Flag size={16} /> {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
