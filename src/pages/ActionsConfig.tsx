import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2, X, Check, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PointType, getScoredActionsForSport, getFaultActionsForSport, getNeutralActionsForSport } from '@/types/sports';
import {
  getActionsConfig, toggleActionVisibility, addCustomAction,
  updateCustomAction, deleteCustomAction,
} from '@/lib/actionsConfig';
import type { ActionsConfig as ActionsConfigType } from '@/lib/actionsConfig';

export default function ActionsConfig() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ActionsConfigType>(getActionsConfig);
  const [addingCategory, setAddingCategory] = useState<PointType | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newSigil, setNewSigil] = useState('');
  const [newShowOnCourt, setNewShowOnCourt] = useState(false);
  const [newAssignToPlayer, setNewAssignToPlayer] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSigil, setEditSigil] = useState('');
  const [editShowOnCourt, setEditShowOnCourt] = useState(false);
  const [editAssignToPlayer, setEditAssignToPlayer] = useState(true);

  const sport = 'volleyball' as const;

  const handleToggle = useCallback((key: string) => { setConfig(toggleActionVisibility(key)); }, []);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim() || !addingCategory) return;
    const sigil = newSigil || undefined;
    setConfig(addCustomAction(newLabel, sport, addingCategory, undefined, sigil, newShowOnCourt, newAssignToPlayer));
    setNewLabel(''); setNewSigil(''); setNewShowOnCourt(true); setNewAssignToPlayer(true); setAddingCategory(null);
  }, [newLabel, addingCategory, newSigil, newShowOnCourt, newAssignToPlayer]);

  const handleUpdate = useCallback((id: string) => {
    if (!editLabel.trim()) return;
    setConfig(updateCustomAction(id, editLabel, undefined, editSigil || undefined, editShowOnCourt, editAssignToPlayer));
    setEditingId(null);
  }, [editLabel, editSigil, editShowOnCourt, editAssignToPlayer]);

  const handleDelete = useCallback((id: string) => { setConfig(deleteCustomAction(id)); }, []);

  const renderCategory = (category: PointType) => {
    const defaultActions = category === 'scored' ? getScoredActionsForSport(sport) : category === 'fault' ? getFaultActionsForSport(sport) : getNeutralActionsForSport(sport);
    const customs = config.customActions.filter(c => c.sport === sport && c.category === category);
    const categoryLabel = category === 'scored' ? t('actionsConfig.scored') : category === 'fault' ? t('actionsConfig.faults') : t('actionsConfig.neutral');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{categoryLabel}</h3>
          <button onClick={() => { setAddingCategory(category); setNewLabel(''); setNewSigil(''); setNewShowOnCourt(category !== 'neutral'); setNewAssignToPlayer(true); }}
            className={`flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium ${category === 'neutral' && customs.length === 0 ? 'animate-pulse' : ''}`}>
            <Plus size={14} /> {t('actionsConfig.addAction')}
          </button>
        </div>

        {defaultActions.map(a => {
          const isHidden = config.hiddenActions.includes(a.key);
          const desc = (a as any).description;
          return (
            <div key={a.key} className={`rounded-lg border transition-all ${isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{t(`actions.${a.key}`, a.label)}</span>
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
                <button onClick={() => handleToggle(a.key)} className="p-1.5 rounded-md hover:bg-secondary transition-colors" title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}>
                  {isHidden ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-foreground" />}
                </button>
              </div>
              {desc && (
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
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-primary/20 bg-primary/5'}`}>
              {editingId === c.id ? (
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="h-8 text-sm flex-1 min-w-[100px]" onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)} autoFocus />
                  <>
                    <div className="flex items-center gap-1.5"><Switch checked={editShowOnCourt} onCheckedChange={setEditShowOnCourt} className="scale-75" /><Label className="text-[10px] text-muted-foreground">{t('actionsConfig.showOnCourt')}</Label></div>
                    <div className="flex items-center gap-1.5"><Switch checked={editAssignToPlayer} onCheckedChange={setEditAssignToPlayer} className="scale-75" /><Label className="text-[10px] text-muted-foreground">{t('actionsConfig.assignToPlayer')}</Label></div>
                    {editShowOnCourt && category === 'neutral' && (<div className="flex items-center gap-1.5"><Input value={editSigil} onChange={e => setEditSigil(e.target.value.slice(0, 2).toUpperCase())} placeholder={t('actionsConfig.sigilPlaceholder')} className="h-8 text-sm w-14" /><span className="text-[10px] text-muted-foreground">{t('actionsConfig.sigilHelp')}</span></div>)}
                  </>
                  <button onClick={() => handleUpdate(c.id)} className="p-1 text-primary"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground">
                    {c.label}
                    {c.sigil && <span className="ml-1.5 inline-flex items-center justify-center w-6 h-5 rounded bg-muted text-muted-foreground text-[10px] font-bold">{c.sigil}</span>}
                    {c.showOnCourt && <span className="ml-1 text-[10px] text-muted-foreground">📍</span>}
                    {c.assignToPlayer === false && <span className="ml-1 text-[10px] text-muted-foreground">👤✗</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(c.id)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">{isHidden ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-foreground" />}</button>
                    <button onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditSigil(c.sigil ?? ''); setEditShowOnCourt(c.showOnCourt ?? false); setEditAssignToPlayer(c.assignToPlayer ?? true); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {addingCategory === category && (
          <div className="flex flex-col gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={t('actionsConfig.newActionPlaceholder')} className="h-8 text-sm flex-1 min-w-[100px]" onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
              <button onClick={handleAdd} disabled={!newLabel.trim()} className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"><Check size={16} /></button>
              <button onClick={() => setAddingCategory(null)} className="p-1 text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5"><Switch checked={newShowOnCourt} onCheckedChange={setNewShowOnCourt} className="scale-75" /><Label className="text-[10px] text-muted-foreground">{t('actionsConfig.showOnCourt')}</Label></div>
              <div className="flex items-center gap-1.5"><Switch checked={newAssignToPlayer} onCheckedChange={setNewAssignToPlayer} className="scale-75" /><Label className="text-[10px] text-muted-foreground">{t('actionsConfig.assignToPlayer')}</Label></div>
              {newShowOnCourt && category === 'neutral' && (<div className="flex items-center gap-1.5"><Input value={newSigil} onChange={e => setNewSigil(e.target.value.slice(0, 2).toUpperCase())} placeholder={t('actionsConfig.sigilPlaceholder')} className="h-8 text-sm w-14" /><span className="text-[10px] text-muted-foreground">{t('actionsConfig.sigilHelp')}</span></div>)}
            </div>
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
