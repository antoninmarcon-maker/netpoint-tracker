import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MessageSquare, ShieldCheck, UserRound, Loader2, Globe, Sun, Moon, Monitor, ImagePlus, Trash2, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { isPushSupported, isIOSSafari, getNotificationPermission, subscribeToPush } from '@/lib/pushNotifications';
import type { User } from '@supabase/supabase-js';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
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
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('customLogo'));
  const logoInputId = 'logo-file-input';
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [magicLinkArrival, setMagicLinkArrival] = useState(false);
  const passwordSectionRef = useRef<HTMLDivElement>(null);

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
    setNotifPermission(getNotificationPermission());

    // Handle #password hash from magic link redirect
    if (window.location.hash === '#password') {
      setMagicLinkArrival(true);
      setTimeout(() => {
        passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').upsert(
        { user_id: user.id, display_name: displayName.trim(), club: club.trim() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
      toast.success(t('settings.profileUpdated'));
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[Settings] Save profile error:', err);
      toast.error(err.message || t('settings.saveError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('settings.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('settings.passwordUpdated'));
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
      toast.success(t('settings.feedbackSent'));
      setFeedbackMsg('');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[Settings] Feedback error:', err);
      toast.error(err.message || t('settings.feedbackError'));
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleEnableNotifications = async () => {
    setSubscribingPush(true);
    const result = await subscribeToPush();
    setSubscribingPush(false);
    setNotifPermission(getNotificationPermission());
    if (result.success) {
      toast.success(t('settings.notificationsEnabled'));
    } else {
      if (Notification.permission === 'denied') {
        toast.error(t('settings.notificationsDenied'), { duration: 10000 });
      } else {
        toast.error(result.error || t('settings.notificationsError'), { duration: 10000 });
      }
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
      <header className="sticky top-0 z-40 bg-background px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3">
        <Link to="/" className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-foreground">{t('settings.title')}</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Language */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe size={18} className="text-primary" />
              {t('settings.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('settings.languageLabel')}</label>
              <Select value={i18n.language?.startsWith('fr') ? 'fr' : 'en'} onValueChange={handleLanguageChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 {t('settings.french')}</SelectItem>
                  <SelectItem value="en">🇬🇧 {t('settings.english')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {theme === 'light' ? <Sun size={18} className="text-primary" /> : theme === 'dark' ? <Moon size={18} className="text-primary" /> : <Monitor size={18} className="text-primary" />}
              {t('settings.theme')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('settings.themeLabel')}</label>
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">🌙 {t('settings.themeDark')}</SelectItem>
                  <SelectItem value="light">☀️ {t('settings.themeLight')}</SelectItem>
                  <SelectItem value="system">💻 {t('settings.themeSystem')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell size={18} className="text-primary" />
              {t('settings.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isIOSSafari() ? (
              <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                <p>{t('settings.iosNotifWarning')}</p>
              </div>
            ) : !isPushSupported() ? (
              <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                <p>{t('settings.notifNotSupported')}</p>
              </div>
            ) : notifPermission === 'granted' ? (
              <div className="flex items-center gap-2 text-sm text-action-scored bg-action-scored/10 rounded-lg p-3">
                <Bell size={16} />
                <span>{t('settings.notificationsActive')}</span>
              </div>
            ) : notifPermission === 'denied' ? (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <BellOff size={16} />
                <span>{t('settings.notificationsDeniedInfo')}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{t('settings.notifDesc')}</p>
                <button
                  onClick={handleEnableNotifications}
                  disabled={subscribingPush}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                >
                  {subscribingPush ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  {t('settings.enableNotifications')}
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card id="logo">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImagePlus size={18} className="text-primary" />
              {t('settings.logoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('settings.logoDesc')}</p>
            <div className="flex items-center gap-3">
              {customLogo ? (
                <img src={customLogo} alt="Logo" className="w-14 h-14 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/50">
                  <ImagePlus size={18} className="text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <label htmlFor={logoInputId} className="block w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm text-center cursor-pointer hover:opacity-90 transition-opacity">
                  {t('settings.logoChoose')}
                </label>
                <input
                  id={logoInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(t('settings.logoTooLarge'));
                      return;
                    }
                    // Resize image via canvas to avoid QuotaExceededError
                    const img = new Image();
                    const objectUrl = URL.createObjectURL(file);
                    img.onload = () => {
                      URL.revokeObjectURL(objectUrl);
                      const MAX = 500;
                      let w = img.width, h = img.height;
                      if (w > MAX || h > MAX) {
                        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                        else { w = Math.round(w * MAX / h); h = MAX; }
                      }
                      const canvas = document.createElement('canvas');
                      canvas.width = w;
                      canvas.height = h;
                      const ctx = canvas.getContext('2d')!;
                      ctx.drawImage(img, 0, 0, w, h);
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                      try {
                        localStorage.setItem('customLogo', dataUrl);
                        setCustomLogo(dataUrl);
                        toast.success(t('settings.logoUpdated'));
                        navigate('/');
                      } catch {
                        toast.error(t('settings.logoTooLarge'));
                      }
                    };
                    img.onerror = () => {
                      URL.revokeObjectURL(objectUrl);
                      toast.error(t('settings.logoTooLarge'));
                    };
                    img.src = objectUrl;
                  }}
                />
                {customLogo && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('customLogo');
                      setCustomLogo(null);
                      
                      toast.success(t('settings.logoRemoved'));
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('settings.logoRemove')}
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound size={18} className="text-primary" />
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-primary/80 flex items-center gap-1">☁️ {t('settings.cloudSyncNote')}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('settings.displayName')}</label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('settings.displayNamePlaceholder')} className="h-9" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{t('settings.club')}</label>
              <Input value={club} onChange={e => setClub(e.target.value)} placeholder={t('settings.clubPlaceholder')} className="h-9" maxLength={100} />
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('settings.saveChanges')}
            </button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card ref={passwordSectionRef} id="password">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={18} className="text-primary" />
              {t('settings.security')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {magicLinkArrival && !isOAuthUser && (
              <div className="text-sm text-action-scored bg-action-scored/10 rounded-lg p-3 mb-3">
                {t('auth.magicLinkWelcome')}
              </div>
            )}
            {isOAuthUser ? (
              <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                {t('settings.oauthPasswordWarning')}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t('settings.newPassword')}</label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.newPasswordPlaceholder')} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{t('settings.confirmPassword')}</label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPasswordPlaceholder')} className="h-9" />
                </div>
                <button onClick={handleChangePassword} disabled={savingPassword || !newPassword.trim()} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                  {savingPassword ? t('settings.updatingPassword') : t('settings.updatePassword')}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare size={18} className="text-primary" />
              {t('settings.support')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} placeholder={t('settings.feedbackPlaceholder')} className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" maxLength={2000} />
            <button onClick={handleSendFeedback} disabled={sendingFeedback || !feedbackMsg.trim()} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {sendingFeedback ? t('common.sending') : t('settings.sendFeedback')}
            </button>
          </CardContent>
        </Card>
      </main>
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">{t('credits.techNote')}</p>
      </footer>
    </div>
  );
}
