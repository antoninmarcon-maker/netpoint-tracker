import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2, X, Check, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PointType, getScoredActionsForSport, getFaultActionsForSport, getNeutralActionsForSport } from '@/types/sports';
import {
  getActionsConfig, toggleActionVisibility, addCustomAction,
  updateCustomAction, deleteCustomAction, updateDefaultActionConfig
} from '@/lib/actionsConfig';
import type { ActionsConfig as ActionsConfigType } from '@/lib/actionsConfig';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export default function ActionsConfig() {
  const { t } = useTranslation();
  useDocumentMeta({ titleKey: 'meta.actionsTitle', descriptionKey: 'meta.actionsDesc', path: '/actions' });
  const navigate = useNavigate();
  const [config, setConfig] = useState<ActionsConfigType>(getActionsConfig);
  const [addingCategory, setAddingCategory] = useState<PointType | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newSigil, setNewSigil] = useState('');
  const [newShowOnCourt, setNewShowOnCourt] = useState(false);
  const [newAssignToPlayer, setNewAssignToPlayer] = useState(true);
  const [newHasDirection, setNewHasDirection] = useState(false);
  const [newHasRating, setNewHasRating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSigil, setEditSigil] = useState('');
  const [editShowOnCourt, setEditShowOnCourt] = useState(false);
  const [editAssignToPlayer, setEditAssignToPlayer] = useState(true);
  const [editHasDirection, setEditHasDirection] = useState(false);
  const [editHasRating, setEditHasRating] = useState(false);

  // Track which category's accordion is open. Default: 'neutral' (Faits de jeu)
  const [expandedCategory, setExpandedCategory] = useState<PointType | null>('neutral');

  const sport = 'volleyball' as const;

  const handleToggle = useCallback((key: string) => { setConfig(toggleActionVisibility(key)); }, []);

  const handleUpdateDefault = useCallback((key: string) => {
    setConfig(updateDefaultActionConfig(key, editAssignToPlayer, editHasDirection, editHasRating));
    setEditingId(null);
  }, [editAssignToPlayer, editHasDirection, editHasRating]);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim() || !addingCategory) return;
    const sigil = newSigil || undefined;
    const showOnCourt = newHasDirection ? true : newShowOnCourt;
    setConfig(addCustomAction(newLabel, sport, addingCategory, undefined, sigil, showOnCourt, newAssignToPlayer, newHasDirection, newHasRating));
    setNewLabel(''); setNewSigil(''); setNewShowOnCourt(addingCategory !== 'neutral'); setNewAssignToPlayer(true); setNewHasDirection(false); setNewHasRating(false); setAddingCategory(null);
  }, [newLabel, addingCategory, newSigil, newShowOnCourt, newAssignToPlayer, newHasDirection, newHasRating]);

  const handleUpdate = useCallback((id: string) => {
    if (!editLabel.trim()) return;
    const showOnCourt = editHasDirection ? true : editShowOnCourt;
    setConfig(updateCustomAction(id, editLabel, undefined, editSigil || undefined, showOnCourt, editAssignToPlayer, editHasDirection, editHasRating));
    setEditingId(null);
  }, [editLabel, editSigil, editShowOnCourt, editAssignToPlayer, editHasDirection, editHasRating]);

  const handleDelete = useCallback((id: string) => { setConfig(deleteCustomAction(id)); }, []);

  const renderCategory = (category: PointType) => {
    const defaultActions = category === 'scored' ? getScoredActionsForSport(sport) : category === 'fault' ? getFaultActionsForSport(sport) : getNeutralActionsForSport(sport);
    const customs = config.customActions.filter(c => c.sport === sport && c.category === category);
    const categoryLabel = category === 'scored' ? t('actionsConfig.scored') : category === 'fault' ? t('actionsConfig.faults') : t('actionsConfig.neutral');

    // Total number of actions currently in this category
    const actionCount = defaultActions.length + customs.length;

    const isExpanded = expandedCategory === category;

    return (
      <div className="space-y-2 border border-border/60 bg-card rounded-xl overflow-hidden">
        <div
          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${isExpanded ? 'bg-secondary/30 border-b border-border/50' : ''}`}
          onClick={() => setExpandedCategory(isExpanded ? null : category)}
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{categoryLabel} <span className="text-xs font-normal text-muted-foreground ml-1">({actionCount})</span></h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isExpanded) setExpandedCategory(category);
              setAddingCategory(category);
              setNewLabel('');
              setNewSigil('');
              setNewShowOnCourt(category !== 'neutral');
              setNewAssignToPlayer(true);
              setNewHasDirection(false);
              setNewHasRating(false);
            }}
            className={`flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-md hover:bg-primary/10 transition-colors ${category === 'neutral' && customs.length === 0 ? 'animate-pulse' : ''}`}
          >
            <Plus size={14} /> {t('actionsConfig.addAction')}
          </button>
        </div>

        {isExpanded && (
          <div className="p-3 bg-secondary/10 space-y-2">
            {defaultActions.map(a => {
              const isHidden = config.hiddenActions.includes(a.key);
              const desc = (a as any).description;
              const overrides = config.defaultActionsConfig?.[a.key] || {};
              const isEditing = editingId === a.key;

              const currentAssignToPlayer = overrides.assignToPlayer ?? true;
              const currentHasDirection = overrides.hasDirection ?? false;
              const currentHasRating = overrides.hasRating ?? (a as any).hasRating ?? (['attack'].includes(a.key) || ['Réception', 'Passe', 'Service', 'Attaque', 'Défense', 'Block', 'block'].includes(a.label));

              return (
                <div key={a.key} className={`rounded-lg border transition-all ${isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-border bg-card shadow-sm'}`}>
                  <div className="flex items-center justify-between p-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground flex-1 min-w-[100px]">{t(`actions.${a.key}`, a.label)}</span>
                          <div className="flex items-center gap-2 w-auto">
                            <button onClick={() => handleUpdateDefault(a.key)} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all"><X size={16} /></button>
                          </div>
                        </div>
                        <div className="bg-muted/40 p-3 rounded-xl space-y-3.5 border border-border/50">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">👤</span> {t('actionsConfig.assignToPlayer')}</Label>
                            <Switch checked={editAssignToPlayer} onCheckedChange={setEditAssignToPlayer} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">🎯</span> Indiquer une trajectoire</Label>
                            <Switch checked={editHasDirection} onCheckedChange={setEditHasDirection} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-foreground flex items-center gap-2">Évaluer la qualité (🔴 🟠 🟢)</Label>
                            <Switch checked={editHasRating} onCheckedChange={setEditHasRating} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {t(`actions.${a.key}`, a.label)}
                            {currentHasDirection && <span className="ml-1 text-[10px] text-muted-foreground">🎯</span>}
                            {currentAssignToPlayer === false && <span className="ml-1 text-[10px] text-muted-foreground">👤✗</span>}
                            {currentHasRating && <span className="ml-1 text-[10px] text-muted-foreground">⭐️</span>}
                          </span>
                          {desc && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const el = (e.currentTarget.parentElement?.parentElement?.nextElementSibling as HTMLElement);
                                if (el) el.classList.toggle('hidden');
                              }}
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title={t('actionsConfig.showDesc')}
                            >
                              <Info size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggle(a.key)} className="p-1.5 rounded-md hover:bg-secondary transition-colors" title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}>
                            {isHidden ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-foreground" />}
                          </button>
                          {a.key !== 'timeout' && (
                            <button onClick={() => {
                              setEditingId(a.key);
                              setEditAssignToPlayer(currentAssignToPlayer);
                              setEditHasDirection(currentHasDirection);
                              setEditHasRating(currentHasRating);
                            }} className="p-1.5 rounded-md hover:bg-secondary transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {desc && !isEditing && (
                    <div className="hidden px-3 pb-3 -mt-1">
                      <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-2.5 py-1.5">{t(desc)}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {customs.map(c => {
              const isHidden = config.hiddenActions.includes(c.id);
              return (
                <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-primary/30 bg-primary/10 shadow-sm'}`}>
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="h-9 text-sm font-semibold flex-1 min-w-0" onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)} autoFocus />
                        <button onClick={() => handleUpdate(c.id)} className="p-1.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-all"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all"><X size={16} /></button>
                      </div>
                      <div className="bg-background/90 p-3 rounded-xl space-y-3.5 border border-border/50 shadow-sm">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">👤</span> {t('actionsConfig.assignToPlayer')}</Label>
                          <Switch checked={editAssignToPlayer} onCheckedChange={setEditAssignToPlayer} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">📍</span> {category !== 'neutral' ? t('actionsConfig.showOnCourt') : 'Placer sur le terrain'}</Label>
                          <Switch checked={editHasDirection ? true : editShowOnCourt} onCheckedChange={v => { setEditShowOnCourt(v); if (!v) setEditHasDirection(false); }} disabled={editHasDirection} />
                        </div>
                        {editShowOnCourt && category === 'neutral' && (
                          <div className="flex items-center justify-between pl-6 border-l-2 border-primary/20 ml-2 mb-1">
                            <Label className="text-[11px] text-muted-foreground">Sigle à afficher (max 2 car.)</Label>
                            <Input value={editSigil} onChange={e => setEditSigil(e.target.value.slice(0, 2).toUpperCase())} placeholder={t('actionsConfig.sigilPlaceholder')} className="h-8 text-[11px] w-14 font-bold text-center uppercase" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">🎯</span> Indiquer une trajectoire</Label>
                          <Switch checked={editHasDirection} onCheckedChange={v => { setEditHasDirection(v); if (v) setEditShowOnCourt(true); }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-2">Évaluer la qualité (🔴 🟠 🟢)</Label>
                          <Switch checked={editHasRating} onCheckedChange={setEditHasRating} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">
                        {c.label}
                        {c.sigil && <span className="ml-1.5 inline-flex items-center justify-center w-6 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold">{c.sigil}</span>}
                        {c.showOnCourt && <span className="ml-1 text-[10px] text-muted-foreground">📍</span>}
                        {c.hasDirection && <span className="ml-1 text-[10px] text-muted-foreground">🎯</span>}
                        {c.assignToPlayer === false && <span className="ml-1 text-[10px] text-muted-foreground">👤✗</span>}
                        {c.hasRating && <span className="ml-1 text-[10px] text-muted-foreground">⭐️</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggle(c.id)} className="p-1.5 rounded-md hover:bg-secondary transition-colors" title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}>{isHidden ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-foreground" />}</button>
                        <button onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditSigil(c.sigil ?? ''); setEditShowOnCourt(c.showOnCourt ?? false); setEditAssignToPlayer(c.assignToPlayer ?? true); setEditHasDirection(c.hasDirection ?? false); setEditHasRating(c.hasRating ?? false); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {addingCategory === category && (
              <div className="flex flex-col gap-3 p-3 rounded-xl border-2 border-primary border-dashed bg-primary/10 shadow-sm mt-3">
                <div className="flex items-center gap-2">
                  <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={t('actionsConfig.newActionPlaceholder')} className="h-9 text-sm font-semibold flex-1 min-w-0" onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
                  <button onClick={handleAdd} disabled={!newLabel.trim()} className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-all"><Check size={16} /></button>
                  <button onClick={() => setAddingCategory(null)} className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all"><X size={16} /></button>
                </div>
                <div className="bg-background/90 p-3 rounded-xl space-y-3.5 border border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">👤</span> {t('actionsConfig.assignToPlayer')}</Label>
                    <Switch checked={newAssignToPlayer} onCheckedChange={setNewAssignToPlayer} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">📍</span> {category !== 'neutral' ? t('actionsConfig.showOnCourt') : 'Placer sur le terrain'}</Label>
                    <Switch checked={newHasDirection ? true : newShowOnCourt} onCheckedChange={v => { setNewShowOnCourt(v); if (!v) setNewHasDirection(false); }} disabled={newHasDirection} />
                  </div>
                  {newShowOnCourt && category === 'neutral' && (
                    <div className="flex items-center justify-between pl-6 border-l-2 border-primary/20 ml-2 mb-1">
                      <Label className="text-[11px] text-muted-foreground">Sigle à afficher (max 2 car.)</Label>
                      <Input value={newSigil} onChange={e => setNewSigil(e.target.value.slice(0, 2).toUpperCase())} placeholder={t('actionsConfig.sigilPlaceholder')} className="h-8 text-[11px] w-14 font-bold text-center uppercase" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-2"><span className="text-base">🎯</span> Indiquer une trajectoire</Label>
                    <Switch checked={newHasDirection} onCheckedChange={v => { setNewHasDirection(v); if (v) setNewShowOnCourt(true); }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-2">Évaluer la qualité (🔴 🟠 🟢)</Label>
                    <Switch checked={newHasRating} onCheckedChange={setNewHasRating} />
                  </div>
                </div>
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
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={18} /></button>
        <h1 className="text-lg font-bold text-foreground">{t('actionsConfig.title')}</h1>
      </header>
      <main className="p-4 max-w-lg mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">{t('actionsConfig.description')}</p>
        {renderCategory('neutral')}
        {renderCategory('scored')}
        {renderCategory('fault')}
      </main>
    </div>
  );
}
