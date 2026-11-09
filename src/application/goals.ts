import { DomainError } from "../domain/errors";
import { createStudyGoal } from "../domain/goal";
import type { Deps } from "./deps";
import { makeGoalRepo } from "../infrastructure/repositories/goalRepo";
import type { StudyGoalRow } from "../infrastructure/db/rows";
import type { StudyGoal } from "../domain/goal";
export interface GoalInput {
  id?: string;
  repertoireItemId?: string;
  description?: string;
  targetBpm?: number | null;
  startMeasure?: number | null;
  endMeasure?: number | null;
  completed?: boolean;
}
export async function getGoal(d: Deps, { id }: { id: string }) {
  const goal = await makeGoalRepo(d.db).get(id);
  return goal ? { id: goal.id, description: goal.description } : null;
}
export async function listGoals(
  d: Deps,
  { repertoireItemId }: { repertoireItemId: string },
): Promise<StudyGoal[]> {
  return (await makeGoalRepo(d.db).list())
    .filter((goal) => goal.repertoire_item_id === repertoireItemId)
    .map((goal) => ({
      id: goal.id,
      description: goal.description,
      targetBpm: goal.target_bpm,
      startMeasure: goal.measure_start,
      endMeasure: goal.measure_end,
      completed: goal.completed_at !== null,
    }));
}
const row = (d: Deps, x: GoalInput, old?: StudyGoalRow): StudyGoalRow => ({
  id: x.id ?? d.newId(),
  repertoire_item_id: x.repertoireItemId ?? (old ? old.repertoire_item_id : ""),
  description: x.description ?? (old ? old.description : ""),
  target_bpm: x.targetBpm ?? null,
  measure_start: x.startMeasure ?? null,
  measure_end: x.endMeasure ?? null,
  completed_at:
    x.completed === true
      ? d.now().getTime()
      : x.completed === false
        ? null
        : (old?.completed_at ?? null),
  created_at: old?.created_at ?? d.now().getTime(),
  updated_at: d.now().getTime(),
});
export async function createGoal(d: Deps, x: GoalInput) {
  createStudyGoal({
    id: x.id ?? d.newId(),
    description: x.description ?? "",
    targetBpm: x.targetBpm,
    startMeasure: x.startMeasure,
    endMeasure: x.endMeasure,
  });
  const r = row(d, x);
  await makeGoalRepo(d.db).save(r);
  return r;
}
export async function updateGoal(d: Deps, x: GoalInput & { id: string }) {
  const repo = makeGoalRepo(d.db),
    o = await repo.get(x.id);
  if (!o) throw new DomainError("NOT_FOUND", "Goal not found");
  const r = row(d, x, o);
  createStudyGoal({
    id: r.id,
    description: r.description,
    targetBpm: r.target_bpm,
    startMeasure: r.measure_start,
    endMeasure: r.measure_end,
  });
  await repo.save(r);
  return r;
}
export async function deleteGoal(d: Deps, { id }: { id: string }) {
  if (!(await makeGoalRepo(d.db).get(id)))
    throw new DomainError("NOT_FOUND", "Goal not found");
  await makeGoalRepo(d.db).remove(id);
}
export async function completeGoal(d: Deps, { id }: { id: string }) {
  const o = await makeGoalRepo(d.db).get(id);
  if (!o) throw new DomainError("NOT_FOUND", "Goal not found");
  return updateGoal(d, {
    id,
    repertoireItemId: o.repertoire_item_id,
    description: o.description,
    targetBpm: o.target_bpm,
    startMeasure: o.measure_start,
    endMeasure: o.measure_end,
    completed: true,
  });
}
export async function reopenGoal(d: Deps, { id }: { id: string }) {
  const o = await makeGoalRepo(d.db).get(id);
  if (!o) throw new DomainError("NOT_FOUND", "Goal not found");
  return updateGoal(d, {
    id,
    repertoireItemId: o.repertoire_item_id,
    description: o.description,
    targetBpm: o.target_bpm,
    startMeasure: o.measure_start,
    endMeasure: o.measure_end,
    completed: false,
  });
}
