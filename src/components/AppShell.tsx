import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { UserMenu } from "./UserMenu";
import { AuthDialog } from "./AuthDialog";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const { t } = useTranslation();
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    supabase.auth.getSession().then(({ data: { session } }) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background pt-[env(safe-area-inset-top)]">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="text-[15px] font-bold tracking-[-0.03em] text-foreground">
              my<span className="text-accent">volley</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-medium hover:bg-secondary transition-all"
              >
                <LogIn size={14} />
                {t("common.login")}
              </button>
            )}
          </div>
        </header>
      </div>

      <main key={location.pathname} className="flex-1 pb-16 page-enter">
        <Outlet context={{ showNewMatch, setShowNewMatch }} />
      </main>

      <BottomNav onNewMatch={() => setShowNewMatch(true)} />

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
