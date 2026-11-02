import { DomainError } from "../domain/errors";
import type { Deps } from "./deps";
import { makeRecordingRepo } from "../infrastructure/repositories/recordingRepo";
import { makeSessionRepo } from "../infrastructure/repositories/sessionRepo";
export interface StartTakeInput {
  sessionId: string;
  bpm?: number | null;
  title?: string;
}
export interface RecordingUpdateInput {
  id: string;
  title?: string;
  notes?: string | null;
}
export async function startTake(d: Deps, x: StartTakeInput) {
  const s = await makeSessionRepo(d.db).get(x.sessionId);
  if (!s || s.status !== "ACTIVE")
    throw new DomainError("SESSION_NOT_ACTIVE", "Session is not active");
  if (
    (await makeRecordingRepo(d.db).forSession(x.sessionId)).some(
      (t) => t.status === "RECORDING",
    )
  )
    throw new DomainError("TAKE_IN_PROGRESS", "Take in progress");
  const id = d.newId(), now = d.now(),
    path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.wav`;
  await makeRecordingRepo(d.db).save({
    id,
    session_id: x.sessionId,
    relative_path: path,
    format: "wav-pcm16-mono",
    status: "RECORDING",
    duration_ms: null,
    sample_rate: null,
    bpm: x.bpm ?? null,
    title: x.title ?? "Take",
    notes: null,
    created_at: now.getTime(),
  });
  try {
    const a = await d.audio.startRecording(path);
    const r = await makeRecordingRepo(d.db).get(id);
    if (r) {
      r.sample_rate = a.sampleRate;
      await makeRecordingRepo(d.db).update(r);
    }
    return r;
  } catch {
    await makeRecordingRepo(d.db).remove(id);
    throw new DomainError("INPUT_NOT_RUNNING", "Input is not running");
  }
}
export async function listTakes(d: Deps, { sessionId }: { sessionId: string }) {
  return makeRecordingRepo(d.db).forSession(sessionId);
}
async function current(d: Deps) {
  const r = (await makeRecordingRepo(d.db).active())[0];
  if (!r) throw new DomainError("NO_ACTIVE_RECORDING", "No active recording");
  return r;
}
export async function pauseTake(d: Deps) {
  await current(d);
  await d.audio.pauseRecording();
}
export async function resumeTake(d: Deps) {
  await current(d);
  await d.audio.resumeRecording();
}
export async function stopTake(d: Deps) {
  const r = await current(d),
    a = await d.audio.stopRecording();
  r.status = "COMPLETE";
  r.duration_ms = a.durationMs;
  await makeRecordingRepo(d.db).update(r);
  return r;
}
export async function onRecordingStoppedEvent(
  d: Deps,
  x: { relativePath: string; durationMs: number },
) {
  const r = (await makeRecordingRepo(d.db).active()).find(
    (t) => t.relative_path === x.relativePath,
  );
  if (r) {
    r.status = "COMPLETE";
    r.duration_ms = x.durationMs;
    await makeRecordingRepo(d.db).update(r);
  }
}
export async function renameRecording(
  d: Deps,
  x: RecordingUpdateInput & { title: string },
) {
  const r = await makeRecordingRepo(d.db).get(x.id);
  if (!r) throw new DomainError("NOT_FOUND", "Recording not found");
  if (!x.title.trim()) throw new DomainError("VALIDATION", "Title required");
  r.title = x.title;
  await makeRecordingRepo(d.db).update(r);
}
export async function setRecordingNotes(
  d: Deps,
  x: RecordingUpdateInput & { notes: string | null },
) {
  const r = await makeRecordingRepo(d.db).get(x.id);
  if (!r) throw new DomainError("NOT_FOUND", "Recording not found");
  r.notes = x.notes;
  await makeRecordingRepo(d.db).update(r);
}
export async function deleteRecording(d: Deps, { id }: { id: string }) {
  const r = await makeRecordingRepo(d.db).get(id);
  if (!r) throw new DomainError("NOT_FOUND", "Recording not found");
  if (r.status === "RECORDING")
    throw new DomainError("TAKE_IN_PROGRESS", "Stop take first");
  await d.audio.deleteRecordingFile(r.relative_path);
  await makeRecordingRepo(d.db).remove(id);
}
