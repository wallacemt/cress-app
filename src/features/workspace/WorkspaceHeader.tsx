import { ArrowLeft, Pause, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { finishSession, pauseSession, resumeSession } from "../../application/sessions";
import type { StudySessionRow } from "../../infrastructure/db/rows";
import { FinishSessionDialog } from "./FinishSessionDialog";
import { useSessionClock } from "./useSessionClock";
import { useHeartbeat } from "./useHeartbeat";
import type { DockviewReadyEvent } from "dockview-react";
import type { WorkspaceMode } from "../../domain/workspace";
import type { Deps } from "../../application/deps";
import { AddPanelMenu, useWorkspacePanelShortcuts } from "./AddPanelMenu";
import { LayoutMenu } from "./LayoutMenu";

export function WorkspaceHeader({
  mode,
  api,
  deps,
  pieceId,
  pieceTitle,
  goalSummary,
  session,
  onBack,
}: {
  mode: WorkspaceMode;
  api: DockviewReadyEvent["api"] | null;
  deps: Deps | null;
  pieceId?: string;
  pieceTitle?: string;
  goalSummary?: string;
  session?: StudySessionRow | null;
  onBack?: () => void;
}) {
  useWorkspacePanelShortcuts(api, mode);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(session ?? null);
  useEffect(() => setCurrent(session ?? null), [session]);
  const elapsed = useSessionClock(current);
  useHeartbeat(deps, current?.id, current?.status === "ACTIVE");
  const clock = `${String(Math.floor(elapsed / 60000)).padStart(2, "0")}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}`;
  async function changeSession(action: "pause" | "resume") {
    if (!deps || !current) return;
    setBusy(true);
    try {
      const value = action === "pause" ? await pauseSession(deps, { id: current.id }) : await resumeSession(deps, { id: current.id });
      setCurrent({ ...current, status: value.status, active_ms: value.activeMs, resumed_at: value.resumedAt?.getTime() ?? null, last_heartbeat_at: value.lastHeartbeatAt?.getTime() ?? current.last_heartbeat_at });
    } catch { window.alert("Não foi possível atualizar a sessão."); }
    finally { setBusy(false); }
  }
  async function finish(data: { finalBpm: number | null; notes: string; completeGoal: boolean }) {
    if (!deps || !current) return;
    setBusy(true);
    try { await finishSession(deps, { id: current.id, ...data }); setDialog(false); navigate("/"); }
    catch { window.alert("Não foi possível finalizar a sessão."); }
    finally { setBusy(false); }
  }
  return (
    <header className="cress-workspace-header">
      {mode === "session" ? (
        <>
          <button
            type="button"
            className="cress-icon-control"
            aria-label="Voltar ao início"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="cress-session-heading">
            <strong title={pieceTitle || "Sessão"}>
              {pieceTitle || "Sessão"}
            </strong>
            <span>{goalSummary || "Sem objetivo"}</span>
          </div>
          <span className="cress-clock-placeholder" aria-label="Tempo ativo">{clock}</span>
          <div className="cress-header-spacer" />
          <AddPanelMenu api={api} mode={mode} />
          <LayoutMenu api={api} mode={mode} deps={deps} pieceId={pieceId} />
          <button type="button" className="cress-control" disabled={!current || busy} onClick={() => void changeSession(current?.status === "ACTIVE" ? "pause" : "resume")}>
            {current?.status === "ACTIVE" ? <><Pause size={15} /> Pausar</> : <><Play size={15} /> Retomar</>}
          </button>
          <button type="button" className="cress-finish-button" disabled={!current || busy} onClick={() => setDialog(true)}>
            <Square size={13} /> Finalizar
          </button>
          {dialog && current && <FinishSessionDialog initialBpm={current.initial_bpm} notes={current.notes ?? ""} hasGoal={Boolean(current.goal_id)} onCancel={() => setDialog(false)} onConfirm={(data) => void finish(data)} />}
        </>
      ) : (
        <>
          <strong className="cress-free-title">Prática livre</strong>
          <span className="cress-metronome-pill">
            ♩ <span>Metrônomo</span>
          </span>
          <div className="cress-header-spacer" />
          <AddPanelMenu api={api} mode={mode} />
          <LayoutMenu api={api} mode={mode} deps={deps} pieceId={pieceId} />
        </>
      )}
    </header>
  );
}
