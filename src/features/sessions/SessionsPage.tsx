import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { X } from "lucide-react";
import { listPieces } from "../../application/repertoire";
import { hasOpenStudySession, listSessionGoals, listSessionsPage } from "../../application/sessions";
import { container } from "../../app/container";
import { liveActiveMs } from "../../domain/session";
import { StartSessionModal } from "../workspace/StartSessionModal";
import { SessionRow } from "./SessionRow";

const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`;
};
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const dayLabel = (date: Date, now: Date) => {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const day = new Date(date); day.setHours(0, 0, 0, 0);
  const offset = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (offset === 0) return "Hoje";
  if (offset === 1) return "Ontem";
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (day >= startOfWeek && day < today) return `${date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}, ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`;
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}) });
};

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pieceId = searchParams.get("pieceId") ?? undefined;
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessionsPage>>["sessions"]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [pieces, setPieces] = useState<Awaited<ReturnType<typeof listPieces>>>([]);
  const [goals, setGoals] = useState<{ id: string; description: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setPage(0); // síncrono: evita que o efeito de paginação abaixo rode com a página antiga e o filtro novo
    void container.getDeps().then(async (deps) => {
      const [items, openSession, goalRows, firstPage] = await Promise.all([listPieces(deps), hasOpenStudySession(deps), listSessionGoals(deps), listSessionsPage(deps, { repertoireItemId: pieceId, page: 0, pageSize: 30 })]);
      if (active) { setPieces(items); setGoals(goalRows); setHasOpenSession(openSession); setSessions(firstPage.sessions); setHasMore(firstPage.hasMore); setLoaded(true); }
    }).catch(() => { if (active) { setError("Não foi possível carregar as sessões."); setLoaded(true); } });
    return () => { active = false; };
  }, [pieceId]);

  // Depende só de `page`: trocar pieceId já reseta page pra 0 acima, o que por si só
  // dispara (e descarta) este efeito sem pedir uma página da obra errada.
  useEffect(() => {
    if (page === 0) return;
    let active = true;
    void container.getDeps().then((deps) => listSessionsPage(deps, { repertoireItemId: pieceId, page, pageSize: 30 })).then((result) => {
      if (active) { setSessions((current) => [...current, ...result.sessions]); setHasMore(result.hasMore); }
    }).catch(() => { if (active) setError("Não foi possível carregar as sessões."); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pieceId muda junto com o setPage(0) do efeito acima, que já descarta este fetch antes de rodar com o filtro novo
  }, [page]);

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof sessions>();
    for (const session of sessions) {
      if (!session.startedAt) continue;
      const key = dayKey(session.startedAt);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    }
    return [...grouped.values()];
  }, [sessions]);
  const filteredPiece = pieces.find((piece) => piece.id === pieceId);

  return <main className="mx-auto w-full max-w-[1120px] px-8 pt-12 pb-12 text-[var(--text-primary)]">
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="text-xs uppercase tracking-[.08em] text-[var(--text-muted)]">HISTÓRICO</p>
        <h1 className="mt-2 font-display text-[56px] leading-[60px] font-medium">Sessões</h1>
        <p className="mt-2 text-lg text-[var(--text-secondary)]"><span className="font-metric tabular-nums text-[var(--text-primary)]">{sessions.length}</span> sessões · <span className="font-metric tabular-nums text-[var(--text-primary)]">{duration(sessions.reduce((total, session) => total + liveActiveMs(session, new Date()), 0))}</span> estudadas</p>
        {pieceId && <span className="mt-4 inline-flex h-8 items-center gap-2 rounded-full bg-[var(--violet-tint)] px-3 text-sm text-[var(--violet-300)]">Obra: {filteredPiece?.title ?? "Obra indisponível"}<button type="button" aria-label="Remover filtro" onClick={() => setSearchParams({})}><X size={14} /></button></span>}
      </div>
      <button type="button" className="cress-btn-primary" disabled={!loaded || hasOpenSession} title={hasOpenSession ? "Finalize ou retome a sessão em andamento antes de iniciar outra." : undefined} onClick={() => setModalOpen(true)}>Nova sessão</button>
    </header>
    {modalOpen && <StartSessionModal onClose={() => setModalOpen(false)} />}
    {error && <p role="alert" className="mb-6 text-sm text-[var(--danger)]">{error}</p>}
    {!loaded ? <div role="status" aria-label="Carregando sessões" aria-busy="true" className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="cress-skeleton h-16 rounded-xl" />)}</div> : !sessions.length ? <div className="cress-card relative overflow-hidden rounded-xl p-8"><svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[.05]" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 20H100 M0 35H100 M0 50H100 M0 65H100 M0 80H100" stroke="currentColor" strokeWidth=".5" /></svg><div className="relative"><p className="font-display text-[36px] italic">Nenhuma sessão ainda</p><button className="cress-btn-primary mt-6" onClick={() => setModalOpen(true)}>Nova sessão</button></div></div> : <><div className="space-y-8">{groups.map((group) => <section key={dayKey(group[0]!.startedAt!)}><div className="cress-section-head"><h2>{dayLabel(group[0]!.startedAt!, new Date())}</h2><div aria-hidden="true" className="cress-hairpin" /><span className="shrink-0 font-metric text-xs tabular-nums text-[var(--text-muted)]">{group.length}</span></div><div className="cress-card divide-y divide-[var(--border-subtle)] rounded-xl">{group.map((session) => { const piece = pieces.find((item) => item.id === session.repertoire_item_id); return <SessionRow key={session.id} session={session} pieceName={piece?.title ?? "Obra indisponível"} pieceSubtitle={piece?.composer ?? undefined} goalDescription={session.goal_id ? goals.find((goal) => goal.id === session.goal_id)?.description : undefined} to={`/sessions/${session.id}`} />; })}</div></section>)}</div>{hasMore && <button type="button" className="cress-btn-glass mx-auto mt-8 block" onClick={() => setPage((current) => current + 1)}>Carregar mais</button>}</>}
  </main>;
}
