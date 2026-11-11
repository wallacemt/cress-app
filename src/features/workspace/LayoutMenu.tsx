import { useLayoutEffect, useRef, useState } from "react";
import { LayoutPanelLeft } from "lucide-react";
import type { DockviewReadyEvent } from "dockview-react";
import { buildDefaultLayoutAddPanelSpecs, type WorkspaceMode } from "../../domain/workspace";
import { resetLayouts, saveLayout } from "../../application/workspace";
import type { Deps } from "../../application/deps";
import type { StudySessionRow } from "../../infrastructure/db/rows";

export function LayoutMenu({
  api,
  mode,
  deps,
  pieceId,
  session,
  hasScores = false,
  firstScoreId,
}: {
  api: DockviewReadyEvent["api"] | null;
  mode: WorkspaceMode;
  deps: Deps | null;
  pieceId?: string;
  session?: StudySessionRow | null;
  hasScores?: boolean;
  firstScoreId?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const left = Math.min(trigger.right - popover.width, window.innerWidth - popover.width - 8);
    const top = Math.min(trigger.bottom + 6, window.innerHeight - popover.height - 8);
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [open]);
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
    api.getPopouts().forEach((popout) => popout.group.api.close());
    api.closeAllGroups();
    const containerSize = { width: api.width, height: api.height };
    const sessionParams = session && deps ? { session, pieceId, deps } : undefined;
    for (const panel of buildDefaultLayoutAddPanelSpecs(mode, hasScores, firstScoreId, containerSize, sessionParams)) api.addPanel(panel);
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
        ref={triggerRef}
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
          ref={popoverRef}
          role="menu"
          aria-label="Opções de layout"
          className="cress-menu-popover cress-layout-menu"
          style={{ top: pos.top, left: pos.left }}
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
