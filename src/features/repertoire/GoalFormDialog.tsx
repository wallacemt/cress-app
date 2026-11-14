import { useState, type FormEvent } from "react";
import { createGoal, updateGoal } from "../../application/goals";
import { container } from "../../app/container";
import type { StudyGoal } from "../../domain/goal";
import { useLanguageStore } from "../../stores/languageStore";
import { t } from "../../lib/i18n";

const control =
  "rounded-lg border border-[var(--border-default)] bg-[var(--ink-800)] px-4 text-[var(--text-primary)] outline-none focus:border-[var(--violet-400)] focus:ring-2 focus:ring-[var(--violet-tint)]";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--violet-300)] disabled:cursor-not-allowed disabled:opacity-45";

export function GoalFormDialog({
  repertoireItemId,
  goal,
  onClose,
  onSaved,
}: {
  repertoireItemId: string;
  goal?: StudyGoal;
  onClose: () => void;
  onSaved: (goal: StudyGoal) => void;
}) {
  useLanguageStore((state) => state.language);
  const [description, setDescription] = useState(goal?.description ?? "");
  const [targetBpm, setTargetBpm] = useState(goal?.targetBpm?.toString() ?? "");
  const [startMeasure, setStartMeasure] = useState(goal?.startMeasure?.toString() ?? "");
  const [endMeasure, setEndMeasure] = useState(goal?.endMeasure?.toString() ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const input = {
      repertoireItemId,
      description: description.trim(),
      targetBpm: targetBpm === "" ? null : Number(targetBpm),
      startMeasure: startMeasure === "" ? null : Number(startMeasure),
      endMeasure: endMeasure === "" ? null : Number(endMeasure),
    };
    try {
      const deps = await container.getDeps();
      const saved = goal
        ? await updateGoal(deps, { ...input, id: goal.id })
        : await createGoal(deps, input);
      onSaved({ id: saved.id, description: saved.description, targetBpm: saved.target_bpm, startMeasure: saved.measure_start, endMeasure: saved.measure_end, completed: saved.completed_at !== null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("repertoire.save_goal_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="goal-form-title" className="w-full max-w-xl rounded-xl border border-[var(--border-default)] bg-[var(--ink-900)] p-6 text-[var(--text-primary)] shadow-2xl">
        <h2 id="goal-form-title" className="font-display text-3xl">{goal ? t("repertoire.edit_goal") : t("repertoire.add_goal")}</h2>
        <form className="mt-6 space-y-4" onSubmit={save}>
          <label className="block text-sm text-[var(--text-secondary)]">{t("repertoire.description")} *
            <input autoFocus required aria-label={t("repertoire.description")} className={`${control} mt-2 h-11 w-full`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block text-sm text-[var(--text-secondary)]">{t("repertoire.target_bpm")}
            <input type="number" aria-label={t("repertoire.target_bpm")} className={`${control} mt-2 h-11 w-full`} value={targetBpm} onChange={(e) => setTargetBpm(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-[var(--text-secondary)]">{t("repertoire.start_measure")}
              <input type="number" aria-label={t("repertoire.start_measure")} className={`${control} mt-2 h-11 w-full`} value={startMeasure} onChange={(e) => setStartMeasure(e.target.value)} />
            </label>
            <label className="block text-sm text-[var(--text-secondary)]">{t("repertoire.end_measure")}
              <input type="number" aria-label={t("repertoire.end_measure")} className={`${control} mt-2 h-11 w-full`} value={endMeasure} onChange={(e) => setEndMeasure(e.target.value)} />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className={`${button} border border-[var(--border-default)] text-[var(--text-secondary)]`} onClick={onClose}>{t("repertoire.cancel")}</button>
            <button type="submit" disabled={saving} className={`${button} bg-[var(--violet-600)] text-white hover:bg-[var(--violet-500)]`}>{saving ? t("repertoire.saving") : t("repertoire.save_goal")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
