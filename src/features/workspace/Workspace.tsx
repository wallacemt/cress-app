import { useMemo } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewTheme,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import type { WorkspaceMode } from "../../domain/workspace";
import {
  panelRegistry,
  panelRenderer,
  WorkspaceWatermark,
} from "./panelRegistry";

export interface WorkspaceProps {
  mode: WorkspaceMode;
  scope: string;
  pieceId?: string;
  onReady?: (event: DockviewReadyEvent) => void;
}

export function Workspace({ mode, scope, pieceId, onReady }: WorkspaceProps) {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const theme: DockviewTheme = {
    name: "cress",
    className: "cress-workspace",
    colorScheme: "dark",
    gap: 8,
    tabAnimation: prefersReducedMotion ? "default" : "smooth",
    dndTabIndicator: "line",
    tabGroupIndicator: "none",
    dndOverlayMounting: "relative",
    dndPanelOverlay: "group",
    dndOverlayBorder: "1px solid rgb(167 139 250 / 0.60)",
  };

  const handleReady = (event: DockviewReadyEvent) => {
    const setRenderer = (panel: (typeof event.api.panels)[number]) => {
      panel.api.setRenderer(panelRenderer(panel.api.component));
    };
    event.api.panels.forEach(setRenderer);
    event.api.onDidAddPanel(setRenderer);
    onReady?.(event);
  };

  return (
    <div
      className="cress-workspace-shell"
      data-mode={mode}
      data-scope={scope}
      data-piece-id={pieceId}
    >
      <DockviewReact
        className="cress-workspace"
        components={panelRegistry}
        onReady={handleReady}
        disableFloatingGroups={false}
        theme={theme}
        watermarkComponent={WorkspaceWatermark}
        defaultRenderer="onlyWhenVisible"
      />
    </div>
  );
}
