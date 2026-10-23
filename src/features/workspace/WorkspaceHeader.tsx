import { ArrowLeft, Pause, Square } from "lucide-react";
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
  onBack,
}: {
  mode: WorkspaceMode;
  api: DockviewReadyEvent["api"] | null;
  deps: Deps | null;
  pieceId?: string;
  pieceTitle?: string;
  goalSummary?: string;
  onBack?: () => void;
}) {
  useWorkspacePanelShortcuts(api, mode);
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
          <span className="cress-clock-placeholder">00:00</span>
          <div className="cress-header-spacer" />
          <AddPanelMenu api={api} mode={mode} />
          <LayoutMenu api={api} mode={mode} deps={deps} pieceId={pieceId} />
          <button type="button" className="cress-control" disabled>
            <Pause size={15} /> Pausar
          </button>
          <button type="button" className="cress-finish-button" disabled>
            <Square size={13} /> Finalizar
          </button>
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
