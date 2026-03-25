import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthDialog } from '@/components/AuthDialog';

interface AuthContextValue {
  user: User | null;
  /** Opens the auth dialog. Returns true if already logged in. */
  requireAuth: (message?: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) setShowAuth(false);
      },
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const requireAuth = useCallback((message?: string): boolean => {
    if (user) return true;
    setAuthMessage(message);
    setShowAuth(true);
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, requireAuth }}>
      {children}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} message={authMessage} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
