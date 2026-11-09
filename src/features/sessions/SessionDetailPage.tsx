import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getGoal } from "../../application/goals";
import { listPieces } from "../../application/repertoire";
import { listTakes } from "../../application/recordings";
import { getSession } from "../../application/sessions";
import type { Deps } from "../../application/deps";
import { container } from "../../app/container";
import { FREE_PRACTICE_PIECE_ID } from "../../domain/repertoire";
import type { RecordingRow } from "../../infrastructure/db/rows";
import { RecordingItem } from "../workspace/panels/RecordingItem";

function duration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
}

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const audio = useRef(new Audio()).current;
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>>>();
  const [takes, setTakes] = useState<RecordingRow[]>([]);
  const [pieceName, setPieceName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [deps, setDeps] = useState<Deps>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void container.getDeps().then(async (d) => {
      const found = await getSession(d, { id: sessionId });
      if (!found) { if (active) setError("Sessão não encontrada."); return; }
      const [pieces, recordings, goal] = await Promise.all([
        listPieces(d), listTakes(d, { sessionId }), found.goal_id ? getGoal(d, { id: found.goal_id }) : null,
      ]);
      if (active) {
        setDeps(d); setSession(found); setTakes(recordings);
        setPieceName(found.repertoire_item_id === FREE_PRACTICE_PIECE_ID ? "Prática livre" : pieces.find((piece) => piece.id === found.repertoire_item_id)?.title ?? "Obra indisponível");
        setGoalDescription(goal?.description ?? "");
      }
    }).catch(() => { if (active) setError("Não foi possível carregar a sessão."); });
    return () => { active = false; audio.pause(); };
  }, [sessionId, audio]);

  if (error) return <main className="mx-auto max-w-4xl px-6 py-10"><p role="alert" className="text-[var(--danger)]">{error}</p><button className="mt-4 text-sm text-[var(--text-secondary)]" onClick={() => navigate("/sessions")}>← Sessões</button></main>;
  if (!session || !deps) return <main className="mx-auto max-w-4xl px-6 py-10 text-sm text-[var(--text-muted)]" aria-busy="true">Carregando sessão…</main>;

  const refresh = async () => setTakes(await listTakes(deps, { sessionId }));
  return <main className="mx-auto w-full max-w-4xl px-6 py-10 text-[var(--text-primary)]">
    <Link to="/sessions" className="mb-8 inline-block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Voltar às sessões</Link>
    <header className="border-b border-[var(--border-subtle)] pb-6">
      <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">SESSÃO · {pieceName}</p>
      <h1 className="font-display text-4xl">{session.startedAt?.toLocaleString("pt-BR") ?? "Data indisponível"}</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div><dt className="text-xs text-[var(--text-muted)]">Duração</dt><dd className="mt-1 text-sm">{duration(session.activeMs)}</dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">BPM</dt><dd className="mt-1 text-sm">{session.initial_bpm ?? "—"} → {session.final_bpm ?? "—"}</dd></div>
        {goalDescription && <div><dt className="text-xs text-[var(--text-muted)]">Objetivo</dt><dd className="mt-1 text-sm">{goalDescription}</dd></div>}
      </dl>
      {session.notes && <div className="mt-5"><h2 className="text-xs text-[var(--text-muted)]">Observações</h2><p className="mt-1 whitespace-pre-wrap text-sm">{session.notes}</p></div>}
    </header>
    <section className="mt-8" aria-labelledby="session-recordings-title">
      <h2 id="session-recordings-title" className="font-display text-2xl">Gravações</h2>
      {!takes.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">Esta sessão não tem gravações.</p> : <div className="cress-takes mt-3">{takes.filter((take) => take.status !== "RECORDING").map((take) => <RecordingItem key={take.id} take={take} deps={deps} onChange={() => void refresh()} onError={setError} audio={audio} onPlay={() => {}} />)}</div>}
    </section>
  </main>;
}
