import { useEffect } from "react";
import { heartbeat } from "../../application/sessions";
import type { Deps } from "../../application/deps";

export function useHeartbeat(deps: Deps | null, id: string | undefined, active: boolean) {
  useEffect(() => {
    if (!deps || !id || !active) return;
    // ponytail: 20 s deixa margem para fechamento inesperado sem gerar escrita frequente no SQLite.
    const timer = window.setInterval(() => void heartbeat(deps, { id }), 20_000);
    return () => window.clearInterval(timer);
  }, [deps, id, active]);
}
