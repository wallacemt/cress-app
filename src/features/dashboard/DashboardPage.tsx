import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getDashboard } from "../../application/dashboard";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { Sparkline } from "../../components/ui/Sparkline";

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};
const pieceName = (id: string, pieces: Dashboard["pieces"]) => id === FREE_PRACTICE_PIECE_ID ? "Prática livre" : pieces.find((piece) => piece.id === id)?.title ?? "Obra indisponível";

export function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void container.getDeps().then(getDashboard).then((data) => { if (active) setDashboard(data); }).catch(() => { if (active) setError("Não foi possível carregar o painel."); });
    return () => { active = false; };
  }, []);

  if (error) return <main className="mx-auto max-w-5xl px-6 py-10"><p role="alert" className="text-[var(--danger)]">{error}</p></main>;
  if (!dashboard) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-[var(--text-muted)]" aria-busy="true">Carregando painel…</main>;

  const open = dashboard.openSession;
  const latest = dashboard.latestPieceSession;
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Bom dia" : today.getHours() < 18 ? "Boa tarde" : "Boa noite";
  return <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--text-primary)]">
    <header className="mb-8">
      <p className="text-sm text-[var(--text-secondary)]">{greeting}, {dashboard.displayName}</p>
      <h1 className="mt-1 font-display text-4xl">Seu espaço de estudo</h1>
    </header>
    {open && <section aria-label="Sessão aberta" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--violet-400)]/40 bg-[var(--ink-800)] p-5">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--violet-300)]">Sessão {open.status === "ACTIVE" ? "ativa" : "pausada"}</p><h2 className="mt-1 text-lg font-medium">{pieceName(open.repertoire_item_id, dashboard.pieces)}</h2><p className="text-sm text-[var(--text-secondary)]">{duration(open.activeMs + (open.status === "ACTIVE" && open.resumedAt ? Math.max(0, Date.now() - open.resumedAt.getTime()) : 0))} estudados</p></div>
      <button className="rounded-lg bg-[var(--gradient-brand)] px-5 py-3 text-sm font-semibold text-white" onClick={() => navigate(`/practice/${open.id}`)}>Retomar sessão</button>
    </section>}
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border border-[var(--border-subtle)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Continuar estudo</p>
        {dashboard.recentPiece && latest ? <>
          <h2 className="mt-3 font-display text-2xl">{dashboard.recentPiece.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{dashboard.recentPiece.composer || "Compositor não informado"}</p>
          {dashboard.recentPiece.goal && <p className="mt-3 text-sm">Objetivo: {dashboard.recentPiece.goal}</p>}
          <div className="mt-4 flex items-center justify-between gap-4"><span className="text-sm text-[var(--text-secondary)]">Último BPM: {latest.final_bpm ?? "—"}</span><Sparkline values={dashboard.pieceSessions.filter((session) => session.repertoire_item_id === latest.repertoire_item_id && session.final_bpm != null).slice(0, 20).map((session) => session.final_bpm!).reverse()} ariaLabel="Histórico de BPM da obra" /></div>
        </> : <p className="mt-3 text-sm text-[var(--text-muted)]">Comece uma sessão para ver seu repertório recente aqui.</p>}
        <button className={`mt-5 rounded-lg px-4 py-2.5 text-sm font-medium ${open ? "border border-[var(--border-subtle)] text-[var(--text-secondary)]" : "bg-[var(--gradient-brand)] text-white"}`} onClick={() => navigate(open ? `/practice/${open.id}` : "/practice/new")}>{open ? "Retomar sessão" : "Continuar estudo"}</button>
      </section>
      <section className="rounded-xl border border-[var(--border-subtle)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Últimos 7 dias</p>
        <h2 className="mt-3 font-display text-3xl">{duration(dashboard.weekActiveMs)}</h2>
        <ul className="mt-4 grid grid-cols-7 gap-2 text-center">{dashboard.days.map((day) => <li key={day.date.toISOString()}><span className="block text-xs text-[var(--text-muted)]">{day.date.toLocaleDateString("pt-BR", { weekday: "short" })}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">{duration(day.activeMs)}</span></li>)}</ul>
      </section>
      <section className="rounded-xl border border-[var(--border-subtle)] p-5 md:col-span-2">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Últimas sessões</h2><Link className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to="/sessions">Ver todas →</Link></div>
        {dashboard.recentSessions.length ? <ul className="mt-3 divide-y divide-[var(--border-subtle)]">{dashboard.recentSessions.map((session) => <li key={session.id}><Link to={`/sessions/${session.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-[var(--violet-300)]"><span>{pieceName(session.repertoire_item_id, dashboard.pieces)}</span><span className="text-sm text-[var(--text-secondary)]">{session.startedAt?.toLocaleString("pt-BR") ?? "Data indisponível"} · {duration(session.activeMs)}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma sessão registrada ainda.</p>}
      </section>
    </div>
  </main>;
}
