import { NavLink, Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";

const navigation = [
  ["/", "Dashboard"],
  ["/repertoire", "Repertório"],
  ["/sessions", "Sessões"],
  ["/tools", "Ferramentas"],
  ["/settings", "Configurações"],
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const isWorkspace = pathname === "/tools" || pathname === "/practice/new" || /^\/practice\/[^/]+$/.test(pathname);
  return (
    <div className={`app-shell${isWorkspace ? " app-shell-workspace" : ""}`}>
      {!isWorkspace && <aside>
        <div className="brand">
          Cress<span>·</span>
        </div>
        <nav aria-label="Navegação principal">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>}
      <main>
        {!isWorkspace && <header>
          <span>Workspace</span>
          <span className="session-banner">Nenhuma sessão aberta</span>
        </header>}
        <Outlet />
      </main>
      <Toaster theme="dark" />
    </div>
  );
}
