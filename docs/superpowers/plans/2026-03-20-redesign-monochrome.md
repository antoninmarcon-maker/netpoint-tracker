# Redesign Monochrome — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform My Volley from a blue sports theme to a monochrome premium dark-first identity with golden accent, new logo, flat list UI, bottom tab navigation, and enhanced animations.

**Architecture:** CSS variable swap as the foundation (cascades through all shadcn/ui components automatically), then targeted component refactors for layout changes (flat lists, bottom nav, header). Logo is a new SVG asset. Map tiles switch to CARTO Dark Matter.

**Tech Stack:** React 18 + Vite + Tailwind CSS + shadcn/ui + Lucide icons + React Router + Leaflet

**Spec:** `docs/superpowers/specs/2026-03-20-redesign-monochrome-design.md`

---

## File Structure

### New files
- `src/assets/logo-myvolley.svg` — New SVG logo (replaces PNG)
- `src/components/BottomNav.tsx` — Bottom tab bar component
- `src/components/AppShell.tsx` — Layout wrapper (header + content + bottom nav)
- `public/favicon.svg` — SVG favicon

### Modified files
- `src/index.css` — CSS variables (full replacement of :root and .dark)
- `index.html` — theme-color meta, favicon link, theme script
- `vite.config.ts` — PWA manifest colors
- `src/App.tsx` — Wrap routes in AppShell, add page transitions
- `src/pages/Home.tsx` — Remove old header, flat list matches, remove bg-mesh
- `src/pages/Settings.tsx` — Grouped sections iOS-style, toggle accent doré
- `src/pages/Spots.tsx` — CARTO Dark Matter tiles, monochrome markers, glass morphism
- `src/pages/Tournaments.tsx` — Flat list pattern
- `src/components/ui/sonner.tsx` — Toast styling update
- `src/components/ui/switch.tsx` — Accent color for checked state

### Files that auto-adapt (no changes needed)
- All shadcn/ui components (button, card, badge, dialog, etc.) — consume CSS variables
- `src/hooks/useTheme.ts` — dark/light class toggle unchanged

### Architectural decision: Spots page
The Spots page is a **full-screen map** with its own top bar and bottom dock. It does NOT use AppShell (no shared header/bottom nav). It is placed **outside** the AppShell route group, alongside match pages.

---

## Task 1: CSS Variables — Dark mode

**Files:**
- Modify: `src/index.css:67-124`

- [ ] **Step 1: Replace `.dark` block CSS variables**

Replace lines 67-124 in `src/index.css` with the new dark mode variables from the spec (section 3, "Dark mode — valeurs CSS complètes"). Key changes:
- `--background: 240 6% 4%` (was `225 25% 8%`)
- `--primary: 0 0% 98%` / `--primary-foreground: 240 6% 4%` (inverted — white button on dark bg)
- `--accent: 45 93% 47%` (golden)
- `--ring: 45 93% 47%` (golden focus ring)
- `--action-cta: 0 0% 98%` (white, aligned with primary)
- All sidebar tokens updated to match

Keep `--team-blue`, `--team-red`, `--action-scored`, `--action-fault`, `--court-*` values **unchanged**.

- [ ] **Step 2: Verify dark mode renders**

Run: `npm run dev`
Open the app in dark mode. Check: background is near-black (#09090b), buttons are white-on-black, accent touches are golden. All existing pages should render without broken colors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: update dark mode CSS variables to monochrome palette"
```

---

## Task 2: CSS Variables — Light mode

**Files:**
- Modify: `src/index.css:5-65`

- [ ] **Step 1: Replace `:root` block CSS variables**

Replace lines 5-65 with the new light mode variables from the spec (section 3, "Light mode — valeurs CSS complètes"). Key changes:
- `--background: 0 0% 98%` (#fafafa)
- `--primary: 240 6% 10%` / `--primary-foreground: 0 0% 98%` (dark button on light bg)
- `--accent: 46 97% 40%` (#a16207 — darker gold for WCAG AA)
- All sidebar tokens updated

- [ ] **Step 2: Verify light mode renders**

Switch to light mode in Settings. Check: background is off-white, buttons dark-on-light, accent gold is readable. No broken contrast.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: update light mode CSS variables to monochrome palette"
```

---

## Task 3: CSS Utility classes cleanup

**Files:**
- Modify: `src/index.css:143-203`

- [ ] **Step 1: Update utility classes**

- `.glass` effect: keep backdrop-blur, update background to `rgba(9,9,11,0.85)` for dark, add `@supports not (backdrop-filter: blur(1px))` fallback with `rgba(9,9,11,0.95)`
- `.bg-mesh`: remove or replace with flat `bg-background` — no more gradient mesh
- `.card-hover` shadow: replace colored shadows with neutral `shadow-md` using `0 4px 12px rgba(0,0,0,0.15)`
- Team glow utilities: update to use new token values

- [ ] **Step 2: Verify**

Check Home page (was using bg-mesh), cards hover effects, glass overlays on Spots page.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: update utility classes for monochrome theme"
```

---

## Task 4: PWA & Meta tags

**Files:**
- Modify: `index.html:7-12`
- Modify: `vite.config.ts:38-39`

- [ ] **Step 1: Update index.html meta**

```html
<meta name="theme-color" content="#09090b" />
```

Update the favicon link to SVG (will be created in Task 7):
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Update vite.config.ts manifest**

```ts
theme_color: "#09090b",
background_color: "#09090b",
```

- [ ] **Step 3: Commit**

```bash
git add index.html vite.config.ts
git commit -m "style: update PWA manifest and meta tags to monochrome"
```

---

## Task 5: Toast styling

**Files:**
- Modify: `src/components/ui/sonner.tsx`

- [ ] **Step 1: Update Sonner toast options**

Add custom toast classNames for success/error/info with left border accents:

```tsx
toastOptions={{
  classNames: {
    toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
    success: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-action-scored",
    error: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-destructive",
    info: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-accent",
    description: "group-[.toast]:text-muted-foreground",
    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
  },
}}
```

- [ ] **Step 2: Verify toasts**

Trigger a success toast (create a match), error toast (invalid input), and info toast (notification prompt). Check: dark card background, colored left borders.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sonner.tsx
git commit -m "style: update toast styling with accent left borders"
```

---

## Task 6: Switch accent color

**Files:**
- Modify: `src/components/ui/switch.tsx`

- [ ] **Step 1: Update checked state color**

Change the checked state background from `data-[state=checked]:bg-primary` to `data-[state=checked]:bg-accent` so active toggles show golden instead of white.

- [ ] **Step 2: Verify**

Toggle switches in Settings (notifications, etc.) — should show golden track when on.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "style: switch checked state uses accent (golden) color"
```

---

## Task 7: Logo SVG

**Files:**
- Create: `src/assets/logo-myvolley.svg`
- Create: `public/favicon.svg`

- [ ] **Step 1: Create main logo SVG**

Create `src/assets/logo-myvolley.svg`:
```svg
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <rect x="1" y="1" width="510" height="510" rx="111" stroke="#27272a" stroke-width="2"/>
  <circle cx="256" cy="256" r="140" stroke="#fafafa" stroke-width="14"/>
  <path d="M160 160 Q256 256, 256 400" stroke="#fafafa" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M352 160 Q256 256, 256 400" stroke="#fafafa" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M112 256 Q256 192, 400 256" stroke="#fafafa" stroke-width="10" fill="none" stroke-linecap="round"/>
  <circle cx="340" cy="155" r="16" fill="#eab308"/>
</svg>
```

- [ ] **Step 2: Create favicon SVG**

Create `public/favicon.svg`:
```svg
<svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <circle cx="256" cy="256" r="140" stroke="#fafafa" stroke-width="18"/>
  <path d="M160 160 Q256 256, 256 400" stroke="#fafafa" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M352 160 Q256 256, 256 400" stroke="#fafafa" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M112 256 Q256 192, 400 256" stroke="#fafafa" stroke-width="12" fill="none" stroke-linecap="round"/>
  <circle cx="340" cy="155" r="20" fill="#eab308"/>
</svg>
```

- [ ] **Step 3: Generate PWA PNG icons from SVG**

Use a tool or script to export PNG versions:
```bash
# If sharp-cli is available, or use any SVG-to-PNG tool
npx sharp-cli -i src/assets/logo-myvolley.svg -o public/pwa-512x512.png resize 512 512
npx sharp-cli -i src/assets/logo-myvolley.svg -o public/pwa-192x192.png resize 192 192
npx sharp-cli -i src/assets/logo-myvolley.svg -o public/favicon.png resize 64 64
```

If sharp-cli is not available, open the SVG in a browser and screenshot at the right sizes, or use an online converter.

- [ ] **Step 4: Update logo import in the codebase**

Search for all imports of `logo-myvolley.png` and update to `.svg`:
```bash
grep -rn "logo-myvolley" src/
```

Update each import to use the new SVG file.

- [ ] **Step 5: Commit**

```bash
git add src/assets/logo-myvolley.svg public/favicon.svg public/pwa-*.png public/favicon.png
git commit -m "feat: new monochrome SVG logo with golden accent"
```

---

## Task 8a: Create BottomNav component

**Files:**
- Create: `src/components/BottomNav.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/BottomNav.tsx`:

```tsx
import { House, Trophy, Plus, MapPin, Settings2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";

interface BottomNavProps {
  onNewMatch: () => void;
}

const tabs = [
  { icon: House, path: "/", label: "home" },
  { icon: Trophy, path: "/tournaments", label: "tournaments" },
  { icon: Plus, path: null, label: "new" },
  { icon: MapPin, path: "/spots", label: "spots" },
  { icon: Settings2, path: "/settings", label: "settings" },
];

export function BottomNav({ onNewMatch }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex(
    (t) => t.path && location.pathname === t.path
  );

  useEffect(() => {
    if (activeIndex < 0 || !indicatorRef.current || !tabRefs.current[activeIndex]) return;
    const tab = tabRefs.current[activeIndex]!;
    const indicator = indicatorRef.current;
    const tabRect = tab.getBoundingClientRect();
    const parentRect = tab.parentElement!.getBoundingClientRect();
    indicator.style.transform = `translateX(${tabRect.left - parentRect.left + tabRect.width / 2 - 10}px)`;
    indicator.style.opacity = "1";
  }, [activeIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="relative flex items-center justify-around">
        <div
          ref={indicatorRef}
          className="absolute top-0 left-0 h-0.5 w-5 rounded-b bg-foreground opacity-0"
          style={{ transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1), opacity 150ms" }}
        />
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = i === activeIndex;
          return (
            <button
              key={tab.label}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => tab.path ? navigate(tab.path) : onNewMatch()}
              className={`flex items-center justify-center px-5 py-3.5 transition-colors ${
                isActive ? "text-foreground" : tab.path === null ? "text-muted-foreground" : "text-border"
              }`}
            >
              <Icon size={tab.label === "new" ? 22 : 20} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat: create BottomNav component with sliding indicator"
```

---

## Task 8b: Create AppShell component

**Files:**
- Create: `src/components/AppShell.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/AppShell.tsx`. This wraps pages in a layout with header + bottom nav. Import the user menu/avatar logic from Home.tsx (look for the auth dropdown or user initials display and extract it here).

```tsx
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
// Import the auth/user menu component from wherever Home.tsx gets it
// e.g.: import { useAuth } from "@/hooks/useAuth";

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
          {/* Move user avatar/auth button from Home.tsx here */}
          {/* Example: <UserMenu /> or <Button variant="ghost" size="icon"><User size={18} /></Button> */}
        </div>
      </header>

      <main key={location.pathname} className="flex-1 pb-16">
        <Outlet context={{ showNewMatch, setShowNewMatch }} />
      </main>

      <BottomNav onNewMatch={() => setShowNewMatch(true)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: create AppShell layout with header and content area"
```

---

## Task 8c: Integrate AppShell into router

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update route structure**

In `src/App.tsx`, wrap the main routes in an `<AppShell />` layout route. Full-screen pages (match, spots, shared match, tournament spectator) go **outside** the AppShell:

```tsx
import { AppShell } from "./components/AppShell";

// Inside the Routes:
<Route element={<AppShell />}>
  <Route path="/" element={<Home />} />
  <Route path="/tournaments" element={<Tournaments />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="/players" element={<Players />} />
  <Route path="/actions" element={<ActionsConfig />} />
  <Route path="/help" element={<Help />} />
  <Route path="/credits" element={<Credits />} />
</Route>
{/* Full-screen routes — no AppShell */}
<Route path="/match/:matchId" element={<Index />} />
<Route path="/spots" element={<Spots />} />
<Route path="/shared/:token" element={<SharedMatch />} />
<Route path="/tournaments/:id" element={<TournamentDashboard />} />
<Route path="/tournaments/:id/join" element={<TournamentJoin />} />
<Route path="/tournaments/:id/spectate" element={<TournamentSpectator />} />
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Check: AppShell pages have header + bottom nav. Match page and Spots page are full-screen without AppShell.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate AppShell layout route into router"
```

---

## Task 8d: Remove old header from Home.tsx

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Remove the sticky glass header**

Find the header section in Home.tsx (the one with `glass` class, logo, help icon, user menu — around lines 544+). Remove it entirely. The header is now in AppShell.

Move any user auth logic (login button, user dropdown) to AppShell's header right side if not already done.

- [ ] **Step 2: Remove help page link**

Help is now accessible from Settings. Remove the help icon from the header.

- [ ] **Step 3: Verify**

Check Home page has no duplicate header. AppShell header shows at top. Content scrolls normally.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx src/components/AppShell.tsx
git commit -m "refactor: remove old Home header, migrate auth to AppShell"
```

---

## Task 9: Home page — Flat list matches

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Replace match cards with flat list**

Find the match list rendering section. Replace Card-based match items with this pattern:

```tsx
{/* Match list container */}
<div className="rounded-[14px] border border-border bg-card p-5">
  <div className="mb-4 flex items-center justify-between">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {t("matches.recent")}
    </span>
    <span className="text-[11px] text-muted-foreground">{matches.length} matchs</span>
  </div>

  {matches.map((match, index) => {
    const isLive = !match.completed;
    const homeWon = match.homeScore > match.awayScore;
    return (
      <div
        key={match.id}
        onClick={() => navigate(`/match/${match.id}`)}
        className="flex cursor-pointer items-center justify-between border-b border-border py-4 last:border-b-0 press-scale"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {match.homeTeam} vs {match.awayTeam}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                <span className="h-1 w-1 animate-live-pulse rounded-full bg-accent" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-border">
            <span>{match.sport}</span>
            <span>·</span>
            <span>{formatDate(match.date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums">
            <span className={`text-lg font-bold ${isLive ? "text-accent" : homeWon ? "text-foreground" : "text-muted-foreground"}`}>
              {match.homeScore}
            </span>
            <span className="mx-0.5 text-sm text-border">–</span>
            <span className={`text-lg font-bold ${isLive ? "text-accent" : !homeWon ? "text-foreground" : "text-muted-foreground"}`}>
              {match.awayScore}
            </span>
          </span>
          <span className="text-border">›</span>
        </div>
      </div>
    );
  })}
</div>
```

- [ ] **Step 2: Update "New Match" CTA**

Replace the gradient CTA button with a simple primary button (white-on-dark):
```tsx
<Button className="w-full rounded-xl py-6 text-sm font-semibold">
  {t("matches.new")}
</Button>
```

Replace the demo button with:
```tsx
<Button variant="secondary" className="w-full rounded-xl py-5 text-sm">
  {t("matches.demo")}
</Button>
```

- [ ] **Step 3: Remove bg-mesh**

Replace `bg-background bg-mesh` on the page container with just `bg-background`.

- [ ] **Step 4: Verify**

Check: flat list with thin separators, monochrome scores (winner white, loser gray), golden live badge with pulsing dot, white CTA button, no cards.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "style: Home page flat list matches with monochrome design"
```

---

## Task 10: Settings page — Grouped sections

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Create a SettingsGroup helper and refactor**

Replace individual `<Card>` components with grouped containers. The pattern for each group:

```tsx
{/* Group: Preferences */}
<div className="overflow-hidden rounded-[14px] border border-border bg-card">
  {/* Language row */}
  <div className="flex items-center justify-between border-b border-border px-5 py-4">
    <div className="flex items-center gap-3">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground/80">{t("settings.language")}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] text-muted-foreground">Français</span>
      <ChevronRight className="h-4 w-4 text-border" />
    </div>
  </div>

  {/* Theme row */}
  <div className="flex items-center justify-between border-b border-border px-5 py-4">
    <div className="flex items-center gap-3">
      <Moon className="h-4 w-4 text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground/80">{t("settings.theme")}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] text-muted-foreground">{currentThemeLabel}</span>
      <ChevronRight className="h-4 w-4 text-border" />
    </div>
  </div>

  {/* Notifications row */}
  <div className="flex items-center justify-between px-5 py-4">
    <div className="flex items-center gap-3">
      <Bell className="h-4 w-4 text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground/80">{t("settings.notifications")}</span>
    </div>
    <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
  </div>
</div>
```

Apply this pattern for all settings groups:
- Group 1: Language, Theme, Notifications
- Group 2: Logo, Profile
- Group 3: Security (password change)
- Group 4: Support, Force Update

All icons change from `text-primary` to `text-muted-foreground`.

- [ ] **Step 2: Remove local page header**

Remove the sticky header from Settings (it's now in AppShell). Add a page title as an `<h2>` if needed:
```tsx
<h2 className="mb-4 px-1 text-lg font-bold text-foreground">{t("settings.title")}</h2>
```

- [ ] **Step 3: Verify**

Check: grouped iOS-style sections, golden switch toggle, icons in muted gray, no individual card shadows.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "style: Settings page grouped sections iOS-style"
```

---

## Task 11: Tournaments page — Flat list

**Files:**
- Modify: `src/pages/Tournaments.tsx`

- [ ] **Step 1: Replace tournament cards with flat list**

Replace Card-based tournament items with:

```tsx
<div className="rounded-[14px] border border-border bg-card p-5">
  {tournaments.map((tournament, index) => (
    <div
      key={tournament.id}
      onClick={() => navigate(`/tournaments/${tournament.id}`)}
      className="flex cursor-pointer items-center justify-between border-b border-border py-3.5 last:border-b-0 press-scale"
    >
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{tournament.name}</span>
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            tournament.status === "open"
              ? "border-action-scored/15 bg-action-scored/10 text-action-scored"
              : tournament.status === "in_progress"
              ? "border-accent/20 bg-accent/10 text-accent"
              : "border-border bg-muted text-muted-foreground"
          }`}>
            {t(`tournaments.status.${tournament.status}`)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-border">
          <span>{tournament.location}</span>
          <span>·</span>
          <span>{formatDate(tournament.date)}</span>
          <span>·</span>
          <span>{tournament.teamCount} {t("tournaments.teams")}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-border" />
    </div>
  ))}
</div>
```

- [ ] **Step 2: Remove local header**

Already in AppShell.

- [ ] **Step 3: Verify**

Check: flat list, colored status badges (green/gold/gray), thin separators, no card shadows.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Tournaments.tsx
git commit -m "style: Tournaments page flat list pattern"
```

---

## Task 12a: Spots — CARTO Dark Matter tiles

**Files:**
- Modify: `src/pages/Spots.tsx`

- [ ] **Step 1: Switch tile URL**

Find the `<TileLayer>` component. Replace the URL with:
```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
/>
```

- [ ] **Step 2: Verify**

Open Spots page. Map should show dark monochrome tiles.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Spots.tsx
git commit -m "style: switch map tiles to CARTO Dark Matter"
```

---

## Task 12b: Spots — Monochrome markers

**Files:**
- Modify: `src/pages/Spots.tsx`

- [ ] **Step 1: Update spot marker icons**

Find the marker icon creation code. Update to white circles with emoji:

```tsx
// Spot marker — white circle with emoji
const spotIcon = (emoji: string) =>
  L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#fafafa;border:2px solid #09090b;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 12px rgba(0,0,0,0.5);">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

// Cluster icon — white circle with count
const clusterIcon = (count: number) =>
  L.divIcon({
    html: `<div style="width:42px;height:42px;border-radius:50%;background:#fafafa;border:2px solid #09090b;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#09090b;box-shadow:0 2px 12px rgba(0,0,0,0.5);">${count}</div>`,
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
```

- [ ] **Step 2: Update user location marker**

```tsx
// User location — golden dot with pulsing halo
const userIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#eab308;border:3px solid #09090b;" class="animate-location-halo"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
```

- [ ] **Step 3: Verify & Commit**

```bash
git add src/pages/Spots.tsx
git commit -m "style: monochrome map markers with golden user location"
```

---

## Task 12c: Spots — Glass overlays & Leaflet CSS

**Files:**
- Modify: `src/pages/Spots.tsx`
- Modify: `src/index.css:205-250`

- [ ] **Step 1: Update UI overlays**

Update top bar styling:
```tsx
className="bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border border-border"
```

Update bottom dock buttons:
- Recenter + list: same glass style
- Add button: `bg-accent/15 border border-accent/25 text-accent`

Update bottom sheet:
```tsx
className="bg-[rgba(9,9,11,0.92)] backdrop-blur-2xl border border-border rounded-t-[14px]"
```

- [ ] **Step 2: Add backdrop-filter fallback in CSS**

In `src/index.css`:
```css
@supports not (backdrop-filter: blur(1px)) {
  .backdrop-blur-xl {
    background: rgba(9, 9, 11, 0.95) !important;
  }
  .backdrop-blur-2xl {
    background: rgba(9, 9, 11, 0.97) !important;
  }
}
```

- [ ] **Step 3: Update Leaflet CSS overrides**

In `src/index.css` (lines 205-250), update popup/attribution colors:
```css
.leaflet-popup-content-wrapper {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}
.leaflet-control-attribution {
  background: rgba(9, 9, 11, 0.7) !important;
  color: hsl(var(--muted-foreground));
}
```

- [ ] **Step 4: Verify**

Check Spots page: glass top bar, glass bottom sheet, CARTO tiles, updated popups.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Spots.tsx src/index.css
git commit -m "style: glass morphism overlays and Leaflet CSS for monochrome map"
```

---

## Task 12d: Spots — Bottom sheet content & list view

**Files:**
- Modify: `src/pages/Spots.tsx` (or SpotSidebar/SpotListView sub-components)

- [ ] **Step 1: Update spot detail bottom sheet content**

Refactor the spot detail view (SpotSidebar or inline) to match the spec:
- Photo carousel at top (unchanged layout, just ensure borders match)
- Details as flat key-value list:
```tsx
<div className="flex flex-col">
  <div className="flex items-center justify-between border-b border-border py-3">
    <span className="text-xs text-muted-foreground">Type</span>
    <span className="text-xs text-foreground/80">{spot.type}</span>
  </div>
  <div className="flex items-center justify-between border-b border-border py-3">
    <span className="text-xs text-muted-foreground">Surface</span>
    <span className="text-xs text-foreground/80">{spot.surface}</span>
  </div>
  <div className="flex items-center justify-between border-b border-border py-3">
    <span className="text-xs text-muted-foreground">Accès</span>
    <span className="text-xs text-foreground/80">{spot.access}</span>
  </div>
  <div className="flex items-center justify-between py-3">
    <span className="text-xs text-muted-foreground">Équipement</span>
    <div className="flex gap-1">
      {spot.equipment.map((eq) => (
        <span key={eq} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{eq}</span>
      ))}
    </div>
  </div>
</div>
```

- Stars: `text-accent` for filled, `text-border` for empty
- CTA: `<Button className="w-full rounded-[10px]">Y aller</Button>`

- [ ] **Step 2: Update list view sort chips**

```tsx
<div className="flex gap-1">
  {["distance", "type", "name"].map((sortKey) => (
    <button
      key={sortKey}
      onClick={() => setSort(sortKey)}
      className={`rounded-md px-2 py-1 text-[10px] font-medium ${
        sort === sortKey
          ? "bg-secondary text-muted-foreground"
          : "text-border"
      }`}
    >
      {t(`spots.sort.${sortKey}`)}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Verify & Commit**

```bash
git add src/pages/Spots.tsx
git commit -m "style: spot detail flat list and sort chips for monochrome map"
```

---

## Task 13: Page transitions

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Add page transition and fade-in-up keyframes**

In `src/index.css`, add:
```css
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter {
  animation: page-enter 120ms ease-out;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

And in `tailwind.config.ts`, register `fade-in-up`:
```ts
keyframes: {
  "fade-in-up": {
    from: { opacity: "0", transform: "translateY(8px)" },
    to: { opacity: "1", transform: "translateY(0)" },
  },
  // ... existing keyframes
},
animation: {
  "fade-in-up": "fade-in-up 200ms ease-out both",
  // ... existing animations
}
```

- [ ] **Step 2: Apply page-enter to AppShell**

In `src/components/AppShell.tsx`, the `<main>` already uses `key={location.pathname}`. Add the class:
```tsx
<main key={location.pathname} className="flex-1 pb-16 page-enter">
```

- [ ] **Step 3: Add global tabular-nums rule**

In `src/index.css` base layer:
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Verify**

Navigate between tabs — smooth fade+slide. Match scores use tabular-nums.

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.ts src/components/AppShell.tsx
git commit -m "feat: page transitions, fade-in-up animation, tabular-nums utility"
```

---

## Task 14: Enhanced animations

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add keyframes and Tailwind animations**

In `src/index.css`:
```css
@keyframes score-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes score-flash {
  0% { color: hsl(var(--accent)); }
  100% { color: inherit; }
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes location-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.15); }
  50% { box-shadow: 0 0 0 8px rgba(234,179,8,0.15); }
}

.press-scale { transition: transform 80ms ease-out; }
.press-scale:active { transform: scale(0.98); }
```

In `tailwind.config.ts`:
```ts
animation: {
  "score-pop": "score-pop 300ms cubic-bezier(0.34,1.56,0.64,1)",
  "score-flash": "score-flash 400ms ease-out",
  "live-pulse": "live-pulse 2s ease-in-out infinite",
  "location-halo": "location-halo 2s ease-in-out infinite",
  // keep all existing animations
}
```

- [ ] **Step 2: Verify & Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "feat: enhanced animations (score-pop, live-pulse, location-halo, press-scale)"
```

---

## Task 15: Theme transition smoothing

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add theme transition**

In `src/index.css` base layer:
```css
html { transition: background-color 200ms ease, color 200ms ease; }
```

- [ ] **Step 2: Verify**

Toggle theme in Settings — smooth 200ms crossfade.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: smooth 200ms theme transition"
```

---

## Task 16: Final icon color pass

**Files:**
- Multiple pages

- [ ] **Step 1: Find and replace decorative text-primary on icons**

Run:
```bash
grep -rn "text-primary" src/pages/ src/components/ --include="*.tsx"
```

For each result: if it's a decorative Lucide icon (not inside a Button), change to `text-muted-foreground`. Keep `text-primary` on buttons and interactive elements (it's white on dark — correct).

- [ ] **Step 2: Full app verification**

Navigate every page: Home, Tournaments, Spots, Settings, Match, Players, Help, Credits. Check:
- No remaining blue that shouldn't be there
- Broken contrast
- Missing golden accents
- Consistent monochrome feel

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: final icon color pass — decorative icons to muted-foreground"
```

---

## Execution Order

Tasks 1-3 (CSS variables) must be first — they cascade to everything.
Task 4 (PWA/meta) is independent.
Tasks 5-6 (toast/switch) are independent.
Task 7 (logo) is independent.
Tasks 8a-8d (AppShell) sequential, depend on Tasks 1-3.
Tasks 9-11 (page refactors) depend on 8d.
Tasks 12a-12d (Spots) sequential, depend on Tasks 1-3 only (Spots is outside AppShell).
Task 13 (page transitions) depends on 8b.
Tasks 14-15 (animations) independent.
Task 16 (cleanup) is last.

**Parallelizable groups:**
- Group A: Tasks 1, 2, 3 (sequential — CSS)
- Group B: Tasks 4, 5, 6, 7 (independent, can run in parallel with A)
- Group C: Tasks 8a, 8b, 8c, 8d (sequential, depends on A)
- Group D: Tasks 9, 10, 11 (depend on C, parallelizable with each other)
- Group E: Tasks 12a, 12b, 12c, 12d (sequential, depends on A only — can run parallel with C/D)
- Group F: Tasks 13, 14, 15 (depend on C for 13, independent for 14/15)
- Group G: Task 16 (last)
