import { DomainError } from "./errors";
import { SessionStatus } from "./session";
import { validateBpm } from "./bpm";
export interface Recording {
  id: string;
  sessionId: string;
  relativePath: string;
  durationMs: number;
  bpm: number;
  createdAt: Date | string;
  title: string;
  notes?: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETE";
}
export function createRecording(
  input: Omit<Recording, "status">,
  sessionStatus: SessionStatus,
): Recording {
  if (sessionStatus !== "ACTIVE")
    throw new DomainError(
      "INVALID_TRANSITION",
      "Recording requires active session",
    );
  if (
    input.relativePath.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(input.relativePath)
  )
    throw new DomainError("VALIDATION", "Path must be relative");
  validateBpm(input.bpm);
  return { ...input, status: "ACTIVE" };
}
export const pauseRecording = (r: Recording): Recording => ({
  ...r,
  status: "PAUSED",
});
export const resumeRecording = (r: Recording): Recording => ({
  ...r,
  status: "ACTIVE",
});
export const finishRecording = (r: Recording): Recording => ({
  ...r,
  status: "COMPLETE",
});
