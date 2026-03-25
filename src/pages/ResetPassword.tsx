import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else navigate('/');
      });
    }
  }, [navigate]);

  const handleReset = async () => {
    if (password.length < 6) {
      toast.error(t('resetPassword.minLength'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('resetPassword.mismatch'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('resetPassword.updated'));
      navigate('/');
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-4">
        <h1 className="text-lg font-bold text-foreground text-center">{t('resetPassword.title')}</h1>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('resetPassword.placeholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-10 pr-10"
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
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('resetPassword.confirmPlaceholder')}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="h-10"
          onKeyDown={e => e.key === 'Enter' && handleReset()}
        />
        <button onClick={handleReset} disabled={loading || !password.trim()} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
          {loading ? '...' : t('resetPassword.update')}
        </button>
      </div>
    </div>
  );
}
