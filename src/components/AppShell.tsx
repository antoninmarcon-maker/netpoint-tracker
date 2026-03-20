import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const [showNewMatch, setShowNewMatch] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="text-[15px] font-bold tracking-[-0.03em] text-foreground">
            my<span className="text-accent">volley</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* TODO: Move user avatar/auth from Home.tsx in Task 8d */}
        </div>
      </header>

      <main className="flex-1 pb-16">
        <Outlet context={{ showNewMatch, setShowNewMatch }} />
      </main>

      <BottomNav onNewMatch={() => setShowNewMatch(true)} />
    </div>
  );
}
