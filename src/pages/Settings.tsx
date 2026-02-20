import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MessageSquare, ShieldCheck, UserRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [club, setClub] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Feedback
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const isOAuthUser = user?.app_metadata?.provider && user.app_metadata.provider !== 'email';

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }
      const u = session.user;
      setUser(u);
      setDisplayName(u.user_metadata?.full_name || '');

      // Load profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, club')
        .eq('user_id', u.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || u.user_metadata?.full_name || '');
        setClub(profile.club || '');
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // Upsert profile
      const { error } = await supabase.from('profiles').upsert(
        { user_id: user.id, display_name: displayName.trim(), club: club.trim() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;

      // Also update auth metadata for display name
      await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });

      toast.success('Profil mis à jour !');
    } catch (err: any) {
      console.error('[Settings] Save profile error:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Mot de passe mis à jour !');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMsg.trim() || !user) return;
    setSendingFeedback(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        email: user.email || '',
        message: feedbackMsg.trim(),
      });
      if (error) throw error;
      toast.success('Merci pour votre retour !');
      setFeedbackMsg('');
    } catch (err: any) {
      console.error('[Settings] Feedback error:', err);
      toast.error(err.message || 'Erreur inattendue.');
    } finally {
      setSendingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 py-4 border-b border-border flex items-center gap-3">
        <Link to="/" className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-foreground">Paramètres</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Section 1: Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound size={18} className="text-primary" />
              Profil utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nom d'affichage</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Votre nom"
                className="h-9"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Club de sport</label>
              <Input
                value={club}
                onChange={e => setClub(e.target.value)}
                placeholder="Ex : Capbreton Volley"
                className="h-9"
                maxLength={100}
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer les modifications
            </button>
          </CardContent>
        </Card>

        {/* Section 2: Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={18} className="text-primary" />
              Sécurité et mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isOAuthUser ? (
              <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                ⚠️ La gestion du mot de passe n'est pas disponible pour les comptes connectés via Google ou Apple.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Nouveau mot de passe</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Confirmer le mot de passe</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez le mot de passe"
                    className="h-9"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword.trim()}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                >
                  {savingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Feedback */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare size={18} className="text-primary" />
              Support et feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={feedbackMsg}
              onChange={e => setFeedbackMsg(e.target.value)}
              placeholder="Dites-nous ce que vous pensez, ce qui pourrait être amélioré…"
              className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={2000}
            />
            <button
              onClick={handleSendFeedback}
              disabled={sendingFeedback || !feedbackMsg.trim()}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              {sendingFeedback ? 'Envoi…' : 'Envoyer le feedback'}
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
