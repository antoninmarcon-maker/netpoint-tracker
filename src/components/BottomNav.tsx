import { House, Trophy, Plus, MapPin, Settings2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "bottomNav_clicked";

interface BottomNavProps {
  onNewMatch: () => void;
}

const tabs = [
  { icon: House, path: "/", labelKey: "nav.home" },
  { icon: Trophy, path: "/tournaments", labelKey: "nav.tournaments" },
  { icon: Plus, path: null, labelKey: "nav.newMatch" },
  { icon: MapPin, path: "/spots", labelKey: "nav.spots" },
  { icon: Settings2, path: "/settings", labelKey: "nav.settings" },
];

export function BottomNav({ onNewMatch }: BottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [showLabels, setShowLabels] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "1"
  );

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

  const handleClick = useCallback((tab: typeof tabs[number]) => {
    if (showLabels) {
      localStorage.setItem(STORAGE_KEY, "1");
      setShowLabels(false);
    }
    tab.path ? navigate(tab.path) : onNewMatch();
  }, [showLabels, navigate, onNewMatch]);

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
              key={tab.labelKey}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => handleClick(tab)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 transition-colors ${
                isActive ? "text-foreground" : tab.path === null ? "text-muted-foreground" : "text-border"
              }`}
            >
              <Icon size={tab.labelKey === "nav.newMatch" ? 22 : 20} strokeWidth={1.5} />
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
