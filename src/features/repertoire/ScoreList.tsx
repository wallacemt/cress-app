import { useEffect, useState } from "react";
import { attachScoreFile, deleteScore, listScores, renameScore, reorderScore } from "../../application/scores";
import type { Deps } from "../../application/deps";
import type { ScoreDocumentRow } from "../../infrastructure/db/rows";
import { container } from "../../app/container";
import { ScoreViewer } from "../pdf/ScoreViewer";
import { useLanguageStore } from "../../stores/languageStore";
import { t } from "../../lib/i18n";

export function ScoreList({ pieceId }: { pieceId: string }) {
  useLanguageStore((state) => state.language);
  const [scores, setScores] = useState<ScoreDocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function reload() {
    setScores(await listScores(await container.getDeps(), { pieceId }));
  }

  useEffect(() => {
    let active = true;
    void container.getDeps().then((deps) => listScores(deps, { pieceId })).then((items) => {
      if (active) setScores(items);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : t("repertoire.scores_load_error"));
    });
    return () => { active = false; };
  }, [pieceId]);

  async function mutate(run: (deps: Deps) => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run(await container.getDeps());
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("repertoire.action_error"));
    } finally {
      setBusy(false);
    }
  }

  async function commitRename() {
    if (!renaming) return;
    const label = renaming.label.trim();
    setRenaming(null);
    if (!label) return;
    await mutate((deps) => renameScore(deps, { id: renaming.id, label }));
  }

  return (
    <section aria-labelledby="piece-scores-title" className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 id="piece-scores-title" className="font-display text-2xl text-[var(--text-primary)]">{t("repertoire.scores")}</h2>
        <button type="button" disabled={busy} className="rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-sm text-white" onClick={() => void mutate((deps) => attachScoreFile(deps, { pieceId }))}>{t("repertoire.attach_pdf")}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {!scores.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">{t("repertoire.no_scores")}</p> : (
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {scores.map((score, index) => (
            <li key={score.id} className="py-4">
              <div className="flex items-center justify-between gap-4">
              {renaming?.id === score.id ? (
                <input
                  aria-label={t("repertoire.rename_score", { name: score.label })}
                  autoFocus
                  value={renaming.label}
                  onChange={(e) => setRenaming({ id: score.id, label: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onBlur={() => void commitRename()}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)]"
                />
              ) : (
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{score.label}</p>
              )}
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" className="text-sm text-[var(--text-secondary)]" aria-expanded={viewingId === score.id} onClick={() => setViewingId(viewingId === score.id ? null : score.id)}>{viewingId === score.id ? t("repertoire.close") : t("repertoire.preview")}</button>
                <button type="button" aria-label={t("repertoire.move_score_up", { name: score.label })} disabled={busy || index === 0} className="text-sm text-[var(--text-secondary)] disabled:opacity-40" onClick={() => void mutate((deps) => reorderScore(deps, { id: score.id, direction: "up" }))}>↑</button>
                <button type="button" aria-label={t("repertoire.move_score_down", { name: score.label })} disabled={busy || index === scores.length - 1} className="text-sm text-[var(--text-secondary)] disabled:opacity-40" onClick={() => void mutate((deps) => reorderScore(deps, { id: score.id, direction: "down" }))}>↓</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--text-secondary)]" onClick={() => setRenaming({ id: score.id, label: score.label })}>{t("repertoire.rename")}</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--danger)]" onClick={() => {
                  if (window.confirm(t("repertoire.delete_score_confirm"))) void mutate((deps) => deleteScore(deps, { id: score.id }));
                }}>{t("repertoire.delete")}</button>
              </div>
              </div>
              {viewingId === score.id && <div className="mt-4"><ScoreViewer scoreId={score.id} inline /></div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
