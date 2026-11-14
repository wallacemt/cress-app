import { AudioLines, CalendarDays, FileClock, Home, Library, Search, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import cressSymbol from "../assets/brand/cress-symbol-gold.svg";
import { useProfileStore } from "../stores/profileStore";
import { UpdateCheckProvider } from "../features/updates/UpdateCheckProvider";
import { Monogram } from "../components/ui/Monogram";
import { StageBackdrop } from "../components/ui/StageBackdrop";
import { StartSessionModal } from "../features/workspace/StartSessionModal";
import { SearchModal } from "../features/search/SearchModal";
import { useLanguageStore } from "../stores/languageStore";
import { t } from "../lib/i18n";

function useDestinations(): { to: string; label: string; icon: LucideIcon; end?: boolean }[] {
  return [
    { to: "/", label: t("nav.inicio"), icon: Home, end: true },
    { to: "/repertoire", label: t("nav.repertorio"), icon: Library },
    { to: "/sessions", label: t("nav.sessoes"), icon: CalendarDays },
    { to: "/tools", label: t("nav.pratica_livre"), icon: AudioLines },
    { to: "/changelog", label: t("nav.novidades"), icon: FileClock },
  ];
}

export function AppShell() {
  const { pathname } = useLocation();
  const profile = useProfileStore((state) => state.profile);
  useLanguageStore((state) => state.language);
  const destinations = useDestinations();
  const isWorkspace = pathname === "/tools" || pathname === "/practice/new" || /^\/practice\/[^/]+$/.test(pathname);
  const hasBackdrop = !isWorkspace && (pathname === "/" || pathname.startsWith("/sessions") || pathname.startsWith("/repertoire"));
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isWorkspace && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setModalOpen(true);
      }
      if (!isWorkspace && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isWorkspace]);

  return (
    <UpdateCheckProvider>
      <div className={`app-shell cress-content-enter${isWorkspace ? " app-shell-workspace" : ""}`}>
        {hasBackdrop && <StageBackdrop />}
        <main><Outlet /></main>
        {!isWorkspace && modalOpen && <StartSessionModal onClose={() => setModalOpen(false)} />}
        {!isWorkspace && searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
        {!isWorkspace && (
          <nav
            ref={navigationRef}
            aria-label={t("nav.navegacao_principal")}
            className={`atril${hidden ? " atril-hidden" : ""}`}
            onFocus={() => setHidden(false)}
          >
            <NavLink to="/" end aria-label={`Cress · ${t("nav.inicio")}`} className="atril-brand" title={`Cress · ${t("nav.inicio")}`}><img src={cressSymbol} alt="" width={24} height={24} /></NavLink>
            <span className="atril-separator" aria-hidden="true" />
            <div className="atril-destinations">
              {destinations.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} aria-label={label} title={label} className="atril-link">
                  <Icon size={16} strokeWidth={1.5} /><span>{label}</span><i aria-hidden="true" />
                </NavLink>
              ))}
            </div>
            <span className="atril-separator" aria-hidden="true" />
            <button type="button" className="atril-search" aria-label={t("nav.buscar")} title={t("nav.buscar")} onClick={() => setSearchOpen(true)}>
              <Search size={16} strokeWidth={1.5} /><span>Ctrl K</span>
            </button>
            <span className="atril-separator atril-avatar-separator" aria-hidden="true" />
            <NavLink to="/settings" className="atril-avatar" aria-label={t("nav.configuracoes")} title={t("nav.perfil_titulo", { name: profile?.displayName ?? "" })}><Monogram name={profile?.displayName ?? ""} size="sm" /></NavLink>
          </nav>
        )}
        <Toaster
          theme="dark"
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: "cress-toast",
              title: "cress-toast-title",
              actionButton: "cress-toast-action",
              closeButton: "cress-toast-close",
            },
          }}
        />
      </div>
    </UpdateCheckProvider>
  );
}
