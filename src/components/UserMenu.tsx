import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { User as SupaUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupaUser;
  onOpenSavedPlayers?: () => void;
}

export function UserMenu({ user, onOpenSavedPlayers }: UserMenuProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const displayName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Utilisateur';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
        console.error('[Feedback] Insert error:', error);
        toast.error(`Erreur : ${error.message}`);
      } else {
        toast.success('Merci pour votre retour !');
        setFeedbackMessage('');
        setShowFeedback(false);
      }
    } catch (err) {
      console.error('[Feedback] Unexpected error:', err);
      toast.error('Erreur inattendue.');
    } finally {
      setSendingFeedback(false);
    }
  };


  return (
    <>
      <button
        onClick={() => setShowMenu(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
      >
        <User size={14} />
        {displayName}
      </button>

      {/* Main menu */}
      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">Mon compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">{user.email}</p>

            <button
              onClick={() => { setShowMenu(false); setTimeout(() => setShowFeedback(true), 150); }}
              className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all"
            >
              <MessageSquare size={16} className="text-primary" /> Laisser un feedback
            </button>

            {onOpenSavedPlayers && (
              <button
                onClick={() => { setShowMenu(false); setTimeout(() => onOpenSavedPlayers(), 150); }}
                className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all"
              >
                <Users size={16} className="text-primary" /> Joueurs enregistrés
              </button>
            )}

            <button
              onClick={() => { setShowMenu(false); navigate('/settings'); }}
              className="w-full flex items-center gap-2.5 py-3 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all"
            >
              <Settings size={16} className="text-muted-foreground" /> Paramètres du compte
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-all"
            >
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">💬 Laisser un feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={feedbackMessage}
              onChange={e => setFeedbackMessage(e.target.value)}
              placeholder="Dites-nous ce que vous pensez, ce qui pourrait être amélioré…"
              className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={2000}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowFeedback(false)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSendFeedback}
                disabled={sendingFeedback || !feedbackMessage.trim()}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                {sendingFeedback ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
