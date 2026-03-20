import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getDemoMatch, DEMO_MATCH_ID } from '@/lib/demoMatch';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, History, Trash2, Eye, Play, Info, CheckCircle2, Loader2, X, MessageSquare, Share2, Copy, Mail, MoreVertical, FileSpreadsheet, BarChart2, Users, Settings2, Activity, Trophy, MapPin, Download, LinkIcon, Sparkles, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAllMatches, createNewMatch, saveMatch, setActiveMatchId, deleteMatch, getMatch } from '@/lib/matchStorage';
import { syncLocalMatchesToCloud, getCloudMatches, saveCloudMatch, deleteCloudMatch, getCloudMatchById, generateShareToken } from '@/lib/cloudStorage';
import { updateTutorialStep, getNotificationPermission, subscribeToPush } from '@/lib/pushNotifications';
import { MatchSummary, SetData, Team, SportType } from '@/types/sports';
import { toast } from 'sonner';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { AuthDialog } from '@/components/AuthDialog';
import { SavedPlayersManager } from '@/components/SavedPlayersManager';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

import { exportMatchToExcel } from '@/lib/excelExport';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { userStorage } from '@/lib/userStorage';

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
    <div className="bg-card rounded-xl p-5 border border-border/60 space-y-3 relative shadow-sm">
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      )}
      <div className="flex items-center gap-2">
        <Info size={16} className="text-muted-foreground" />
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
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [enableRatings, setEnableRatings] = useState(true);

  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [showSavedPlayers, setShowSavedPlayers] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showShareInvite, setShowShareInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [selectedWhatsNew, setSelectedWhatsNew] = useState<any | null>(null);
  const [sharingMatch, setSharingMatch] = useState<MatchSummary | null>(null);
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [shareLinkUrl, setShareLinkUrl] = useState('');
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);

  const [dismissedWhatsNew, setDismissedWhatsNew] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedWhatsNew') || '[]');
    } catch {
      return [];
    }
  });

  const handleDismissWhatsNew = (id: string, action?: () => void) => {
    const next = [...dismissedWhatsNew, id];
    setDismissedWhatsNew(next);
    localStorage.setItem('dismissedWhatsNew', JSON.stringify(next));
    if (action) action();
  };

  const whatsNewCards = useMemo(() => [
    {
      id: 'spot-filters',
      icon: <SlidersHorizontal size={32} className="text-muted-foreground mb-2" />,
      images: [],
      title: t('home.whatsNewSpotFilters'),
      desc: t('home.whatsNewSpotFiltersDesc'),
      btnText: t('home.whatsNewSpotFiltersBtn'),
      action: () => navigate('/spots'),
    },
    {
      id: 'ai-analysis',
      icon: <Sparkles size={32} className="text-muted-foreground mb-2" />,
      images: [],
      title: t('home.whatsNewAiAnalysis'),
      desc: t('home.whatsNewAiAnalysisDesc'),
      btnText: t('home.whatsNewAiAnalysisBtn'),
      action: () => {
        const lastFinished = matches.find(m => m.finished);
        if (lastFinished) {
          navigate(`/match/${lastFinished.id}?tab=stats`);
        } else {
          toast.info(t('home.noFinishedMatch', 'Aucun match terminé. Jouez un match pour obtenir une analyse IA !'));
        }
      },
    },
    {
      id: 'spot-explorer',
      icon: <MapPin size={32} className="text-muted-foreground mb-2" />,
      images: [],
      title: t('home.whatsNewSpots'),
      desc: t('home.whatsNewSpotsDesc'),
      btnText: t('home.whatsNewSpotsBtn'),
      action: () => navigate('/spots'),
    },
    {
      id: 'tournaments',
      icon: <Trophy size={32} className="text-muted-foreground mb-2" />,
      images: ["/assets/whatsnew/tournoi1.PNG", "/assets/whatsnew/tournoi2.PNG", "/assets/whatsnew/tournoi3.PNG"],
      title: t('home.whatsNewTournaments'),
      desc: t('home.whatsNewTournamentsDesc'),
      btnText: t('home.whatsNewTournamentsBtn'),
      action: () => navigate('/tournaments'),
    },
    {
      id: 'perf',
      icon: <Activity size={32} className="text-muted-foreground mb-2" />,
      images: ["/assets/whatsnew/Mode perf.jpeg"],
      title: t('home.whatsNewPerfMode'),
      desc: t('home.whatsNewPerfModeDesc'),
      btnText: t('home.whatsNewPerfModeBtn'),
      action: () => {
        setHasCourt(true);
        setIsPerformanceMode(true);
        setShowNew(true);
      },
    },
    {
      id: 'actions',
      icon: <Settings2 size={32} className="text-muted-foreground mb-2" />,
      images: ["/assets/whatsnew/actions persos.jpeg"],
      title: t('home.whatsNewCustomActions'),
      desc: t('home.whatsNewCustomActionsDesc'),
      btnText: t('home.whatsNewCustomActionsBtn'),
      action: () => navigate('/actions')
    },
    {
      id: 'players',
      icon: <Users size={32} className="text-muted-foreground mb-2" />,
      images: ["/assets/whatsnew/joueurs1.jpeg", "/assets/whatsnew/joueurs2.jpeg"],
      title: t('home.whatsNewSavedPlayers'),
      desc: t('home.whatsNewSavedPlayersDesc'),
      btnText: t('home.whatsNewSavedPlayersBtn'),
      action: () => navigate('/players')
    }
  ], [t, navigate, matches]);

  const visibleWhatsNew = whatsNewCards.filter(c => !dismissedWhatsNew.includes(c.id));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const progress = maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    // Initial call
    onScroll();

    return () => el.removeEventListener('scroll', onScroll);
  }, [visibleWhatsNew.length]);

  useEffect(() => {
    if (isHovered || visibleWhatsNew.length <= 1) return;

    const interval = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      // If we are at the end, jump back to start
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Scroll exactly one item width approx
        const itemWidth = el.scrollWidth / visibleWhatsNew.length;
        el.scrollBy({ left: itemWidth, behavior: 'smooth' });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isHovered, visibleWhatsNew.length]);

  // Auto-scroll carousel in the "En savoir plus" modal
  useEffect(() => {
    if (!selectedWhatsNew || selectedWhatsNew.images.length <= 1) return;
    const el = document.getElementById('whats-new-modal-carousel');
    if (!el) return;
    const interval = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const itemWidth = el.scrollWidth / selectedWhatsNew.images.length;
        el.scrollBy({ left: itemWidth, behavior: 'smooth' });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedWhatsNew]);

  useEffect(() => {
    if (localStorage.getItem('welcomeSeen') !== 'true') {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeDismiss = () => {
    localStorage.setItem('welcomeSeen', 'true');
    setShowWelcome(false);
  };

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
    const hasCreated = userStorage.getItem('hasCreatedMatch');
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

    const metadata = { hasCourt, isPerformanceMode, enableRatings };
    const match = createNewMatch({ blue: blueName, red: redName }, 'volleyball', metadata);

    saveMatch(match);
    setActiveMatchId(match.id);
    userStorage.setItem('hasCreatedMatch', 'true');
    if (user) {
      saveCloudMatch(user.id, match).catch(err => { if (import.meta.env.DEV) console.error('Cloud save failed:', err); }
      );
    }
    updateTutorialStep(1).catch(() => { });
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

  const getMatchScoreText = (match: MatchSummary) => {
    const setsWon = { blue: 0, red: 0 };
    const setDetails: string[] = [];
    for (const s of match.completedSets) {
      if (s.winner === 'blue') setsWon.blue++;
      else if (s.winner === 'red') setsWon.red++;
      setDetails.push(`${s.score.blue}-${s.score.red}`);
    }
    // Current set in progress
    const pts = match.points || [];
    const curBlue = pts.filter(p => p.team === 'blue').length;
    const curRed = pts.filter(p => p.team === 'red').length;
    if (!match.finished && (curBlue > 0 || curRed > 0)) {
      setDetails.push(`${curBlue}-${curRed}*`);
    }

    let text = `🏐 ${match.teamNames.blue} vs ${match.teamNames.red}\n`;
    text += `${t('common.sets', 'Sets')}: ${setsWon.blue} - ${setsWon.red}`;
    if (setDetails.length > 0) {
      text += ` (${setDetails.join(', ')})`;
    }
    if (match.finished) text += ` ✅`;
    return text;
  };

  // Resolve or generate the share link URL for a match (returns null if not logged in)
  const resolveShareUrl = async (match: MatchSummary): Promise<string | null> => {
    if (!user) return null;
    try {
      const token = await generateShareToken(match.id);
      if (!token) return null;
      return `https://www.my-volley.com/shared/${token}`;
    } catch {
      return null;
    }
  };

  const getShareText = async (match: MatchSummary): Promise<string> => {
    const score = getMatchScoreText(match);
    const url = await resolveShareUrl(match);
    return url ? `${score}\n${url}` : score;
  };

  const handleShareNative = async (match: MatchSummary) => {
    const text = await getShareText(match);
    const url = await resolveShareUrl(match);
    if (navigator.share) {
      try { await navigator.share({ title: `${match.teamNames.blue} vs ${match.teamNames.red}`, text, ...(url ? { url } : {}) }); } catch {}
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success(t('heatmap.linkCopied'))).catch(() => {});
    }
  };

  const handleCopyScore = (match: MatchSummary) => {
    navigator.clipboard.writeText(getMatchScoreText(match))
      .then(() => toast.success(t('heatmap.linkCopied')))
      .catch(() => toast.error(t('heatmap.linkCopyError')));
  };

  const handleShareWhatsApp = async (match: MatchSummary) => {
    const text = await getShareText(match);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = async (match: MatchSummary) => {
    const text = await getShareText(match);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareX = async (match: MatchSummary) => {
    const text = await getShareText(match);
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleGenerateShareLink = async (match: MatchSummary) => {
    if (!user) { toast.error(t('heatmap.loginForLink')); return; }
    setGeneratingShareLink(true);
    try {
      const url = await resolveShareUrl(match);
      if (!url) throw new Error('No token');
      setShareLinkUrl(url);
      setSharingMatch(null);
      setShareLinkDialogOpen(true);
    } catch {
      toast.error(t('heatmap.linkError'));
    } finally {
      setGeneratingShareLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLinkUrl);
      toast.success(t('heatmap.linkCopied'));
    } catch {
      toast.error(t('heatmap.linkCopyError'));
    }
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
      if (user) {
        await saveCloudMatch(user.id, updated);
        // Delete from local storage only if cloud save was successful
        deleteMatch(updated.id);
      }
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
    <>
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

      <main className="flex-1 overflow-auto p-4 max-w-xl mx-auto w-full space-y-6 animate-fade-in">
        <PwaInstallBanner />

        {visibleWhatsNew.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base">✨</span>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{t('home.whatsNew')}</h2>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto pb-3 snap-x hide-scrollbar px-1 cursor-grab active:cursor-grabbing"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={() => setIsHovered(true)}
              onTouchEnd={() => setIsHovered(false)}
            >
              {visibleWhatsNew.map((card) => (
                <div key={card.id} className="min-w-[75%] max-w-[280px] snap-center shrink-0">
                  <div className="bg-card rounded-xl border border-border/60 overflow-hidden h-full flex flex-col relative w-full card-hover shadow-sm">
                    <button
                      onClick={() => handleDismissWhatsNew(card.id)}
                      className="absolute top-1.5 right-1.5 z-10 p-1 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                      title={t('common.close')}
                    >
                      <X size={12} />
                    </button>
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      {card.icon}
                      <h3 className="font-bold text-foreground leading-tight text-sm">{card.title}</h3>
                      <p className="text-[11px] text-muted-foreground flex-1 leading-relaxed">{card.desc}</p>
                    </div>
                    <div className="px-3 pb-3 space-y-1.5">
                      <button
                        onClick={() => setSelectedWhatsNew(card)}
                        className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-[11px] hover:bg-secondary/80 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} /> {t('home.learnMore', 'En savoir plus')}
                      </button>
                      <button
                        onClick={() => handleDismissWhatsNew(card.id, card.action)}
                        className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-[11px] hover:bg-secondary/80 transition-all"
                      >
                        {card.btnText}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Design Progress Bar (Desktop focused) */}
            <div className="mt-4 px-1 flex flex-col items-center gap-4">
              <div
                className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden relative cursor-pointer group backdrop-blur-sm"
                onClick={(e) => {
                  const el = scrollContainerRef.current;
                  if (!el) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  const maxScroll = el.scrollWidth - el.clientWidth;
                  el.scrollTo({ left: percent * maxScroll, behavior: 'smooth' });
                }}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_12px_rgba(var(--primary),0.8)]"
                  style={{ width: `${scrollProgress}%` }}
                />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
              </div>

              <div className="flex gap-2">
                {visibleWhatsNew.map((_, i) => {
                  const itemPercent = (i / Math.max(1, visibleWhatsNew.length - 1)) * 100;
                  const isActive = Math.abs(scrollProgress - itemPercent) < (100 / visibleWhatsNew.length / 2);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const el = scrollContainerRef.current;
                        if (!el) return;
                        const itemWidth = el.scrollWidth / visibleWhatsNew.length;
                        el.scrollTo({ left: i * itemWidth, behavior: 'smooth' });
                      }}
                      className={`h-2 transition-all duration-500 rounded-full ${isActive ? 'w-8 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]' : 'w-2 bg-muted hover:bg-muted-foreground/40'}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Modal "En grand" pour une nouveauté */}
        <Dialog open={!!selectedWhatsNew} onOpenChange={(open) => !open && setSelectedWhatsNew(null)}>
          <DialogContent className="max-w-md w-[90vw] p-0 rounded-2xl overflow-hidden bg-background border border-border shadow-xl">
            {selectedWhatsNew && (
              <div className="flex flex-col max-h-[85vh]">
                <div className="relative p-0 flex flex-col bg-muted/20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWhatsNew(null);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar max-h-[65vh]" id="whats-new-modal-carousel">
                    {selectedWhatsNew.images.map((img: string, idx: number) => (
                      <div key={idx} className="min-w-full snap-center relative flex-shrink-0 flex items-center justify-center bg-black/5">
                        <img
                          src={img}
                          alt={`${selectedWhatsNew.title} ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-[65vh]"
                        />
                      </div>
                    ))}
                  </div>
                  {selectedWhatsNew.images.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                      {selectedWhatsNew.images.map((_: any, i: number) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-3 overflow-y-auto">
                  <div>
                    <h2 className="text-xl font-black text-foreground">{selectedWhatsNew.title}</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{selectedWhatsNew.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedWhatsNew(null);
                      handleDismissWhatsNew(selectedWhatsNew.id, selectedWhatsNew.action);
                    }}
                    className="mt-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all shadow-lg"
                  >
                    {selectedWhatsNew.btnText}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>


        {/* Share / Invite Dialog */}
        <Dialog open={showShareInvite} onOpenChange={setShowShareInvite}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold">{t('home.inviteTitle')}</DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">{t('home.inviteDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* Email */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="h-10 flex-1"
                />
                <button
                  disabled={!inviteEmail.trim() || !inviteEmail.includes('@') || inviteSending}
                  onClick={async () => {
                    setInviteSending(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('invite-user', { body: { email: inviteEmail.trim() } });
                      if (error) throw error;
                      if (data?.already_registered) {
                        toast.info(t('home.inviteAlreadyRegistered'));
                      } else {
                        toast.success(t('home.inviteSent'));
                      }
                      setInviteEmail('');
                      setShowShareInvite(false);
                    } catch (err: any) {
                      toast.error(t('home.inviteError'));
                    } finally {
                      setInviteSending(false);
                    }
                  }}
                  className="px-3 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center gap-1.5"
                >
                  {inviteSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} {t('common.send')}
                </button>
              </div>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{t('home.shareOn')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'WhatsApp', icon: '💬', url: `https://wa.me/?text=${encodeURIComponent(`${t('home.inviteText')} https://www.my-volley.com`)}` },
                  { label: 'X', icon: '𝕏', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${t('home.inviteText')} https://www.my-volley.com`)}` },
                  { label: 'Facebook', icon: '📘', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.my-volley.com')}` },
                  { label: 'Telegram', icon: '✈️', url: `https://t.me/share/url?url=${encodeURIComponent('https://www.my-volley.com')}&text=${encodeURIComponent(t('home.inviteText'))}` },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => { window.open(s.url, '_blank'); setShowShareInvite(false); }}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all text-xs font-medium text-foreground"
                  >
                    <span className="text-lg">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{t('common.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Copy link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://www.my-volley.com')
                    .then(() => { toast.success(t('heatmap.linkCopied')); setShowShareInvite(false); })
                    .catch(() => toast.error(t('heatmap.linkCopyError')));
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-all"
              >
                <Copy size={14} /> {t('home.copyAppLink')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          onClick={() => setShowNew(true)}
          className="w-full rounded-xl py-6 text-sm font-semibold"
        >
          <Plus size={18} className="mr-2" />
          {t('home.newMatch')}
        </Button>

        {!user && (
          <Button
            variant="secondary"
            onClick={() => {
              saveMatch(getDemoMatch());
              setActiveMatchId(DEMO_MATCH_ID);
              navigate(`/match/${DEMO_MATCH_ID}`);
            }}
            className="w-full rounded-xl py-6 text-sm font-semibold"
          >
            <Eye size={18} className="mr-2" />
            {t('home.demoMatch')}
          </Button>
        )}

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-w-sm rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                <Switch id="court-mode" checked={hasCourt} onCheckedChange={(v) => { setHasCourt(v); if (!v) setIsPerformanceMode(false); }} />
                <div className="flex-1">
                  <Label htmlFor="court-mode" className="text-sm font-semibold cursor-pointer">{t('home.interactiveCourt')}</Label>
                  <p className="text-[10px] text-muted-foreground">{t('home.interactiveCourtHint')}</p>
                </div>
              </div>
              {hasCourt && (
                <div className="flex items-center space-x-2 bg-secondary/30 p-3 rounded-xl border border-border">
                  <Switch id="performance-mode" checked={isPerformanceMode} onCheckedChange={setIsPerformanceMode} />
                  <div className="flex-1">
                    <Label htmlFor="performance-mode" className="text-sm font-semibold cursor-pointer">{t('home.performanceMode')}</Label>
                    <p className="text-[10px] text-muted-foreground">{t('home.performanceModeHint')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2 bg-secondary/30 p-2 rounded-xl border border-border">
                <Switch id="enable-ratings" checked={enableRatings} onCheckedChange={setEnableRatings} />
                <div className="flex-1">
                  <Label htmlFor="enable-ratings" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">Notations <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="w-1.5 h-1.5 rounded-full bg-destructive" /></span></Label>
                  <p className="text-[9px] text-muted-foreground">Évaluer la qualité de chaque action</p>
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
            <div className="rounded-[14px] border border-border bg-card p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t('home.previousMatches')}</h2>
              {matches.map(match => {
                const sc = matchScore(match);
                const isLive = !match.finished;
                const blueWins = sc.blue > sc.red;
                const redWins = sc.red > sc.blue;
                return (
                  <div
                    key={match.id}
                    className="group border-b border-border py-4 last:border-b-0 flex items-center gap-3 cursor-pointer"
                    onClick={() => handleResume(match.id)}
                  >
                    {/* Left: teams + metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{match.teamNames.blue}</span>
                        <span className="text-[11px] text-border">vs</span>
                        <span className="text-sm font-medium text-foreground truncate">{match.teamNames.red}</span>
                        {(match as any).metadata?.isPerformanceMode && (
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
                            <DropdownMenuItem onClick={() => { setActiveMatchId(match.id); navigate(`/match/${match.id}?tab=stats`); }} className="cursor-pointer py-2.5">
                              <BarChart2 className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-xs">{t('home.viewStats', 'Statistiques détaillées')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportMatchToExcel(match.completedSets, match.points, match.currentSetNumber, match.teamNames, match.players || [])} className="cursor-pointer py-2.5">
                              <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-xs">{t('heatmap.excelXlsx', 'Excel (.xlsx)')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSharingMatch(match)} className="cursor-pointer py-2.5">
                              <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-xs">{t('home.shareMatch', 'Partager le match')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem onClick={() => setDeletingId(match.id)} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2.5">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span className="font-semibold text-xs">{t('common.delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFinishingId(match.id); }}
                            className="p-1.5 rounded-lg text-border hover:text-foreground hover:bg-secondary transition-all"
                            title={t('home.finishMatch')}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(match.id); }}
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
              })}
            </div>
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

      {/* Share Match Dialog */}
      <Dialog open={!!sharingMatch} onOpenChange={(open) => !open && setSharingMatch(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 size={18} /> {t('home.shareMatch', 'Partager le match')}
            </DialogTitle>
            {sharingMatch && (
              <DialogDescription>
                {sharingMatch.teamNames.blue} vs {sharingMatch.teamNames.red}
              </DialogDescription>
            )}
          </DialogHeader>
          {sharingMatch && (
            <div className="space-y-2">
              <button onClick={() => { handleShareNative(sharingMatch); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <Share2 size={16} className="text-muted-foreground" /> {t('heatmap.shareDots', 'Partager…')}
              </button>
              <button onClick={() => handleShareWhatsApp(sharingMatch)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">💬</span> WhatsApp
              </button>
              <button onClick={() => handleShareTelegram(sharingMatch)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">✈️</span> Telegram
              </button>
              <button onClick={() => handleShareX(sharingMatch)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">𝕏</span> X (Twitter)
              </button>
              <div className="h-px bg-border my-1" />
              <button onClick={() => handleCopyScore(sharingMatch)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <Copy size={16} className="text-muted-foreground" /> {t('heatmap.copyScore', 'Copier le score')}
              </button>
              <button onClick={() => exportMatchToExcel(sharingMatch.completedSets, sharingMatch.points, sharingMatch.currentSetNumber, sharingMatch.teamNames, sharingMatch.players || [])} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <FileSpreadsheet size={16} className="text-muted-foreground" /> {t('heatmap.excelXlsx', 'Excel (.xlsx)')}
              </button>
              {user && (
                <button onClick={() => handleGenerateShareLink(sharingMatch)} disabled={generatingShareLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all">
                  <LinkIcon size={16} /> {generatingShareLink ? t('heatmap.generatingLink', 'Génération...') : t('heatmap.shareLink', '🔗 Lien de partage')}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Link Ready Dialog */}
      <Dialog open={shareLinkDialogOpen} onOpenChange={setShareLinkDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('heatmap.linkReadyTitle')}</DialogTitle>
            <DialogDescription>{t('heatmap.linkReadyDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input readOnly value={shareLinkUrl} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <div className="flex gap-2">
              <button onClick={handleCopyShareLink} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all">
                {t('heatmap.copyLink')}
              </button>
              <button onClick={() => window.open(shareLinkUrl, '_blank', 'noopener,noreferrer')} className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-all">
                {t('heatmap.openSharedPage')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="sticky bottom-0 z-30 glass border-t border-border/50 px-4 py-3 flex items-center justify-around gap-2">
        <button
          onClick={() => navigate('/spots')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <MapPin size={16} />
          {t('home.whatsNewSpots')}
        </button>
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
        <Link
          to="/privacy"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          Privacy
        </Link>
      </footer>
    </>
  );
}
