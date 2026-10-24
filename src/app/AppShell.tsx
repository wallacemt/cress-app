import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  BookOpen,
  Home,
  Music2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { container } from "./container";
import { getProfile } from "../application/profile";
import cressSymbol from "../assets/brand/cress-symbol-gold.svg";

const destinations = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/repertoire", label: "Repertório", icon: BookOpen, end: false },
  { to: "/sessions", label: "Sessões", icon: SlidersHorizontal, end: false },
  { to: "/tools", label: "Prática livre", icon: Music2, end: false },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
  ).toUpperCase();
}

export function AppShell() {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(false);
  const [avatarInitials, setAvatarInitials] = useState("—");
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    void container
      .getDeps()
      .then((deps) => getProfile(deps))
      .then((profile) => {
        if (active && profile?.displayName) setAvatarInitials(initials(profile.displayName));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const isWorkspace =
    pathname === "/tools" ||
    pathname === "/practice/new" ||
    /^\/practice\/[^/]+$/.test(pathname);

  useEffect(() => {
    let previousY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (railRef.current?.contains(document.activeElement)) {
        setHidden(false);
      } else if (Math.abs(currentY - previousY) > 2) {
        setHidden(currentY > previousY && currentY > 40);
      }
      previousY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`app-shell${isWorkspace ? " app-shell-workspace" : ""}`}>
      <main className={isWorkspace ? "" : "app-shell-content"}>
        <Outlet />
      </main>
      {!isWorkspace && (
        <nav
          ref={railRef}
          className={`navigation-rail${hidden ? " is-hidden" : ""}`}
          aria-label="Navegação principal"
          onFocus={() => setHidden(false)}
        >
          <img className="navigation-brand" src={cressSymbol} alt="Cress" />
          <span className="navigation-divider" aria-hidden="true" />
          <div className="navigation-destinations">
            {destinations.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  `navigation-link${isActive ? " active" : ""}`
                }
              >
                <Icon size={16} aria-hidden="true" />
                <span className="navigation-label">{label}</span>
              </NavLink>
            ))}
          </div>
          <span className="navigation-divider" aria-hidden="true" />
          <button
            className="navigation-search"
            type="button"
            aria-label="Buscar (Ctrl K)"
            onClick={() => toast("Busca chega em breve")}
          >
            <Search size={16} aria-hidden="true" />
            <span>Ctrl K</span>
          </button>
          <NavLink
            className="navigation-avatar"
            to="/settings"
            aria-label="Configurações"
          >
            {avatarInitials}
          </NavLink>
        </nav>
      )}
      <Toaster theme="dark" />
    </div>
  );
}
