import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { container } from "./container";
import { makeSessionRepo } from "../infrastructure/repositories/sessionRepo";
import { listPieces } from "../application/repertoire";
import { resumeSession } from "../application/sessions";
import type { StudySessionRow } from "../infrastructure/db/rows";

const navigation = [
  ["/", "Dashboard"],
  ["/repertoire", "Repertório"],
  ["/sessions", "Sessões"],
  ["/tools", "Ferramentas"],
  ["/settings", "Configurações"],
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openSession, setOpenSession] = useState<StudySessionRow | null>(null);
  const [pieceTitle, setPieceTitle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (deps) => {
      const row = (await makeSessionRepo(deps.db).open())[0] ?? null;
      if (!active) return;
      setOpenSession(row);
      if (row) setPieceTitle((await listPieces(deps)).find((piece) => piece.id === row.repertoire_item_id)?.title ?? "Sessão");
    }).catch(() => { if (active) setOpenSession(null); });
    return () => { active = false; };
  }, [pathname]);
  async function resumeOpenSession() {
    if (!openSession) return;
    const deps = await container.getDeps();
    setBusy(true);
    try {
      const resumed = openSession.status === "PAUSED" ? await resumeSession(deps, { id: openSession.id }) : null;
      if (resumed) setOpenSession({ ...openSession, status: "ACTIVE", resumed_at: resumed.resumedAt?.getTime() ?? null });
      navigate(`/practice/${openSession.id}`);
    } catch { window.alert("Não foi possível retomar a sessão."); }
    finally { setBusy(false); }
  }
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
          {openSession ? <button type="button" className="session-banner" disabled={busy} onClick={() => void resumeOpenSession()}>{pieceTitle} · {openSession.status === "ACTIVE" ? "Em andamento" : "Pausada"} · Retomar</button> : <span className="session-banner">Nenhuma sessão aberta</span>}
        </header>}
        <Outlet />
      </main>
      <Toaster theme="dark" />
    </div>
  );
}
