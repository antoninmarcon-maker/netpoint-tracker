import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { useCloudSettingsHydration } from "@/hooks/useCloudSettingsHydration";
import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy-loaded routes to reduce initial bundle size
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const SharedMatch = lazy(() => import("./pages/SharedMatch"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Help = lazy(() => import("./pages/Help"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Credits = lazy(() => import("./pages/Credits"));
const ActionsConfig = lazy(() => import("./pages/ActionsConfig"));
const Players = lazy(() => import("./pages/Players"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDashboard = lazy(() => import("./pages/TournamentDashboard"));
const TournamentJoin = lazy(() => import("./pages/TournamentJoin"));
const TournamentSpectator = lazy(() => import("./pages/TournamentSpectator"));
const Spots = lazy(() => import("./pages/Spots"));
const Privacy = lazy(() => import("./pages/Privacy"));

const AppInner = () => {
  useCloudSettingsHydration();
  useTheme(); // Apply theme at root level so it reacts to system changes and PWA updates
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'fr';
  }, [i18n.resolvedLanguage, i18n.language]);
  return (
    <>
      <Toaster />
      <Sonner />
      <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
            <span className="sr-only">Loading...</span>
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        }>
          <Routes>
            {/* Routes WITH AppShell (header + bottom nav) */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/players" element={<Players />} />
              <Route path="/actions" element={<ActionsConfig />} />
              <Route path="/help" element={<Help />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/privacy" element={<Privacy />} />
            </Route>

            {/* Full-screen routes WITHOUT AppShell */}
            <Route path="/match/:matchId" element={<Index />} />
            <Route path="/spots" element={<Spots />} />
            <Route path="/shared/:token" element={<SharedMatch />} />
            <Route path="/tournaments/:id" element={<TournamentDashboard />} />
            <Route path="/tournaments/:id/join" element={<TournamentJoin />} />
            <Route path="/tournaments/:id/spectate" element={<TournamentSpectator />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
      </AuthProvider>
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <AppInner />
    <Analytics />
  </TooltipProvider>
);

export default App;
