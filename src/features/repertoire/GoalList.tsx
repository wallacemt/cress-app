import { useState } from "react";
import { completeGoal, deleteGoal, reopenGoal } from "../../application/goals";
import { container } from "../../app/container";
import type { StudyGoal } from "../../domain/goal";
import { GoalFormDialog } from "./GoalFormDialog";
import { useLanguageStore } from "../../stores/languageStore";
import { t } from "../../lib/i18n";

export function GoalList({
  goals,
  repertoireItemId,
  onChanged,
}: {
  goals: StudyGoal[];
  repertoireItemId: string;
  onChanged: () => Promise<void>;
}) {
  useLanguageStore((state) => state.language);
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
      setError(cause instanceof Error ? cause.message : t("repertoire.action_error"));
    } finally {
      setBusy(false);
    }
  }

  const ordered = [...goals].sort((a, b) => Number(a.completed) - Number(b.completed));
  return (
    <section aria-labelledby="piece-goals-title" className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 id="piece-goals-title" className="font-display text-2xl text-[var(--text-primary)]">{t("repertoire.goals")}</h2>
        <button type="button" className="rounded-lg bg-[var(--violet-600)] px-4 py-2.5 text-sm text-white" onClick={() => setEditing(null)}>{t("repertoire.add_goal")}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      {!ordered.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">{t("repertoire.no_goals")}</p> : (
        <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
          {ordered.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={t(goal.completed ? "repertoire.reopen_goal_label" : "repertoire.complete_goal_label", { description: goal.description })} checked={goal.completed} disabled={busy} className="mt-1 accent-[var(--gold-400)]" onChange={() => void mutate((deps) => goal.completed ? reopenGoal(deps, { id: goal.id }) : completeGoal(deps, { id: goal.id }))} />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{goal.description}</p>
                  {goal.targetBpm != null && <p className="mt-1 text-xs text-[var(--text-muted)]">{t("repertoire.target", { bpm: goal.targetBpm })}</p>}
                  {goal.startMeasure != null && <p className="mt-1 text-xs text-[var(--text-muted)]">{t("repertoire.measures", { start: goal.startMeasure, end: goal.endMeasure != null ? `–${goal.endMeasure}` : "" })}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)]">{goal.completed ? t("repertoire.completed") : t("repertoire.in_progress")}</span>
                <button type="button" disabled={busy} className="text-sm text-[var(--text-secondary)]" onClick={() => setEditing(goal)}>{t("repertoire.edit")}</button>
                <button type="button" disabled={busy} className="text-sm text-[var(--danger)]" onClick={() => { if (window.confirm(t("repertoire.delete_goal_confirm"))) void mutate((deps) => deleteGoal(deps, { id: goal.id })); }}>{t("repertoire.delete")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing !== undefined && <GoalFormDialog repertoireItemId={repertoireItemId} goal={editing ?? undefined} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void onChanged(); }} />}
    </section>
  );
}
