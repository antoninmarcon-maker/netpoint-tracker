import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SportType, PointType, getScoredActionsForSport, getFaultActionsForSport, getNeutralActionsForSport } from '@/types/sports';
import {
  getActionsConfig, toggleActionVisibility, addCustomAction,
  updateCustomAction, deleteCustomAction,
} from '@/lib/actionsConfig';
import type { ActionsConfig as ActionsConfigType } from '@/lib/actionsConfig';

const SPORTS: { key: SportType; icon: string }[] = [
  { key: 'volleyball', icon: '🏐' },
  { key: 'basketball', icon: '🏀' },
  { key: 'tennis', icon: '🎾' },
  { key: 'padel', icon: '🏓' },
];

export default function ActionsConfig() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ActionsConfigType>(getActionsConfig);
  const [sport, setSport] = useState<SportType>('volleyball');
  const [addingCategory, setAddingCategory] = useState<PointType | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newPoints, setNewPoints] = useState<number>(2);
  const [newSigil, setNewSigil] = useState('');
  const [newShowOnCourt, setNewShowOnCourt] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPoints, setEditPoints] = useState<number>(2);
  const [editSigil, setEditSigil] = useState('');
  const [editShowOnCourt, setEditShowOnCourt] = useState(false);

  const handleToggle = useCallback((key: string) => {
    setConfig(toggleActionVisibility(key));
  }, []);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim() || !addingCategory) return;
    const pts = (sport === 'basketball' && addingCategory === 'scored') ? newPoints : undefined;
    const sigil = addingCategory === 'neutral' ? newSigil : undefined;
    const showOnCourt = addingCategory === 'neutral' ? newShowOnCourt : undefined;
    setConfig(addCustomAction(newLabel, sport, addingCategory, pts, sigil, showOnCourt));
    setNewLabel('');
    setNewPoints(2);
    setNewSigil('');
    setNewShowOnCourt(false);
    setAddingCategory(null);
  }, [newLabel, sport, addingCategory, newPoints, newSigil, newShowOnCourt]);

  const handleUpdate = useCallback((id: string) => {
    if (!editLabel.trim()) return;
    setConfig(updateCustomAction(id, editLabel, editPoints, editSigil || undefined, editShowOnCourt));
    setEditingId(null);
  }, [editLabel, editPoints, editSigil, editShowOnCourt]);

  const handleDelete = useCallback((id: string) => {
    setConfig(deleteCustomAction(id));
  }, []);

  const renderCategory = (category: PointType) => {
    const defaultActions = category === 'scored'
      ? getScoredActionsForSport(sport)
      : category === 'fault'
        ? getFaultActionsForSport(sport)
        : getNeutralActionsForSport(sport);

    const customs = config.customActions.filter(
      c => c.sport === sport && c.category === category
    );

    const categoryLabel = category === 'scored'
      ? t('actionsConfig.scored')
      : category === 'fault'
        ? t('actionsConfig.faults')
        : t('actionsConfig.neutral');

    const showPtsForCategory = sport === 'basketball' && category === 'scored';
    const isNeutral = category === 'neutral';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{categoryLabel}</h3>
          <button
            onClick={() => { setAddingCategory(category); setNewLabel(''); setNewSigil(''); setNewShowOnCourt(false); }}
            className={`flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium ${isNeutral && customs.length === 0 ? 'animate-pulse' : ''}`}
          >
            <Plus size={14} /> {t('actionsConfig.addAction')}
          </button>
        </div>

        {/* Default actions */}
        {defaultActions.map(a => {
          const isHidden = config.hiddenActions.includes(a.key);
          return (
            <div
              key={a.key}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-border bg-card'
              }`}
            >
              <span className="text-sm font-medium text-foreground">
                {t(`actions.${a.key}`, a.label)}
                {'points' in a && a.points != null && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{a.points as number}</span>
                )}
              </span>
              <button
                onClick={() => handleToggle(a.key)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}
              >
                {isHidden ? (
                  <EyeOff size={16} className="text-muted-foreground" />
                ) : (
                  <Eye size={16} className="text-foreground" />
                )}
              </button>
            </div>
          );
        })}

        {/* Custom actions */}
        {customs.map(c => {
          const isHidden = config.hiddenActions.includes(c.id);
          const showPts = showPtsForCategory;
          return (
          <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-primary/20 bg-primary/5'
          }`}>
            {editingId === c.id ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <Input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="h-8 text-sm flex-1 min-w-[100px]"
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)}
                  autoFocus
                />
                {showPts && (
                  <div className="flex gap-1">
                    {[1, 2, 3].map(p => (
                      <button key={p} onClick={() => setEditPoints(p)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${editPoints === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                      >{p}</button>
                    ))}
                  </div>
                )}
                {isNeutral && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={editShowOnCourt} onCheckedChange={setEditShowOnCourt} className="scale-75" />
                      <Label className="text-[10px] text-muted-foreground">{t('actionsConfig.showOnCourt')}</Label>
                    </div>
                    {editShowOnCourt && (
                      <Input
                        value={editSigil}
                        onChange={e => setEditSigil(e.target.value.slice(0, 2).toUpperCase())}
                        placeholder={t('actionsConfig.sigilPlaceholder')}
                        className="h-8 text-sm w-20"
                      />
                    )}
                  </>
                )}
                <button onClick={() => handleUpdate(c.id)} className="p-1 text-primary">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">
                  {c.label}
                  {showPts && c.points != null && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{c.points}</span>
                  )}
                  {isNeutral && c.sigil && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-6 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold">{c.sigil}</span>
                  )}
                  {isNeutral && c.showOnCourt && (
                    <span className="ml-1 text-[10px] text-muted-foreground">📍</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(c.id)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}
                  >
                    {isHidden ? (
                      <EyeOff size={14} className="text-muted-foreground" />
                    ) : (
                      <Eye size={14} className="text-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditPoints(c.points ?? 2); setEditSigil(c.sigil ?? ''); setEditShowOnCourt(c.showOnCourt ?? false); }}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}

        {/* Add form */}
        {addingCategory === category && (
          <div className="flex flex-col gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={t('actionsConfig.newActionPlaceholder')}
                className="h-8 text-sm flex-1 min-w-[100px]"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              {showPtsForCategory && (
                <div className="flex gap-1">
                  {[1, 2, 3].map(p => (
                    <button key={p} onClick={() => setNewPoints(p)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${newPoints === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                    >{p}</button>
                  ))}
                </div>
              )}
              <button
                onClick={handleAdd}
                disabled={!newLabel.trim()}
                className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button onClick={() => setAddingCategory(null)} className="p-1 text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            {isNeutral && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Switch checked={newShowOnCourt} onCheckedChange={setNewShowOnCourt} className="scale-75" />
                  <Label className="text-[10px] text-muted-foreground">{t('actionsConfig.showOnCourt')}</Label>
                </div>
                {newShowOnCourt && (
                  <Input
                    value={newSigil}
                    onChange={e => setNewSigil(e.target.value.slice(0, 2).toUpperCase())}
                    placeholder={t('actionsConfig.sigilPlaceholder')}
                    className="h-8 text-sm w-24"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('actionsConfig.title')}</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">{t('actionsConfig.description')}</p>

        <Tabs value={sport} onValueChange={v => setSport(v as SportType)}>
          <TabsList className="w-full grid grid-cols-4">
            {SPORTS.map(s => (
              <TabsTrigger key={s.key} value={s.key} className="text-xs">
                {s.icon} {t(`actionsConfig.${s.key}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {SPORTS.map(s => (
            <TabsContent key={s.key} value={s.key} className="space-y-6 mt-4">
              {renderCategory('neutral')}
              {renderCategory('scored')}
              {renderCategory('fault')}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
