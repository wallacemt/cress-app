import { useState } from "react";
import { LayoutPanelLeft } from "lucide-react";
import type { DockviewReadyEvent } from "dockview-react";
import { buildDefaultLayoutPanels, type WorkspaceMode } from "../../domain/workspace";
import { resetLayouts, saveLayout } from "../../application/workspace";
import type { Deps } from "../../application/deps";

export function LayoutMenu({
  api,
  mode,
  deps,
  pieceId,
  hasScores = false,
  firstScoreId,
}: {
  api: DockviewReadyEvent["api"] | null;
  mode: WorkspaceMode;
  deps: Deps | null;
  pieceId?: string;
  hasScores?: boolean;
  firstScoreId?: string;
}) {
  const [open, setOpen] = useState(false);
  const move = (direction: "left" | "right" | "top" | "bottom" | "center") => {
    const panel = api?.activePanel;
    if (!api || !panel) return;
    const target =
      direction === "left" ||
      direction === "right" ||
      direction === "top" ||
      direction === "bottom"
        ? api.adjacentGroupInDirection(
            panel.api.group,
            direction === "top"
              ? "up"
              : direction === "bottom"
                ? "down"
                : direction,
          )
        : undefined;
    if (direction === "center") {
      const group =
        api.groups.find((item) => item.id !== panel.api.group.id) ??
        panel.api.group;
      panel.api.moveTo({ group, position: "center" });
    } else if (target)
      panel.api.moveTo({
        group: target as typeof panel.api.group,
        position: direction,
      });
    else
      panel.api.moveTo({
        group: panel.api.group,
        position:
          direction === "top"
            ? "top"
            : direction === "bottom"
              ? "bottom"
              : direction,
      });
    setOpen(false);
  };
  const reset = async () => {
    if (!api) return;
    if (deps) await resetLayouts(deps);
    api.closeAllGroups();
    const containerSize = { width: api.width, height: api.height };
    const plan = buildDefaultLayoutPanels(mode, hasScores, firstScoreId, containerSize);
    for (const panel of plan)
      api.addPanel({
        ...panel,
        renderer: panel.component === "score" ? "always" : undefined,
      });
    if (deps) {
      await saveLayout(
        deps,
        { pieceId: mode === "session" ? pieceId : undefined },
        api.toJSON(),
      );
    }
    setOpen(false);
  };
  const floatActive = () => {
    const panel = api?.activePanel;
    if (api && panel) {
      const floating = api
        .getPopouts()
        .find((item) => item.group.id === panel.api.group.id);
      if (floating)
        panel.api.group.api.moveTo({
          group: api.groups[0] as typeof panel.api.group,
          position: "center",
        });
      else api.addFloatingGroup(panel);
    }
    setOpen(false);
  };
  return (
    <div className="cress-menu">
      <button
        type="button"
        className="cress-icon-control"
        aria-label="Layout"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <LayoutPanelLeft size={18} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Opções de layout"
          className="cress-menu-popover cress-layout-menu"
        >
          <button role="menuitem" type="button" onClick={() => void reset()}>
            Restaurar layout padrão
          </button>
          <div className="cress-menu-separator" />
          <span className="cress-menu-heading">Mover painel ativo</span>
          {(
            [
              ["left", "Esquerda"],
              ["right", "Direita"],
              ["top", "Cima"],
              ["bottom", "Baixo"],
              ["center", "Juntar ao grupo ativo"],
            ] as const
          ).map(([direction, label]) => (
            <button
              role="menuitem"
              type="button"
              key={direction}
              disabled={!api?.activePanel}
              onClick={() => move(direction)}
            >
              {label}
            </button>
          ))}
          <button
            role="menuitem"
            type="button"
            disabled={!api?.activePanel || !api.groups.length}
            onClick={floatActive}
          >
            {api?.activePanel &&
            api
              .getPopouts()
              .some((item) => item.group.id === api.activePanel?.api.group.id)
              ? "Reacoplar painel ativo"
              : "Flutuar painel ativo"}
          </button>
        </div>
      )}
    </div>
  );
}
