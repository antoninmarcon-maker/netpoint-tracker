import { House, Trophy, Plus, MapPin, Settings2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

const SESSION_COUNT_KEY = "bottomNav_sessionCount";
const MAX_GUIDED_SESSIONS = 10;

interface BottomNavProps {
  onNewMatch: () => void;
  isGuest: boolean;
}

const tabs = [
  { icon: House, path: "/", labelKey: "nav.home" },
  { icon: Trophy, path: "/tournaments", labelKey: "nav.tournaments" },
  { icon: Plus, path: null, labelKey: "nav.newMatch" },
  { icon: MapPin, path: "/spots", labelKey: "nav.spots" },
  { icon: Settings2, path: "/settings", labelKey: "nav.settings" },
];

function shouldShowLabels(isGuest: boolean): boolean {
  if (isGuest) return true;
  const count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0", 10);
  return count < MAX_GUIDED_SESSIONS;
}

function bumpSessionCount() {
  const key = SESSION_COUNT_KEY;
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(current + 1));
}

export function BottomNav({ onNewMatch, isGuest }: BottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [showLabels] = useState(() => shouldShowLabels(isGuest));
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);

  // Bump session count once per mount (= once per app open)
  useEffect(() => {
    if (!isGuest) bumpSessionCount();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleClick = useCallback((tab: typeof tabs[number], index: number) => {
    // Trigger tap animation
    setTappedIndex(index);
    setTimeout(() => setTappedIndex(null), 300);

    tab.path ? navigate(tab.path) : onNewMatch();
  }, [navigate, onNewMatch]);

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
          const isTapped = i === tappedIndex;
          return (
            <button
              key={tab.labelKey}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => handleClick(tab, i)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
              style={{
                transform: isTapped ? "scale(0.85)" : "scale(1)",
                transition: isTapped
                  ? "transform 100ms cubic-bezier(0.34,1.56,0.64,1)"
                  : "transform 250ms cubic-bezier(0.34,1.56,0.64,1), color 200ms",
              }}
            >
              <Icon size={tab.labelKey === "nav.newMatch" ? 22 : 20} strokeWidth={isActive ? 2 : 1.5} />
              {showLabels && (
                <span className="text-[10px] leading-tight font-medium animate-in fade-in duration-300">
                  {t(tab.labelKey)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
