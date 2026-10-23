import { useEffect, useState } from "react";
import type { StudySessionRow } from "../../infrastructure/db/rows";

export function useSessionClock(session: StudySessionRow | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (session?.status !== "ACTIVE") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.status, session?.id]);
  return (session?.active_ms ?? 0) + (session?.status === "ACTIVE" && session.resumed_at != null ? Math.max(0, now - session.resumed_at) : 0);
}
