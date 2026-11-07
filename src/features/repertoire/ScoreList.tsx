import { useEffect, useState } from "react";
import { attachScoreFile, deleteScore, listScores, renameScore, reorderScore } from "../../application/scores";
import type { Deps } from "../../application/deps";
import type { ScoreDocumentRow } from "../../infrastructure/db/rows";
import { container } from "../../app/container";

export function ScoreList({ pieceId }: { pieceId: string }) {
  const [scores, setScores] = useState<ScoreDocumentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    setScores(await listScores(await container.getDeps(), { pieceId }));
  }

  useEffect(() => {
    let active = true;
    void container.getDeps().then((deps) => listScores(deps, { pieceId })).then((items) => {
      if (active) setScores(items);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as partituras.");
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
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="piece-scores-title" className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 id="piece-scores-title" className="font-display text-2xl text-[var(--text-primary)]">Partituras</h2>
        <button type="button" disabled={busy} className="rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-sm text-white" onClick={() => void mutate((deps) => attachScoreFile(deps, { pieceId }))}>Anexar PDF</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {!scores.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma partitura anexada.</p> : (
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {scores.map((score, index) => (
            <li key={score.id} className="flex items-center justify-between gap-4 py-4">
              <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{score.label}</p>
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" aria-label={`Mover ${score.label} para cima`} disabled={busy || index === 0} className="text-sm text-[var(--text-secondary)] disabled:opacity-40" onClick={() => void mutate((deps) => reorderScore(deps, { id: score.id, direction: "up" }))}>↑</button>
                <button type="button" aria-label={`Mover ${score.label} para baixo`} disabled={busy || index === scores.length - 1} className="text-sm text-[var(--text-secondary)] disabled:opacity-40" onClick={() => void mutate((deps) => reorderScore(deps, { id: score.id, direction: "down" }))}>↓</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--text-secondary)]" onClick={() => {
                  const label = window.prompt("Nome da partitura:", score.label);
                  if (label !== null) void mutate((deps) => renameScore(deps, { id: score.id, label }));
                }}>Renomear</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--danger)]" onClick={() => {
                  if (window.confirm("Excluir esta partitura e o arquivo PDF?")) void mutate((deps) => deleteScore(deps, { id: score.id }));
                }}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
