import { AudioLines, CalendarDays, Home, Library, Search, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import cressSymbol from "../assets/brand/cress-symbol-gold.svg";
import { useProfileStore } from "../stores/profileStore";

const destinations: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/repertoire", label: "Repertório", icon: Library },
  { to: "/sessions", label: "Sessões", icon: CalendarDays },
  { to: "/tools", label: "Prática livre", icon: AudioLines },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "?";
}

export function AppShell() {
  const { pathname } = useLocation();
  const profile = useProfileStore((state) => state.profile);
  const isWorkspace = pathname === "/tools" || pathname === "/practice/new" || /^\/practice\/[^/]+$/.test(pathname);
  const [hidden, setHidden] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let previousY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousY;
      if (Math.abs(delta) >= 4) {
        if (delta < 0) setHidden(false);
        else if (!navigationRef.current?.contains(document.activeElement)) setHidden(currentY > 48);
        previousY = currentY;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`app-shell${isWorkspace ? " app-shell-workspace" : ""}`}>
      <main><Outlet /></main>
      {!isWorkspace && (
        <nav
          ref={navigationRef}
          aria-label="Navegação principal"
          className={`atril${hidden ? " atril-hidden" : ""}`}
          onFocus={() => setHidden(false)}
        >
          <NavLink to="/" end aria-label="Cress · Início" className="atril-brand" title="Cress · Início"><img src={cressSymbol} alt="" width={24} height={24} /></NavLink>
          <span className="atril-separator" aria-hidden="true" />
          <div className="atril-destinations">
            {destinations.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} aria-label={label} title={label} className="atril-link">
                <Icon size={16} strokeWidth={1.5} /><span>{label}</span><i aria-hidden="true" />
              </NavLink>
            ))}
          </div>
          <span className="atril-separator" aria-hidden="true" />
          <button type="button" className="atril-search" aria-label="Buscar (Ctrl K)" title="Buscar · Ctrl K">
            <Search size={16} strokeWidth={1.5} /><span>Ctrl K</span>
          </button>
          <span className="atril-separator atril-avatar-separator" aria-hidden="true" />
          <NavLink to="/settings" className="atril-avatar" aria-label="Configurações" title="Configurações">{initials(profile?.displayName ?? "")}</NavLink>
        </nav>
      )}
      <Toaster theme="dark" />
    </div>
  );
}
