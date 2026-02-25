import { useState, useEffect, useCallback } from 'react';
import { getDemoMatch, DEMO_MATCH_ID } from '@/lib/demoMatch';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, History, Trash2, Eye, Play, Info, CheckCircle2, LogIn, HelpCircle, Loader2, X, MessageSquare, ImagePlus, Share2, Copy, Mail } from 'lucide-react';
import logoCapbreton from '@/assets/logo-capbreton.jpeg';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAllMatches, createNewMatch, saveMatch, setActiveMatchId, deleteMatch, getMatch } from '@/lib/matchStorage';
import { syncLocalMatchesToCloud, getCloudMatches, saveCloudMatch, deleteCloudMatch, getCloudMatchById } from '@/lib/cloudStorage';
import { updateTutorialStep, getNotificationPermission, subscribeToPush } from '@/lib/pushNotifications';
import { MatchSummary, SetData, Team, SportType } from '@/types/sports';
import { toast } from 'sonner';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { AuthDialog } from '@/components/AuthDialog';
import { UserMenu } from '@/components/UserMenu';
import { SavedPlayersManager } from '@/components/SavedPlayersManager';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function matchScore(match: MatchSummary) {
  const blue = match.completedSets.filter(s => s.winner === 'blue').length;
  const red = match.completedSets.filter(s => s.winner === 'red').length;
  return { blue, red };
}

function Instructions({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card rounded-xl p-5 border border-border space-y-3 relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      )}
      <div className="flex items-center gap-2">
        <Info size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">{t('home.howItWorks')}</h3>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong className="text-foreground">{t('home.howItWorksP1')}</strong></p>
        <p><strong className="text-foreground">{t('home.howItWorksP2')}</strong></p>
        <p><strong className="text-foreground">{t('home.howItWorksP3')}</strong></p>
        <p><strong className="text-foreground">{t('home.howItWorksP4')}</strong></p>
        <p><strong className="text-foreground">{t('home.howItWorksP5')}</strong></p>
        <p><strong className="text-foreground">{t('home.howItWorksP6')}</strong></p>
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [guestDismissed, setGuestDismissed] = useState(() => sessionStorage.getItem('guestDismissed') === 'true');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [names, setNames] = useState({ blue: '', red: '' });
  const [hasCourt, setHasCourt] = useState(true);
  
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [showSavedPlayers, setShowSavedPlayers] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showShareInvite, setShowShareInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (localStorage.getItem('welcomeSeen') !== 'true') {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeDismiss = () => {
    localStorage.setItem('welcomeSeen', 'true');
    setShowWelcome(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem('customLogo');
    if (saved) setCustomLogo(saved);
  }, []);

  const loadMatches = useCallback(async (currentUser: User | null, showSpinner = false) => {
    if (showSpinner) setLoadingMatches(true);
    let all: MatchSummary[];
    if (currentUser) {
      all = await getCloudMatches();
    } else {
      all = getAllMatches();
    }
    const active = all.filter(m => !m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
    const finished = all.filter(m => m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
    setMatches([...active, ...finished]);
    setLoadingMatches(false);
  }, []);

  useEffect(() => {
    const localMatches = getAllMatches();
    if (localMatches.length > 0) {
      const active = localMatches.filter(m => !m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
      const finished = localMatches.filter(m => m.finished).sort((a, b) => b.updatedAt - a.updatedAt);
      setMatches([...active, ...finished]);
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(async () => {
          if (!isMounted) return;
          await syncLocalMatchesToCloud(u.id);
          await loadMatches(u);
        }, 0);
      } else if (authLoaded) {
        loadMatches(null);
      }
    });

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await syncLocalMatchesToCloud(u.id);
        }
        await loadMatches(u);
      } finally {
        if (isMounted) setAuthLoaded(true);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadMatches]);

  useEffect(() => {
    if (!authLoaded) return;
    if (user) {
      setShowAuth(false);
      return;
    }
    const hasRealMatch = getAllMatches().some(m => m.id !== DEMO_MATCH_ID);
    if (!guestDismissed && hasRealMatch) {
      const alreadyShownThisSession = sessionStorage.getItem('authPromptShown');
      if (!alreadyShownThisSession) {
        sessionStorage.setItem('authPromptShown', 'true');
        const timer = setTimeout(() => setShowAuth(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, guestDismissed, authLoaded]);

  useEffect(() => {
    if (!user || !authLoaded) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!isStandalone) return;
    const hasCreated = localStorage.getItem('hasCreatedMatch');
    const hasDeclined = localStorage.getItem('hasDeclinedPushPrompt');
    if (!hasCreated || hasDeclined) return;
    const perm = getNotificationPermission();
    if (perm === 'default') {
      const timer = setTimeout(() => setShowPushPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoaded]);

  const handleCreate = () => {
    const blueName = names.blue.trim() || t('scoreboard.blue');
    const redName = names.red.trim() || t('scoreboard.red');
    
    const metadata = { hasCourt };
    const match = createNewMatch({ blue: blueName, red: redName }, 'volleyball', metadata);
    
    saveMatch(match);
    setActiveMatchId(match.id);
    localStorage.setItem('hasCreatedMatch', 'true');
    if (user) {
      saveCloudMatch(user.id, match).catch(err =>
        { if (import.meta.env.DEV) console.error('Cloud save failed:', err); }
      );
    }
    updateTutorialStep(1).catch(() => {});
    setShowNew(false);
    navigate(`/match/${match.id}`);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (user) {
      try {
        await deleteCloudMatch(id);
        deleteMatch(id);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Cloud delete failed:', err);
        toast.error(t('home.errorDeleting'));
        setDeletingId(null);
        return;
      }
    } else {
      deleteMatch(id);
    }
    setDeletingId(null);
    await loadMatches(user);
  };

  const handleFinishMatch = async (id: string) => {
    try {
      let match = getMatch(id);
      if (!match && user) {
        const cloudMatch = await getCloudMatchById(id);
        if (cloudMatch) {
          match = cloudMatch;
          saveMatch(cloudMatch);
        }
      }
      if (!match) { toast.error(t('home.matchNotFound')); setFinishingId(null); return; }

      if (match.points.length > 0) {
        const blueScore = match.points.filter(p => p.team === 'blue').length;
        const redScore = match.points.filter(p => p.team === 'red').length;
        const winner: Team = blueScore >= redScore ? 'blue' : 'red';
        const setData: SetData = {
          id: crypto.randomUUID(),
          number: match.currentSetNumber,
          points: [...match.points],
          score: { blue: blueScore, red: redScore },
          winner,
          duration: match.chronoSeconds,
        };
        match.completedSets.push(setData);
        match.points = [];
      }
      const updated = { ...match, finished: true, updatedAt: Date.now() };
      saveMatch(updated);
      if (user) await saveCloudMatch(user.id, updated);
      loadMatches(user);
      setFinishingId(null);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error finishing match:', err);
      toast.error(t('home.errorFinishing'));
      setFinishingId(null);
    }
  };

  const handleResume = (id: string) => {
    setActiveMatchId(id);
    navigate(`/match/${id}`);
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] border-b border-border flex flex-col items-center gap-3 relative">
        <div className="absolute left-4" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
          <Link
            to="/help"
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors inline-flex"
            title={t('help.title')}
          >
            <HelpCircle size={18} />
          </Link>
        </div>
        <div className="absolute right-4" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
          {user ? (
            <UserMenu user={user} onOpenSavedPlayers={() => setShowSavedPlayers(true)} />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-medium hover:bg-secondary transition-all"
            >
              <LogIn size={14} />
              {t('common.login')}
            </button>
          )}
        </div>
        {customLogo ? (
          <img src={customLogo} alt="Logo" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          user ? (
            <Link to="/settings#logo" className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all group" title={t('home.customizeLogo')}>
              <ImagePlus size={20} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
            </Link>
          ) : (
            <button onClick={() => setShowAuth(true)} className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all group" title={t('home.customizeLogo')}>
              <ImagePlus size={20} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
            </button>
          )
        )}
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight text-center">{t('home.title')}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{t('home.subtitle')}</p>
        </div>
      </header>

      <Dialog open={showWelcome} onOpenChange={(open) => { if (!open) handleWelcomeDismiss(); }}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">👋 {t('home.welcomeTitle')}</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {t('home.welcomeText')}
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={handleWelcomeDismiss}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
          >
            {t('home.welcomeStart')}
          </button>
        </DialogContent>
      </Dialog>

      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        onGuest={() => { setGuestDismissed(true); sessionStorage.setItem('guestDismissed', 'true'); }}
      />

      <Dialog open={showPushPrompt} onOpenChange={setShowPushPrompt}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{t('notifications.promptTitle')}</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {t('notifications.promptText')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowPushPrompt(false); localStorage.setItem('hasDeclinedPushPrompt', 'true'); }}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
            >
              {t('notifications.later')}
            </button>
            <button
              onClick={async () => { setShowPushPrompt(false); await subscribeToPush(); }}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
            >
              {t('notifications.enable')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-6">
        <PwaInstallBanner />

        {/* Share / Invite Dialog */}
        <Dialog open={showShareInvite} onOpenChange={setShowShareInvite}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold">{t('home.inviteTitle')}</DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">{t('home.inviteDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="h-10 flex-1"
                />
                <button
                  disabled={!inviteEmail.trim() || !inviteEmail.includes('@')}
                  onClick={() => { toast.success(t('home.inviteSent')); setInviteEmail(''); }}
                  className="px-3 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Mail size={14} /> {t('common.send')}
                </button>
              </div>
              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{t('common.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                onClick={() => {
                  const url = 'https://my-volley.lovable.app';
                  navigator.clipboard.writeText(url).then(() => toast.success(t('heatmap.linkCopied'))).catch(() => toast.error(t('heatmap.linkCopyError')));
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-all"
              >
                <Copy size={14} /> {t('home.copyAppLink')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <button
          onClick={() => setShowNew(true)}
          className="group w-full relative flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg text-white overflow-hidden transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-action-scored/25"
          style={{ background: 'linear-gradient(135deg, hsl(var(--action-cta)), hsl(var(--action-cta-end)))' }}
        >
          <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
          <Plus size={22} className="relative z-10 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative z-10">{t('home.newMatch')}</span>
        </button>

        {!user && (
          <button
            onClick={() => {
              saveMatch(getDemoMatch());
              setActiveMatchId(DEMO_MATCH_ID);
              navigate(`/match/${DEMO_MATCH_ID}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-all active:scale-[0.97]"
          >
            <Eye size={18} className="text-primary" />
            {t('home.demoMatch')}
          </button>
        )}

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold">{t('home.createMatch')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-team-blue mb-1 block">{t('home.blueTeam')} <span className="text-muted-foreground font-normal">· {t('home.blueTeamHint')}</span></label>
                  <Input
                    value={names.blue}
                    onChange={e => setNames(prev => ({ ...prev, blue: e.target.value }))}
                    placeholder={t('home.blueTeamPlaceholder')}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-team-red mb-1 block">{t('home.redTeam')}</label>
                  <Input
                    value={names.red}
                    onChange={e => setNames(prev => ({ ...prev, red: e.target.value }))}
                    placeholder={t('home.redTeamPlaceholder')}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-secondary/30 p-3 rounded-xl border border-border">
                <Switch id="court-mode" checked={hasCourt} onCheckedChange={setHasCourt} />
                <div className="flex-1">
                  <Label htmlFor="court-mode" className="text-sm font-semibold cursor-pointer">{t('home.interactiveCourt')}</Label>
                  <p className="text-[10px] text-muted-foreground">{t('home.interactiveCourtHint')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <Play size={16} /> {t('home.start')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-3">
          {loadingMatches && matches.length === 0 && user ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t('home.loadingMatches')}</span>
            </div>
          ) : matches.length === 0 ? (
            <Instructions />
          ) : (
            <>
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{t('home.previousMatches')}</h2>
            </div>
            <div className="space-y-2">
              {matches.map(match => {
                const sc = matchScore(match);
                const totalPoints = match.completedSets.reduce((sum, s) => sum + s.points.length, 0) + match.points.length;
                return (
                  <div key={match.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-base">🏐</span>
                          <span className="text-team-blue">{match.teamNames.blue}</span>
                          <span className="text-muted-foreground text-xs">vs</span>
                          <span className="text-team-red">{match.teamNames.red}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(match.updatedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-foreground tabular-nums">{sc.blue} - {sc.red}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {match.finished
                            ? (sc.blue > sc.red ? `🏆 ${match.teamNames.blue}` : sc.red > sc.blue ? `🏆 ${match.teamNames.red}` : t('home.equality'))
                            : `Set ${match.currentSetNumber} ${t('home.setInProgress')}`} · {totalPoints} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResume(match.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 text-primary font-semibold text-xs border border-primary/20 hover:bg-primary/25 transition-all"
                      >
                        {match.finished ? <><Eye size={14} /> {t('common.view')}</> : <><Play size={14} /> {t('common.resume')}</>}
                      </button>
                      {!match.finished && (
                        <button
                          onClick={() => setFinishingId(match.id)}
                          className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
                          title={t('home.finishMatch')}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingId(match.id)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </main>

      {finishingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setFinishingId(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">{t('home.finishMatch')}</h2>
            <p className="text-sm text-muted-foreground text-center">{t('home.finishMatchDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFinishingId(null)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleFinishMatch(finishingId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} /> {t('home.finish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground text-center">{t('home.deleteMatch')}</h2>
            <p className="text-sm text-muted-foreground text-center">{t('home.deleteMatchDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} /> {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <SavedPlayersManager
          open={showSavedPlayers}
          onOpenChange={setShowSavedPlayers}
          userId={user.id}
        />
      )}

      <footer className="sticky bottom-0 z-30 bg-background border-t border-border px-4 py-3 flex items-center justify-around gap-2">
        <Link
          to="/help#feedback"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <MessageSquare size={16} />
          {t('home.feedback')}
        </Link>
        <button
          onClick={() => setShowShareInvite(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
        >
          <Share2 size={16} />
          {t('home.inviteFriend')}
        </button>
        <Link
          to="/credits"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Info size={16} />
          {t('home.story')}
        </Link>
      </footer>
    </div>
  );
}
