import { useMemo, useState } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewTheme,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import {
  buildDefaultLayoutPanels,
  chooseLayoutSource,
  type WorkspaceMode,
} from "../../domain/workspace";
import { container } from "../../app/container";
import { loadLayout } from "../../application/workspace";
import { listScores } from "../../application/scores";
import {
  panelRegistry,
  panelRenderer,
  WorkspaceWatermark,
  PanelTab,
} from "./panelRegistry";
import { useLayoutPersistence } from "./useLayoutPersistence";
import { WorkspaceHeader } from "./WorkspaceHeader";
import type { StudySessionRow } from "../../infrastructure/db/rows";

export interface WorkspaceProps {
  mode: WorkspaceMode;
  pieceId?: string;
  pieceTitle?: string;
  goalSummary?: string;
  session?: StudySessionRow | null;
  onBack?: () => void;
  onReady?: (event: DockviewReadyEvent) => void;
}

export function Workspace({
  mode,
  pieceId,
  pieceTitle,
  goalSummary,
  session = null,
  onBack,
  onReady,
}: WorkspaceProps) {
  const [ready, setReady] = useState<DockviewReadyEvent | null>(null);
  const [deps, setDeps] = useState<Awaited<
    ReturnType<typeof container.getDeps>
  > | null>(null);
  useLayoutPersistence(
    ready?.api ?? null,
    deps,
    mode === "session" ? pieceId : undefined,
  );
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

  const handleReady = async (event: DockviewReadyEvent) => {
    const setRenderer = (panel: (typeof event.api.panels)[number]) => {
      panel.api.setRenderer(panelRenderer(panel.api.component));
    };
    event.api.panels.forEach(setRenderer);
    event.api.onDidAddPanel(setRenderer);
    let activeDeps: Awaited<ReturnType<typeof container.getDeps>> | null = null;
    let hasScores = false;
    let firstScoreId: string | undefined;
    let scoreIds = new Set<string>();
    const scopedPieceId = mode === "session" ? pieceId : undefined;
    const applyDefault = () => {
      event.api.closeAllGroups();
      const containerSize = { width: event.api.width, height: event.api.height };
      for (const spec of buildDefaultLayoutPanels(mode, hasScores, firstScoreId, containerSize)) {
        event.api.addPanel({
          ...spec,
          params: spec.component === "session" && session && activeDeps
            ? { session, pieceId, deps: activeDeps }
            : undefined,
        });
      }
    };
    try {
      activeDeps = await container.getDeps();
      if (scopedPieceId) {
        const scores = await listScores(activeDeps, { pieceId: scopedPieceId });
        scoreIds = new Set(scores.map((score) => score.id));
        hasScores = scores.length > 0;
        firstScoreId = scores[0]?.id;
      }
      const saved = await loadLayout(activeDeps, {
        pieceId: scopedPieceId,
        mode,
        scoreIds,
      });
      const source = chooseLayoutSource(saved, mode, hasScores, firstScoreId);
      if (source.kind === "saved") {
        try {
          event.api.fromJSON(
            source.layout as unknown as Parameters<
              typeof event.api.fromJSON
            >[0],
          );
          for (const panel of event.api.panels) {
            if (panel.api.component === "session" && session && activeDeps) {
              panel.api.updateParameters({ session, pieceId, deps: activeDeps });
            }
          }
        } catch (error) {
          console.warn(
            "Não foi possível restaurar o layout; usando o padrão.",
            error,
          );
          applyDefault();
        }
      } else {
        console.warn("Layout salvo ausente ou inválido; usando o padrão.");
        applyDefault();
      }
    } catch (error) {
      console.warn(
        "Não foi possível carregar o layout; usando o padrão.",
        error,
      );
      applyDefault();
    }
    if (activeDeps) setDeps(activeDeps);
    setReady(event);
    onReady?.(event);
  };

  return (
    <div
      className="cress-workspace-shell"
      data-mode={mode}
      data-scope={pieceId ?? "free"}
      data-piece-id={pieceId}
    >
      <WorkspaceHeader
        mode={mode}
        api={ready?.api ?? null}
        deps={deps}
        session={session}
        pieceId={pieceId}
        pieceTitle={pieceTitle}
        goalSummary={goalSummary}
        onBack={onBack}
      />
      <DockviewReact
        className="cress-workspace"
        components={panelRegistry}
        defaultTabComponent={PanelTab}
        onReady={handleReady}
        disableFloatingGroups={false}
        theme={theme}
        watermarkComponent={WorkspaceWatermark}
        defaultRenderer="onlyWhenVisible"
      />
    </div>
  );
}
