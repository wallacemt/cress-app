import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Gauge, Timer } from "lucide-react";
import { getDashboard } from "../../application/dashboard";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { INSTRUMENTS } from "../../domain/profile";
import { Sparkline } from "../../components/ui/Sparkline";

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};
const pieceName = (id: string, pieces: Dashboard["pieces"]) => id === FREE_PRACTICE_PIECE_ID ? "Prática livre" : pieces.find((piece) => piece.id === id)?.title ?? "Obra indisponível";
const timeLabel = (date: Date | null) => {
  if (!date) return "Data indisponível";
  const today = new Date();
  const yesterday = new Date(today);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (day.getTime() === today.getTime()) return `Hoje, ${time}`;
  if (day.getTime() === yesterday.getTime()) return `Ontem, ${time}`;
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${weekday.charAt(0).toLocaleUpperCase("pt-BR")}${weekday.slice(1)}, ${time}`;
};

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
  const maxDay = Math.max(...dashboard.days.map((day) => day.activeMs), 1);
  return <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--text-primary)]">
    <header className="mb-8">
      <p className="text-sm text-[var(--text-secondary)]">{greeting}, {dashboard.displayName}.</p>
      <h1 className="mt-1 font-display text-4xl">Continue sua evolução.</h1>
    </header>
    {open && <section aria-label="Sessão aberta" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--violet-400)]/40 bg-[var(--ink-800)] p-5">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--violet-300)]">Sessão {open.status === "ACTIVE" ? "ativa" : "pausada"}</p><h2 className="mt-1 text-lg font-medium">{pieceName(open.repertoire_item_id, dashboard.pieces)}</h2><p className="text-sm text-[var(--text-secondary)]">{duration(open.activeMs + (open.status === "ACTIVE" && open.resumedAt ? Math.max(0, Date.now() - open.resumedAt.getTime()) : 0))} estudados</p></div>
      <button className="cress-btn-primary" onClick={() => navigate(`/practice/${open.id}`)}>Retomar sessão</button>
    </section>}
    <div className="grid gap-5 md:grid-cols-2">
      <section className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] p-5 md:col-span-2">
        <div aria-hidden="true" className="cress-hairpin absolute inset-x-0 top-0" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Continuar estudo</p>
        {dashboard.recentPiece && latest ? <>
          <h2 className="mt-3 font-display text-3xl">{dashboard.recentPiece.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{dashboard.recentPiece.composer || "Compositor não informado"} · {dashboard.recentPiece.instrument && dashboard.recentPiece.instrument in INSTRUMENTS ? INSTRUMENTS[dashboard.recentPiece.instrument as keyof typeof INSTRUMENTS] : "Instrumento não informado"}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {dashboard.recentPiece.goal && <div className="rounded-lg bg-[var(--ink-800)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Objetivo ativo</p><p className="mt-2">{dashboard.recentPiece.goal.description}</p><div className="mt-3 flex flex-wrap gap-2">{dashboard.recentPiece.goal.targetBpm != null && <span className="rounded-full bg-[var(--ink-700)] px-3 py-1 text-xs">Alvo ♩ {dashboard.recentPiece.goal.targetBpm}</span>}{dashboard.recentPiece.goal.startMeasure != null && dashboard.recentPiece.goal.endMeasure != null && <span className="rounded-full bg-[var(--ink-700)] px-3 py-1 text-xs">Compassos {dashboard.recentPiece.goal.startMeasure}–{dashboard.recentPiece.goal.endMeasure}</span>}</div></div>}
            <div className="rounded-lg bg-[var(--ink-800)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Último BPM</p><div className="mt-2 flex items-baseline gap-2"><span className="font-[var(--font-metric)] text-5xl tabular-nums">{latest.final_bpm ?? "—"}</span><span className="text-sm text-[var(--text-secondary)]">BPM</span></div><div className="mt-3"><Sparkline values={dashboard.pieceSessions.filter((session) => session.repertoire_item_id === latest.repertoire_item_id && session.final_bpm != null).slice(0, 20).map((session) => session.final_bpm!).reverse()} ariaLabel="Histórico de BPM da obra" /></div></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"><button className={open ? "cress-btn-glass" : "cress-btn-primary"} onClick={() => navigate(open ? `/practice/${open.id}` : "/practice/new")}>{open ? "Retomar sessão" : "Continuar estudo"}</button><Link className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to={`/repertoire/${dashboard.recentPiece.id}`}>Ver obra</Link></div>
        </> : <><p className="mt-3 text-sm text-[var(--text-muted)]">Comece uma sessão para ver seu repertório recente aqui.</p><button className="cress-btn-primary mt-5" onClick={() => navigate(open ? `/practice/${open.id}` : "/practice/new")}>{open ? "Retomar sessão" : "Continuar estudo"}</button></>}
      </section>
      <section className="rounded-xl border border-[var(--border-subtle)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Últimos 7 dias</p>
        <h2 className="mt-3 font-display text-3xl">{duration(dashboard.weekActiveMs)}</h2>
        <ul className="mt-5 grid grid-cols-7 gap-2 text-center">{dashboard.days.map((day, index) => <li key={day.date.toISOString()} className="flex flex-col items-center"><span className="flex h-16 items-end"><span className="w-2 rounded-full" style={{ height: `${Math.max(day.activeMs ? 4 : 2, (day.activeMs / maxDay) * 64)}px`, background: index === 6 ? "var(--violet-400)" : "var(--ink-600)" }} /></span><span className="mt-2 text-xs text-[var(--text-muted)]">{day.date.toLocaleDateString("pt-BR", { weekday: "narrow" })}</span></li>)}</ul>
      </section>
      <section className="flex flex-col rounded-xl border border-[var(--border-subtle)] p-5">
        <div className="flex gap-3 text-[var(--violet-300)]"><Gauge size={20} strokeWidth={1.5} /><Timer size={20} strokeWidth={1.5} /></div><h2 className="mt-4 font-display text-2xl">Prática livre</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Metrônomo e afinador lado a lado, sem abrir sessão.</p><Link className="mt-auto self-start pt-5 text-sm font-medium text-[var(--violet-300)] hover:text-[var(--text-primary)]" to="/tools">Abrir</Link>
      </section>
      <section className="rounded-xl border border-[var(--border-subtle)] p-5 md:col-span-2">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Últimas sessões</h2><Link className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to="/sessions">Ver todas →</Link></div>
        {dashboard.recentSessions.length ? <ul className="mt-3 divide-y divide-[var(--border-subtle)]">{dashboard.recentSessions.map((session) => <li key={session.id}><Link to={`/sessions/${session.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-[var(--violet-300)]"><span className="min-w-40 flex-1">{pieceName(session.repertoire_item_id, dashboard.pieces)}</span><span className="text-sm text-[var(--text-secondary)]">{timeLabel(session.startedAt)} · {duration(session.activeMs)}</span><span className="min-w-20 text-right text-sm text-[var(--text-secondary)]">{session.final_bpm != null ? `♩ ${session.final_bpm}` : "—"}</span><span className="min-w-36 text-right text-xs">{session.goalCompleted ? <span className="rounded-full bg-[var(--ink-800)] px-3 py-1 text-[var(--violet-300)]">✓ Objetivo concluído</span> : <span className="text-[var(--text-muted)]">—</span>}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma sessão registrada ainda.</p>}
      </section>
    </div>
  </main>;
}
