import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, MessageSquare, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { User as SupaUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupaUser;
  onOpenSavedPlayers?: () => void; // kept for backwards compat, now unused
}

export function UserMenu({ user, onOpenSavedPlayers }: UserMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const displayName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Purge all local data to prevent data bleed to the next user
    localStorage.removeItem('volley-tracker-matches');
    localStorage.removeItem('volley-tracker-active-match-id');
    localStorage.removeItem('volley-tracker-last-roster');
    localStorage.removeItem('volley-tracker-saved-players');
    localStorage.removeItem('myvolley-player-numbers');
    localStorage.removeItem('myvolley-jersey-config');
    setShowMenu(false);
    window.location.reload();
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setSendingFeedback(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        email: user.email || '',
        message: feedbackMessage.trim(),
      });
      if (error) {
        toast.error(t('userMenu.feedbackError', { message: error.message }));
      } else {
        toast.success(t('userMenu.feedbackSent'));
        setFeedbackMessage('');
        setShowFeedback(false);
      }
    } catch (err) {
      toast.error(t('userMenu.feedbackUnexpected'));
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowMenu(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all">
        <User size={14} />
        {displayName}
      </button>

      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">{t('userMenu.myAccount')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">{user.email}</p>
            <button onClick={() => { setShowMenu(false); setTimeout(() => setShowFeedback(true), 150); }} className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all">
              <MessageSquare size={16} className="text-primary" /> {t('userMenu.leaveFeedback')}
            </button>
            <button onClick={() => { setShowMenu(false); navigate('/players'); }} className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all">
              <Users size={16} className="text-primary" /> {t('userMenu.savedPlayers')}
            </button>
            <button onClick={() => { setShowMenu(false); navigate('/actions'); }} className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all">
              <Zap size={16} className="text-primary" /> {t('userMenu.customActions')}
            </button>
            <button onClick={() => { setShowMenu(false); navigate('/settings'); }} className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all">
              <Settings size={16} className="text-muted-foreground" /> {t('userMenu.accountSettings')}
            </button>
            <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-all">
              <LogOut size={16} /> {t('userMenu.signOut')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">{t('userMenu.feedbackTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder={t('userMenu.feedbackPlaceholder')} className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" maxLength={2000} />
            <div className="flex gap-2">
              <button onClick={() => setShowFeedback(false)} className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleSendFeedback} disabled={sendingFeedback || !feedbackMessage.trim()} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                {sendingFeedback ? t('common.sending') : t('common.send')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
