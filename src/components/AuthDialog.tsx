import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateTutorialStep, linkUserToSubscription } from '@/lib/pushNotifications';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuest?: () => void;
  message?: string;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'signup-done';

export function AuthDialog({ open, onOpenChange, onGuest, message }: AuthDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword('');
    setShowPassword(false);
  };

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      toast.error(t('auth.emailRequired'));
      return;
    }
    if (mode !== 'forgot' && !password.trim()) {
      toast.error(t('auth.passwordRequired'));
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      toast.error(t('resetPassword.minLength'));
      return;
    }
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t('auth.resetEmailSent'));
        switchMode('login');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        switchMode('signup-done');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('auth.connected'));
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(t('auth.googleError') + error.message);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) switchMode('login'); onOpenChange(v); }}>
      <DialogContent className="max-w-sm rounded-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {mode === 'forgot' ? t('auth.forgotPassword') : mode === 'signup' || mode === 'signup-done' ? t('auth.signup') : t('auth.login')}
          </DialogTitle>
        </DialogHeader>
        {message && <p className="text-xs text-center text-muted-foreground bg-secondary/50 rounded-lg p-2">{message}</p>}

        {mode === 'signup-done' ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-action-scored" />
              <p className="text-sm text-foreground font-medium">{t('auth.checkEmailTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('auth.checkEmail')}</p>
            </div>
            <button onClick={() => switchMode('login')} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
              {t('auth.backToLogin')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mode !== 'forgot' && (
              <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm font-medium hover:bg-secondary transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Google
              </button>
            )}
            {mode !== 'forgot' && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t('common.or')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10"
                onKeyDown={e => e.key === 'Enter' && (mode === 'forgot' ? handleEmailAuth() : undefined)}
              />
              {mode !== 'forgot' && (
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? t('auth.passwordMinHint') : t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-10 pr-10"
                    onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
            </div>
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <button onClick={() => switchMode('forgot')} className="text-xs text-primary hover:underline">{t('auth.forgotPasswordLink')}</button>
                <button
                  onClick={async () => {
                    if (!email.trim()) { toast.error(t('auth.emailRequired')); return; }
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
              <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">{t('auth.backToLogin')}</button>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
