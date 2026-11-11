import { useCallback, useMemo, useRef, useState } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewTheme,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import {
  buildDefaultLayoutAddPanelSpecs,
  chooseLayoutSource,
  type WorkspaceMode,
} from "../../domain/workspace";
import { container } from "../../app/container";
import { loadLayout } from "../../application/workspace";
import { ensureFreeSessionRow } from "../../application/sessions";
import { listScores } from "../../application/scores";
import {
  panelRegistry,
  panelRenderer,
  WorkspaceWatermark,
  PanelTab,
} from "./panelRegistry";
import { useLayoutPersistence } from "./useLayoutPersistence";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { useWorkspaceLayoutStore } from "../../stores/workspaceLayoutStore";
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
  const [freeSession, setFreeSession] = useState<StudySessionRow | null>(null);
  const [scoresInfo, setScoresInfo] = useState<{ hasScores: boolean; firstScoreId?: string }>({ hasScores: false });
  const effectiveSession = session ?? freeSession;
  const apiRef = useRef<DockviewReadyEvent["api"] | null>(null);
  const layoutReadyRef = useRef(false);
  const setPanelCount = useWorkspaceLayoutStore((s) => s.setPanelCount);
  const setGroupCount = useWorkspaceLayoutStore((s) => s.setGroupCount);
  useLayoutPersistence(
    ready?.api ?? null,
    deps,
    mode === "session" ? pieceId : undefined,
  );

  // Função síncrona para ler contagem final - chamada UMA vez após layout estabilizar
  const commitLayoutCounts = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    setPanelCount(api.totalPanels);
    setGroupCount(api.groups.length);
  }, [setPanelCount, setGroupCount]);
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
    apiRef.current = event.api;
    const setRenderer = (panel: (typeof event.api.panels)[number]) => {
      panel.api.setRenderer(panelRenderer(panel.api.component));
    };
    event.api.panels.forEach(setRenderer);
    event.api.onDidAddPanel((panel) => {
      setRenderer(panel);
      // Não atualizar contagem aqui - esperar layout estabilizar
    });
    event.api.onDidRemovePanel(() => {});
    event.api.onDidAddGroup(() => {});
    event.api.onDidRemoveGroup(() => {});
    let activeDeps: Awaited<ReturnType<typeof container.getDeps>> | null = null;
    let activeSession = session ?? freeSession;
    let hasScores = scoresInfo.hasScores;
    let firstScoreId = scoresInfo.firstScoreId;
    let scoreIds = new Set<string>();
    const scopedPieceId = mode === "session" ? pieceId : undefined;
    const applyDefault = () => {
      event.api.closeAllGroups();
      const containerSize = { width: event.api.width, height: event.api.height };
      for (const spec of buildDefaultLayoutAddPanelSpecs(mode, hasScores, firstScoreId, containerSize, activeSession && activeDeps ? { session: activeSession, pieceId, deps: activeDeps } : undefined)) event.api.addPanel(spec);
    };
    try {
      activeDeps = await container.getDeps();
      if (mode === "free") {
        const freeRow = await ensureFreeSessionRow(activeDeps);
        activeSession = freeRow;
        setFreeSession(freeRow);
      }
      if (scopedPieceId) {
        const scores = await listScores(activeDeps, { pieceId: scopedPieceId });
        scoreIds = new Set(scores.map((score) => score.id));
        hasScores = scores.length > 0;
        firstScoreId = scores[0]?.id;
        setScoresInfo({ hasScores, firstScoreId });
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
          // Painéis dentro de popouts reabrem de forma assíncrona — sem aguardar,
          // o loop abaixo roda antes deles existirem em event.api.panels e nunca
          // recebem params (session/deps), travando session.id como undefined.
          await event.api.popoutRestorationPromise;
          for (const panel of event.api.panels) {
            if ((panel.api.component === "session" || panel.api.component === "recorder") && activeSession && activeDeps) {
              panel.api.updateParameters({ session: activeSession, pieceId, deps: activeDeps });
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
      if (mode === "free" && activeSession && activeDeps) {
        for (const panel of event.api.panels) {
          if (panel.api.component === "recorder")
            panel.api.updateParameters({ session: activeSession, pieceId, deps: activeDeps });
        }
      }
    } catch (error) {
      console.warn(
        "Não foi possível carregar o layout; usando o padrão.",
        error,
      );
      applyDefault();
    }
    if (activeDeps) setDeps(activeDeps);
    // Commit final counts after layout is fully initialized (fromJSON or applyDefault done)
    // Use queueMicrotask to run after all synchronous addPanel calls complete
    if (!layoutReadyRef.current) {
      layoutReadyRef.current = true;
      queueMicrotask(() => commitLayoutCounts());
    }
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
        session={effectiveSession}
        hasScores={scoresInfo.hasScores}
        firstScoreId={scoresInfo.firstScoreId}
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
