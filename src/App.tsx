import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useCloudSettingsHydration } from "@/hooks/useCloudSettingsHydration";
import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import Home from "./pages/Home";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./contexts/AuthContext";

// Lazy-loaded routes to reduce initial bundle size
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

const queryClient = new QueryClient();

const AppInner = () => {
  useCloudSettingsHydration();
  useTheme(); // Apply theme at root level so it reacts to system changes and PWA updates
  return (
    <>
      <Toaster />
      <Sonner />
      <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
      </BrowserRouter>
      </AuthProvider>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppInner />
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
