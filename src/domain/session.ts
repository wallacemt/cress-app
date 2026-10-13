import { DomainError } from "./errors";
export type SessionStatus = "ACTIVE" | "PAUSED" | "FINISHED";
export interface StudySession {
  id: string;
  status: SessionStatus;
  startedAt: Date | null;
  resumedAt: Date | null;
  lastHeartbeatAt: Date | null;
  endedAt: Date | null;
  activeMs: number;
  notes: string;
}
export function createSession(id: string, now = new Date()): StudySession {
  return {
    id,
    status: "ACTIVE",
    startedAt: now,
    resumedAt: now,
    lastHeartbeatAt: now,
    endedAt: null,
    activeMs: 0,
    notes: "",
  };
}
const invalid = (): never => {
  throw new DomainError("INVALID_TRANSITION", "Invalid session transition");
};
export function pause(s: StudySession, now = new Date()): StudySession {
  if (s.status !== "ACTIVE" || !s.resumedAt) return invalid();
  return {
    ...s,
    status: "PAUSED",
    activeMs: s.activeMs + Math.max(0, now.getTime() - s.resumedAt.getTime()),
    resumedAt: null,
  };
}
export function resume(s: StudySession, now = new Date()): StudySession {
  if (s.status !== "PAUSED") return invalid();
  return { ...s, status: "ACTIVE", resumedAt: now, lastHeartbeatAt: now };
}
export function finish(s: StudySession, now = new Date()): StudySession {
  if (s.status === "FINISHED") return invalid();
  const active =
    s.status === "ACTIVE" && s.resumedAt
      ? s.activeMs + Math.max(0, now.getTime() - s.resumedAt.getTime())
      : s.activeMs;
  return {
    ...s,
    status: "FINISHED",
    activeMs: active,
    endedAt: now,
    resumedAt: null,
  };
}
export function heartbeat(s: StudySession, now = new Date()): StudySession {
  if (s.status !== "ACTIVE") return invalid();
  return { ...s, lastHeartbeatAt: now };
}
export function recover(s: StudySession): StudySession {
  if (s.status !== "ACTIVE" || !s.resumedAt || !s.lastHeartbeatAt)
    return invalid();
  return {
    ...s,
    status: "PAUSED",
    activeMs:
      s.activeMs +
      Math.max(0, s.lastHeartbeatAt.getTime() - s.resumedAt.getTime()),
    resumedAt: null,
  };
}
export function updateNotes(s: StudySession, notes: string): StudySession {
  if (notes.length > 2000)
    throw new DomainError("VALIDATION", "Notes too long");
  return { ...s, notes };
}
