import { useState } from "react";
import { completeGoal, deleteGoal, reopenGoal } from "../../application/goals";
import { container } from "../../app/container";
import type { StudyGoal } from "../../domain/goal";
import { GoalFormDialog } from "./GoalFormDialog";

export function GoalList({
  goals,
  repertoireItemId,
  onChanged,
}: {
  goals: StudyGoal[];
  repertoireItemId: string;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<StudyGoal | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function mutate(run: (deps: Awaited<ReturnType<typeof container.getDeps>>) => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run(await container.getDeps());
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  const ordered = [...goals].sort((a, b) => Number(a.completed) - Number(b.completed));
  return (
    <section aria-labelledby="piece-goals-title" className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 id="piece-goals-title" className="font-display text-2xl text-[var(--text-primary)]">Objetivos</h2>
        <button type="button" className="rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-sm text-white" onClick={() => setEditing(null)}>Adicionar objetivo</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {!ordered.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhum objetivo registrado.</p> : (
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {ordered.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={`${goal.completed ? "Reabrir" : "Concluir"}: ${goal.description}`} checked={goal.completed} disabled={busy} className="mt-1 accent-[var(--gold-400)]" onChange={() => void mutate((deps) => goal.completed ? reopenGoal(deps, { id: goal.id }) : completeGoal(deps, { id: goal.id }))} />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{goal.description}</p>
                  {goal.targetBpm != null && <p className="mt-1 text-xs text-[var(--text-muted)]">Meta: {goal.targetBpm} BPM</p>}
                  {goal.startMeasure != null && <p className="mt-1 text-xs text-[var(--text-muted)]">Compassos {goal.startMeasure}{goal.endMeasure != null ? `–${goal.endMeasure}` : ""}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)]">{goal.completed ? "Concluído" : "Em andamento"}</span>
                <button type="button" disabled={busy} className="text-sm text-[var(--text-secondary)]" onClick={() => setEditing(goal)}>Editar</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--danger)]" onClick={() => { if (window.confirm("Excluir este objetivo?")) void mutate((deps) => deleteGoal(deps, { id: goal.id })); }}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing !== undefined && <GoalFormDialog repertoireItemId={repertoireItemId} goal={editing ?? undefined} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void onChanged(); }} />}
    </section>
  );
}
