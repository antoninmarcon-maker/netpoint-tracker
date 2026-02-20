import { Undo2, RotateCcw, Flag, ArrowLeftRight, Play, Pause, Timer, Pencil, Plus, X, ChevronDown } from 'lucide-react';
import { Team, PointType, ActionType, SportType, Point, MatchMetadata, getScoredActionsForSport, getFaultActionsForSport, getPeriodLabel } from '@/types/sports';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useTennisScore } from '@/hooks/useTennisScore';

interface ScoreBoardProps {
  score: { blue: number; red: number };
  points: Point[];
  selectedTeam: Team | null;
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
  onSwitchSides: () => void;
  onStartChrono: () => void;
  onPauseChrono: () => void;
  onSetTeamNames: (names: { blue: string; red: string }) => void;
  canUndo: boolean;
  isFinished?: boolean;
  waitingForNewSet?: boolean;
  onStartNewSet?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type MenuTab = 'scored' | 'fault';

export function ScoreBoard({
  score,
  points,
  selectedTeam,
  selectedAction,
  onSelectAction,
  onCancelSelection,
  onUndo,
  onReset,
  onEndSet,
  onSwitchSides,
  onStartChrono,
  onPauseChrono,
  onSetTeamNames,
  canUndo,
  currentSetNumber,
  teamNames,
  sidesSwapped,
  chronoRunning,
  chronoSeconds,
  servingTeam,
  sport,
  metadata,
  isFinished = false,
  waitingForNewSet = false,
  onStartNewSet,
}: ScoreBoardProps) {
  const [editingNames, setEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(teamNames);
  const [menuTeam, setMenuTeam] = useState<Team | null>(null);
  const [menuTab, setMenuTab] = useState<MenuTab>('scored');
  const [confirmEndSet, setConfirmEndSet] = useState(false);

  const isBasketball = sport === 'basketball';
  const isTennisOrPadel = sport === 'tennis' || sport === 'padel';
  const periodLabel = getPeriodLabel(sport);

  const tennisScore = useTennisScore(isTennisOrPadel ? points : [], metadata);

  const left: Team = sidesSwapped ? 'red' : 'blue';
  const right: Team = sidesSwapped ? 'blue' : 'red';

  const saveNames = () => {
    onSetTeamNames({
      blue: nameInputs.blue.trim() || 'Bleue',
      red: nameInputs.red.trim() || 'Rouge',
    });
    setEditingNames(false);
  };

  const handleActionSelect = (action: ActionType) => {
    if (!menuTeam) return;
    const type: PointType = menuTab === 'scored' ? 'scored' : 'fault';
    onSelectAction(menuTeam, type, action);
    setMenuTeam(null);
  };

  const openMenu = (team: Team) => {
    setMenuTeam(team);
    setMenuTab('scored');
  };

  const closeMenu = () => {
    setMenuTeam(null);
  };

  // Get filtered actions based on sport and context
  const getScoredActions = () => {
    const actions = getScoredActionsForSport(sport);
    if (sport === 'volleyball') {
      return actions.filter(a => {
        if (!servingTeam || !menuTeam) return true;
        if (a.key === 'ace' && servingTeam !== menuTeam) return false;
        return true;
      });
    }
    return actions;
  };

  const getFilteredFaultActions = () => {
    const actions = getFaultActionsForSport(sport);
    if (sport === 'volleyball') {
      return actions.filter(a => {
        if (!servingTeam || !menuTeam) return true;
        if (a.key === 'service_miss' && servingTeam === menuTeam) return false;
        return true;
      });
    }
    return actions;
  };

  const allActions = [...getScoredActionsForSport(sport), ...getFaultActionsForSport(sport)];

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
            className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {chronoRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Action buttons (annuler, switch, fin set) - above team names */}
      {!isFinished && !waitingForNewSet && (
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
          >
            <Undo2 size={16} /> Annuler
          </button>
          <button
            onClick={onSwitchSides}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            <ArrowLeftRight size={16} /> Switch
          </button>
          <button
            onClick={() => setConfirmEndSet(true)}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
          >
            <Flag size={16} /> Fin {periodLabel}
          </button>
        </div>
      )}

      {/* Team names editing */}
      {editingNames ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-team-blue font-semibold">Équipe Bleue</label>
            <Input
              value={nameInputs.blue}
              onChange={e => setNameInputs(prev => ({ ...prev, blue: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Bleue"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-team-red font-semibold">Équipe Rouge</label>
            <Input
              value={nameInputs.red}
              onChange={e => setNameInputs(prev => ({ ...prev, red: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Rouge"
            />
          </div>
          <button onClick={saveNames} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground">
            OK
          </button>
        </div>
      ) : (
        <button onClick={() => { setNameInputs(teamNames); setEditingNames(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <Pencil size={10} /> Modifier les noms
        </button>
      )}

      {/* Score display with + buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Tennis/Padel: games + game score row */}
        {isTennisOrPadel && (
          <div className="w-full mb-1">
            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="text-center flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Jeux</p>
                <p className={`text-3xl font-black tabular-nums ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{tennisScore.games[left]}</p>
              </div>
              <div className="text-muted-foreground text-sm font-bold">–</div>
              <div className="text-center flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Jeux</p>
                <p className={`text-3xl font-black tabular-nums ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{tennisScore.games[right]}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center flex-1">
                <p className={`text-lg font-bold tabular-nums ${left === 'blue' ? 'text-team-blue/70' : 'text-team-red/70'}`}>
                  {tennisScore.tiebreak ? 'TB ' : ''}{tennisScore.gameScore[left]}
                </p>
              </div>
              <div className="text-muted-foreground text-xs font-semibold">
                {!tennisScore.tiebreak && tennisScore.gameScore[left] === '40' && tennisScore.gameScore[right] === '40' ? 'Deuce' : ''}
                {tennisScore.gameScore[left] === 'Ad' || tennisScore.gameScore[right] === 'Ad' ? 'Avantage' : ''}
              </div>
              <div className="text-center flex-1">
                <p className={`text-lg font-bold tabular-nums ${right === 'blue' ? 'text-team-blue/70' : 'text-team-red/70'}`}>
                  {tennisScore.tiebreak ? 'TB ' : ''}{tennisScore.gameScore[right]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isTennisOrPadel && (
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[left]}</p>
            {sport === 'volleyball' && servingTeam === left && <span className="text-[10px]" title="Au service">🏐</span>}
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
              left === 'blue'
                ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30'
                : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
            }`}
          >
            <Plus size={24} className="mx-auto" />
          </button>
        </div>
        <div className="text-muted-foreground text-lg font-bold">VS</div>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[right]}</p>
            {sport === 'volleyball' && servingTeam === right && <span className="text-[10px]" title="Au service">🏐</span>}
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
              right === 'blue'
                ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30'
                : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
            }`}
          >
            <Plus size={24} className="mx-auto" />
          </button>
        </div>
      </div>
      )}

      {/* Tennis/Padel: team names + action buttons */}
      {isTennisOrPadel && (
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className={`text-xs font-semibold uppercase tracking-widest ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[left]}</p>
              <span className="text-[10px]" title="Au service">🎾</span>
            </div>
            {menuTeam === left && (
              <div className="flex justify-center mt-1">
                <ChevronDown size={28} strokeWidth={3} className={`${left === 'blue' ? 'text-team-blue' : 'text-team-red'} opacity-60 animate-bounce`} />
              </div>
            )}
            <button
              onClick={() => openMenu(left)}
              disabled={!!selectedTeam || isFinished || waitingForNewSet}
              className={`mt-2 w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                left === 'blue'
                  ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30'
                  : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
              }`}
            >
              <Plus size={24} className="mx-auto" />
            </button>
          </div>
          <div className="text-muted-foreground text-lg font-bold">VS</div>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className={`text-xs font-semibold uppercase tracking-widest ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[right]}</p>
            </div>
            {menuTeam === right && (
              <div className="flex justify-center mt-1">
                <ChevronDown size={28} strokeWidth={3} className={`${right === 'blue' ? 'text-team-blue' : 'text-team-red'} opacity-60 animate-bounce`} />
              </div>
            )}
            <button
              onClick={() => openMenu(right)}
              disabled={!!selectedTeam || isFinished || waitingForNewSet}
              className={`mt-2 w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                right === 'blue'
                  ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30'
                  : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'
              }`}
            >
              <Plus size={24} className="mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Action selection menu */}
      {menuTeam && (
        <div className="bg-card rounded-xl border border-border p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setMenuTab('scored')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  menuTab === 'scored' ? 'bg-action-scored text-action-scored-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                ⚡ {isBasketball ? 'Paniers' : isTennisOrPadel ? 'Coups Gagnants' : 'Points Gagnés'}
              </button>
              {/* Basketball: actions négatives uniquement pour l'équipe bleue */}
              {(!isBasketball || menuTeam === 'blue') && (
                <button
                  onClick={() => setMenuTab('fault')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    menuTab === 'fault' ? 'bg-action-fault text-action-fault-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  ❌ {isBasketball ? 'Actions négatives' : 'Fautes adverses'}
                </button>
              )}
            </div>
            <button onClick={closeMenu} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          {/* Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            {(menuTab === 'scored' ? getScoredActions() : getFilteredFaultActions()).map(a => (
              <button
                key={a.key}
                onClick={() => handleActionSelect(a.key)}
                className={`py-2.5 px-2 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                  menuTab === 'scored'
                    ? 'bg-action-scored/10 text-action-scored hover:bg-action-scored/20 border border-action-scored/20'
                    : 'bg-action-fault/10 text-action-fault hover:bg-action-fault/20 border border-action-fault/20'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active selection indicator */}
      {selectedTeam && selectedAction && (
        <div className="flex items-center justify-between bg-accent/50 rounded-lg p-2.5 border border-accent">
          <p className="text-sm text-foreground">
            <span className="font-bold">{teamNames[selectedTeam]}</span> — {
              allActions.find(a => a.key === selectedAction)?.label
            }
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground animate-pulse">Touchez le terrain</span>
            <button onClick={onCancelSelection} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Status indicators (finished / waiting for new set) */}
      {isFinished ? (
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">✅ Match terminé</p>
        </div>
      ) : waitingForNewSet ? (
        <div className="space-y-2">
          <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
            <p className="text-xs font-semibold text-primary">{periodLabel} terminé ! Prêt pour le suivant ?</p>
          </div>
          <button
            onClick={onStartNewSet}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] hover:opacity-90"
          >
            <Play size={16} /> Nouveau {periodLabel}
          </button>
        </div>
      ) : null}
      {confirmEndSet && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmEndSet(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">Terminer le {periodLabel.toLowerCase()} ?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Score actuel : <span className="font-bold text-team-blue">{score.blue}</span> – <span className="font-bold text-team-red">{score.red}</span>.{!isBasketball && ' Les côtés seront inversés.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEndSet(false)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => { setConfirmEndSet(false); onEndSet(); }}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Flag size={16} /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
