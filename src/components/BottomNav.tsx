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
