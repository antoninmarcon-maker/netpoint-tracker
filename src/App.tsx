import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useCloudSettingsHydration } from "@/hooks/useCloudSettingsHydration";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";

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

const queryClient = new QueryClient();

const AppInner = () => {
  useCloudSettingsHydration();
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match/:matchId" element={<Index />} />
            <Route path="/shared/:token" element={<SharedMatch />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/help" element={<Help />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/actions" element={<ActionsConfig />} />
            <Route path="/players" element={<Players />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppInner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
