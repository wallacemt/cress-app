import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { listPieces } from "../../application/repertoire";
import { listSessions } from "../../application/sessions";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import { StartSessionModal } from "../workspace/StartSessionModal";

function duration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
}

export function SessionsPage() {
  const [searchParams] = useSearchParams();
  const pieceId = searchParams.get("pieceId") ?? undefined;
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof listSessions>>>([]);
  const [allSessions, setAllSessions] = useState<Awaited<ReturnType<typeof listSessions>>>([]);
  const [pieces, setPieces] = useState<Awaited<ReturnType<typeof listPieces>>>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const hasOpenSession = allSessions.some((session) => session.status !== "FINISHED" && session.repertoire_item_id !== FREE_PRACTICE_PIECE_ID);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    void container.getDeps().then(async (deps) => {
      const [items, history] = await Promise.all([
        listPieces(deps),
        listSessions(deps),
      ]);
      if (active) { setPieces(items); setAllSessions(history); setSessions(pieceId ? history.filter((session) => session.repertoire_item_id === pieceId) : history); setLoaded(true); }
    }).catch(() => { if (active) { setError("Não foi possível carregar as sessões."); setLoaded(true); } });
    return () => { active = false; };
  }, [pieceId]);

  return <main className="mx-auto w-full max-w-4xl px-6 py-10 text-[var(--text-primary)]">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
      <div>
      <h1 className="font-display text-4xl">Sessões</h1>
      <p className="mt-2 text-[var(--text-secondary)]">Histórico de prática e gravações.</p>
      </div>
      <button type="button" className="cress-btn-primary" disabled={!loaded || hasOpenSession} title={hasOpenSession ? "Finalize ou retome a sessão em andamento antes de iniciar outra." : undefined} onClick={() => setModalOpen(true)}>Nova sessão</button>
    </header>
    {modalOpen && <StartSessionModal onClose={() => setModalOpen(false)} />}
    {error && <p role="alert" className="mt-6 text-sm text-[var(--danger)]">{error}</p>}
    {!loaded ? <p className="mt-6 text-sm text-[var(--text-muted)]" aria-busy="true">Carregando sessões…</p> : !sessions.length ? <p className="mt-6 text-sm text-[var(--text-muted)]">Nenhuma sessão registrada.</p> : <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
      {sessions.map((session) => <li key={session.id}>
        <Link to={`/sessions/${session.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 hover:text-[var(--violet-300)]">
          <span className="min-w-40 font-medium">{session.repertoire_item_id === FREE_PRACTICE_PIECE_ID ? "Prática livre" : pieces.find((piece) => piece.id === session.repertoire_item_id)?.title ?? "Obra indisponível"}</span>
          <time className="text-sm text-[var(--text-secondary)]" dateTime={session.startedAt?.toISOString()}>{session.startedAt?.toLocaleString("pt-BR") ?? "Data indisponível"}</time>
          <span className="text-sm text-[var(--text-secondary)]">{duration(session.activeMs)}{session.initial_bpm != null || session.final_bpm != null ? ` · ${session.initial_bpm ?? "—"} → ${session.final_bpm ?? "—"} BPM` : ""}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </li>)}
    </ul>}
  </main>;
}
