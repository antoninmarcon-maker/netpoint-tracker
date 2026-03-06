import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateTutorialStep, linkUserToSubscription } from '@/lib/pushNotifications';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuest?: () => void;
  message?: string;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthDialog({ open, onOpenChange, onGuest, message }: AuthDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || (!password.trim() && mode !== 'forgot')) return;
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t('auth.resetEmailSent'));
        setMode('login');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t('auth.checkEmail'));
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('auth.connected'));
        // Tutorial step 1 → 2: user logged in, link subscription
        if (data.user) {
          linkUserToSubscription(data.user.id).catch(() => { });
          updateTutorialStep(2).catch(() => { });
        }
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || t('auth.authError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (error) toast.error(t('auth.googleError') + (error as any).message);
  };

  const handleApple = async () => {
    const { error } = await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin });
    if (error) toast.error(t('auth.appleError') + (error as any).message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {mode === 'forgot' ? t('auth.forgotPassword') : mode === 'signup' ? t('auth.signup') : t('auth.login')}
          </DialogTitle>
        </DialogHeader>
        {message && <p className="text-xs text-center text-muted-foreground bg-secondary/50 rounded-lg p-2">{message}</p>}
        <div className="space-y-3">
          {mode !== 'forgot' && (
            <div className="flex gap-2">
              <button onClick={handleGoogle} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-secondary transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Google
              </button>
              <button onClick={handleApple} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-secondary transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.02 8.8 8.78c1.27.06 2.15.72 2.9.76.98-.2 1.92-.77 2.98-.7 1.26.1 2.21.6 2.83 1.5-2.59 1.55-1.97 4.96.35 5.92-.47 1.24-.68 1.78-1.31 2.88-.53.9-.95 1.44-1.5 2.14zM12.08 8.66c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                Apple
              </button>
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t('common.or')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="space-y-2">
            <Input type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} className="h-10" />
            {mode !== 'forgot' && (
              <Input type="password" placeholder={t('auth.passwordPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} className="h-10" onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} />
            )}
          </div>
          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <button onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">{t('auth.forgotPasswordLink')}</button>
              <button
                onClick={async () => {
                  if (!email.trim()) { toast.error(t('auth.emailPlaceholder')); return; }
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithOtp({
                      email,
                      options: { emailRedirectTo: `${window.location.origin}/settings#password` },
                    });
                    if (error) throw error;
                    toast.success(t('auth.magicLinkSent'));
                  } catch (err: any) {
                    toast.error(err.message || t('auth.authError'));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="text-xs text-primary hover:underline"
              >
                {t('auth.magicLink')}
              </button>
            </div>
          )}
          <button onClick={handleEmailAuth} disabled={loading} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {loading ? '...' : mode === 'forgot' ? t('auth.sendLink') : mode === 'signup' ? t('auth.createAccount') : t('auth.signIn')}
          </button>
          {mode !== 'forgot' && (
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">{t('auth.backToLogin')}</button>
          )}
          {onGuest && mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t('common.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button onClick={() => { onGuest(); onOpenChange(false); }} className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-all">
                {t('auth.continueGuest')}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
