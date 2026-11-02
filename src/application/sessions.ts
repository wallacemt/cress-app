import { DomainError } from "../domain/errors";
import {
  createSession,
  pause,
  resume,
  finish,
  heartbeat as beat,
  recover,
  updateNotes,
} from "../domain/session";
import type { Deps } from "./deps";
import { makeSessionRepo } from "../infrastructure/repositories/sessionRepo";
import { makeRecordingRepo } from "../infrastructure/repositories/recordingRepo";
import { makeGoalRepo } from "../infrastructure/repositories/goalRepo";
import type { StudySessionRow } from "../infrastructure/db/rows";
import { pauseTake, stopTake } from "./recordings";
import { completeGoal } from "./goals";
import type { StudySession } from "../domain/session";
export interface StartSessionInput {
  repertoireItemId: string;
  goalId?: string;
  initialBpm?: number | null;
}
export interface FinishSessionInput {
  id: string;
  finalBpm?: number | null;
  notes?: string;
  completeGoal: boolean;
}
type SessionEntity = StudySession & {
  repertoire_item_id: string;
  goal_id: string | null;
  initial_bpm: number | null;
  final_bpm: number | null;
};
const ent = (r: StudySessionRow): SessionEntity => ({
  id: r.id,
  status: r.status,
  startedAt: r.started_at ? new Date(r.started_at) : null,
  resumedAt: r.resumed_at ? new Date(r.resumed_at) : null,
  lastHeartbeatAt: new Date(r.last_heartbeat_at),
  endedAt: r.ended_at ? new Date(r.ended_at) : null,
  activeMs: r.active_ms,
  notes: r.notes ?? "",
  repertoire_item_id: r.repertoire_item_id,
  goal_id: r.goal_id,
  initial_bpm: r.initial_bpm,
  final_bpm: r.final_bpm,
});
const row = (
  r: SessionEntity | StudySession,
  x: Partial<StudySessionRow> & {
    repertoire_item_id: string;
    goal_id?: string | null;
    initial_bpm?: number | null;
    final_bpm?: number | null;
  },
): StudySessionRow => ({
  ...x,
  id: r.id,
  repertoire_item_id: x.repertoire_item_id,
  goal_id: x.goal_id ?? null,
  status: r.status,
  started_at: r.startedAt?.getTime() ?? 0,
  ended_at: r.endedAt?.getTime() ?? null,
  active_ms: r.activeMs,
  resumed_at: r.resumedAt?.getTime() ?? null,
  last_heartbeat_at: r.lastHeartbeatAt?.getTime() ?? 0,
  initial_bpm: x.initial_bpm ?? null,
  final_bpm: x.final_bpm ?? null,
  notes: r.notes,
});
export async function startSession(d: Deps, x: StartSessionInput) {
  const repo = makeSessionRepo(d.db);
  if ((await repo.open()).length)
    throw new DomainError("SESSION_ALREADY_OPEN", "Session already open");
  const goal = x.goalId
    ? (
        await d.db.select<{ repertoire_item_id: string }>(
          "SELECT * FROM study_goals WHERE id=$1",
          [x.goalId],
        )
      )[0]
    : null;
  if (x.goalId && !goal) throw new DomainError("NOT_FOUND", "Goal not found");
  if (goal && goal.repertoire_item_id !== x.repertoireItemId)
    throw new DomainError("GOAL_MISMATCH", "Goal belongs to another piece");
  const s = createSession(d.newId(), d.now());
  await repo.save(
    row(s, {
      repertoire_item_id: x.repertoireItemId,
      goal_id: x.goalId ?? null,
      initial_bpm: x.initialBpm ?? null,
    }),
  );
  return s;
}
async function change(
  d: Deps,
  id: string,
  fn: (s: StudySession) => StudySession,
) {
  const repo = makeSessionRepo(d.db),
    r = await repo.get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Session not found");
  const s = fn(ent(r));
  await repo.save(row(s, r));
  return s;
}
export async function pauseSession(d: Deps, { id }: { id: string }) {
  if ((await makeRecordingRepo(d.db).forSession(id)).some((t) => t.status === "RECORDING")) await pauseTake(d);
  return change(d, id, (s) => pause(s, d.now()));
}
export const resumeSession = (d: Deps, { id }: { id: string }) =>
  change(d, id, (s) => resume(s, d.now()));
export async function heartbeat(d: Deps, { id }: { id: string }) {
  const r = await makeSessionRepo(d.db).get(id);
  if (r?.status === "ACTIVE") await change(d, id, (s) => beat(s, d.now()));
}
export async function updateSessionNotes(
  d: Deps,
  x: { id: string; notes: string },
) {
  return change(d, x.id, (s) => updateNotes(s, x.notes));
}
export async function setSessionGoal(
  d: Deps,
  x: { id: string; goalId: string | null },
) {
  const repo = makeSessionRepo(d.db);
  const session = await repo.get(x.id);
  if (!session) throw new DomainError("NOT_FOUND", "Session not found");
  if (x.goalId) {
    const goal = await makeGoalRepo(d.db).get(x.goalId);
    if (!goal || goal.repertoire_item_id !== session.repertoire_item_id)
      throw new DomainError("NOT_FOUND", "Goal not found for session piece");
  }
  const updated = { ...session, goal_id: x.goalId };
  await repo.save(updated);
  return updated;
}
export async function finishSession(d: Deps, x: FinishSessionInput) {
  const repo = makeSessionRepo(d.db),
    r = await repo.get(x.id);
  if (!r) throw new DomainError("NOT_FOUND", "Session not found");
  if (
    (await makeRecordingRepo(d.db).forSession(x.id)).some(
      (t) => t.status === "RECORDING",
    )
  )
    await stopTake(d);
  const s = finish(ent(r), d.now());
  s.notes = x.notes ?? s.notes;
  await repo.save(row(s, { ...r, final_bpm: x.finalBpm ?? r.final_bpm }));
  if (x.completeGoal && r.goal_id) await completeGoal(d, { id: r.goal_id });
  return s;
}
export async function discardSession(d: Deps, { id }: { id: string }) {
  const r = await makeSessionRepo(d.db).get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Session not found");
  for (const t of await makeRecordingRepo(d.db).forSession(id)) {
    if (t.status === "RECORDING") await d.audio.stopRecording();
    await d.audio.deleteRecordingFile(t.relative_path);
  }
  await makeSessionRepo(d.db).remove(id);
}
export async function recoverOnBoot(d: Deps) {
  const repo = makeSessionRepo(d.db),
    rows = await repo.list(),
    recoveredSession = rows.filter((x) => x.status === "ACTIVE").length;
  for (const r of rows.filter((x) => x.status === "ACTIVE")) {
    const s = recover(ent(r));
    await repo.save(row(s, r));
  }
  const recordingRepo = makeRecordingRepo(d.db);
  let recoveredTakes = 0;
  for (const take of await recordingRepo.active()) {
    const probe = await d.audio.probeRecording(take.relative_path);
    if (!probe) {
      await recordingRepo.remove(take.id);
      continue;
    }
    take.status = "COMPLETE";
    take.duration_ms = probe.durationMs;
    take.sample_rate = probe.sampleRate;
    await recordingRepo.update(take);
    recoveredTakes++;
  }
  return { recoveredSession, recoveredTakes };
}
