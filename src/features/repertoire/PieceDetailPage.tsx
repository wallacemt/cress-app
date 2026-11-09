import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  archivePiece,
  deletePiece,
  listPieces,
  unarchivePiece,
} from "../../application/repertoire";
import { listGoals } from "../../application/goals";
import { getPieceStats } from "../../application/sessions";
import type { Deps } from "../../application/deps";
import { container } from "../../app/container";
import type { StudyGoal } from "../../domain/goal";
import type { RepertoireItem } from "../../domain/repertoire";
import { INSTRUMENTS } from "../../domain/profile";
import { GoalList } from "./GoalList";
import { PieceFormDialog } from "./PieceFormDialog";
import { ScoreList } from "./ScoreList";
import type { StudySession } from "../../domain/session";

type PieceStats = Awaited<ReturnType<typeof getPieceStats>>;
function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
}
function formatDate(date: Date | null) {
  return date ? date.toLocaleString("pt-BR") : "Nunca";
}

export function PieceDetailPage() {
  const { pieceId = "" } = useParams();
  const navigate = useNavigate();
  const [piece, setPiece] = useState<RepertoireItem>();
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [stats, setStats] = useState<PieceStats>();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reloadGoals() {
    const deps = await container.getDeps();
    setGoals(await listGoals(deps, { repertoireItemId: pieceId }));
  }

  useEffect(() => {
    let active = true;
    void container
      .getDeps()
      .then(async (deps) => {
        const [pieces, items, pieceStats] = await Promise.all([
          listPieces(deps),
          listGoals(deps, { repertoireItemId: pieceId }),
          getPieceStats(deps, { repertoireItemId: pieceId }),
        ]);
        if (active) {
          setPiece(pieces.find((item) => item.id === pieceId));
          setGoals(items);
          setStats(pieceStats);
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a obra.");
      });
    return () => {
      active = false;
    };
  }, [pieceId]);

  async function action(run: (deps: Deps) => Promise<unknown>, remove = false) {
    setBusy(true);
    setError("");
    try {
      await run(await container.getDeps());
      if (remove) navigate("/repertoire");
      else {
        const items = await listPieces(await container.getDeps());
        setPiece(items.find((item) => item.id === pieceId));
      }
    } catch (cause) {
      setError(
        cause instanceof Error &&
          "code" in cause &&
          cause.code === "PIECE_HAS_SESSIONS"
          ? "Esta obra tem sessões registradas — arquive em vez de excluir."
          : cause instanceof Error
            ? cause.message
            : "Não foi possível concluir a ação.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (error && !piece)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p role="alert" className="text-[var(--danger)]">
          {error}
        </p>
      </main>
    );
  if (!piece)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true">
        <p className="text-sm text-[var(--text-muted)]">Carregando obra…</p>
      </main>
    );
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 text-[var(--text-primary)]">
      <button
        type="button"
        className="mb-8 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        onClick={() => navigate("/repertoire")}
      >
        ← Repertório
      </button>
      <header className="border-b border-[var(--border-subtle)] pb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">
          OBRA{piece.archived ? " · ARQUIVADA" : ""}
        </p>
        <h1 className="font-display text-4xl">{piece.title}</h1>
        {(piece.composer || piece.instrument) && (
          <p className="mt-2 text-[var(--text-secondary)]">
            {[
              piece.composer,
              piece.instrument ? INSTRUMENTS[piece.instrument] : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm"
            onClick={() => setEditing(true)}
          >
            Editar
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm"
            onClick={() =>
              void action((deps) =>
                piece.archived
                  ? unarchivePiece(deps, { id: piece.id })
                  : archivePiece(deps, { id: piece.id }),
              )
            }
          >
            {piece.archived ? "Desarquivar" : "Arquivar"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-[var(--danger)]/50 px-4 py-2.5 text-sm text-[var(--danger)]"
            onClick={() =>
              void action((deps) => deletePiece(deps, { id: piece.id }), true)
            }
          >
            Excluir
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <GoalList goals={goals} repertoireItemId={pieceId} onChanged={reloadGoals} />
      <section aria-labelledby="piece-practice-title" className="mt-10">
        <h2 id="piece-practice-title" className="font-display text-2xl text-[var(--text-primary)]">Prática</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-[var(--text-muted)]">Tempo estudado</dt><dd className="mt-1 text-sm">{formatDuration(stats?.totalActiveMs ?? 0)}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">Sessões</dt><dd className="mt-1 text-sm">{stats?.totalSessions ?? 0}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">Última prática</dt><dd className="mt-1 text-sm">{formatDate(stats?.lastPracticeAt ?? null)}</dd></div>
        </dl>
        <h3 className="mt-6 text-sm font-semibold">Histórico de sessões</h3>
        {!stats?.sessions.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma sessão registrada.</p> : <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
          {stats.sessions.map((session: StudySession & { initial_bpm: number | null; final_bpm: number | null }) => <li key={session.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
            <time dateTime={session.startedAt?.toISOString()}>{formatDate(session.startedAt)}</time>
            <span>{formatDuration(session.activeMs)}{session.initial_bpm != null || session.final_bpm != null ? ` · ${session.initial_bpm ?? "—"} → ${session.final_bpm ?? "—"} BPM` : ""}</span>
          </li>)}
        </ul>}
      </section>
      <ScoreList pieceId={pieceId} />
      {editing && (
        <PieceFormDialog
          piece={piece}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setPiece(saved);
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}
