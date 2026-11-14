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
import { Sparkline } from "../../components/ui/Sparkline";
import { useLanguageStore } from "../../stores/languageStore";
import { getLanguage, t } from "../../lib/i18n";

type PieceStats = Awaited<ReturnType<typeof getPieceStats>>;
function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
}
function formatDate(date: Date | null) {
  return date ? date.toLocaleString(getLanguage()) : t("repertoire.never");
}

export function PieceDetailPage() {
  useLanguageStore((state) => state.language);
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
    const [items, pieceStats] = await Promise.all([
      listGoals(deps, { repertoireItemId: pieceId }),
      getPieceStats(deps, { repertoireItemId: pieceId }),
    ]);
    setGoals(items);
    setStats(pieceStats);
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
        if (active) setError(t("repertoire.piece_load_error"));
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
          ? t("repertoire.piece_has_sessions")
          : cause instanceof Error
            ? cause.message
            : t("repertoire.action_error"),
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
        <p className="text-sm text-[var(--text-muted)]">{t("repertoire.loading_piece")}</p>
      </main>
    );
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 text-[var(--text-primary)]">
      <button
        type="button"
        className="mb-8 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        onClick={() => navigate("/repertoire")}
      >
        ← {t("repertoire.title")}
      </button>
      <header className="border-b border-[var(--border-subtle)] pb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--violet-300)]">
          {t(piece.archived ? "repertoire.archived_piece" : "repertoire.piece_upper")}
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
            {piece.archived ? t("repertoire.unarchive") : t("repertoire.archive")}
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
        <h2 id="piece-practice-title" className="font-display text-2xl text-[var(--text-primary)]">{t("repertoire.practice")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-4">
          <div><dt className="text-xs text-[var(--text-muted)]">{t("repertoire.time_studied")}</dt><dd className="mt-1 text-sm">{formatDuration(stats?.totalActiveMs ?? 0)}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">{t("repertoire.sessions")}</dt><dd className="mt-1 text-sm">{stats?.totalSessions ?? 0}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">{t("repertoire.completed_goals")}</dt><dd className="mt-1 text-sm">{stats?.completedGoals ?? 0}/{stats?.totalGoals ?? 0}</dd></div>
          <div><dt className="text-xs text-[var(--text-muted)]">{t("repertoire.last_practice")}</dt><dd className="mt-1 text-sm">{formatDate(stats?.lastPracticeAt ?? null)}</dd></div>
        </dl>
        <div className="mt-6">
          <h3 className="text-sm font-semibold">{t("repertoire.final_bpm_progress")}</h3>
          <div className="mt-2"><Sparkline values={stats?.finalBpmHistory ?? []} ariaLabel={t("repertoire.final_bpm_history")} /></div>
        </div>
        <h3 className="mt-6 text-sm font-semibold">{t("repertoire.session_history")}</h3>
        {!stats?.sessions.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">{t("repertoire.no_sessions")}</p> : <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
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
