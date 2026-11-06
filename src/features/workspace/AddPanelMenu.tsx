import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Plus } from "lucide-react";
import type { DockviewReadyEvent } from "dockview-react";
import { PANEL_CATALOG, PANEL_TITLES, type WorkspaceMode } from "../../domain/workspace";

const labels = PANEL_TITLES;
const shortcuts = ["1", "2", "3", "4", "5"] as const;

export function openWorkspacePanel(
  api: DockviewReadyEvent["api"],
  component: keyof typeof PANEL_CATALOG,
  params?: Record<string, unknown>,
) {
  const definition = PANEL_CATALOG[component];
  const existing =
    definition.singleton &&
    api.panels.find((panel) => panel.api.component === component);
  if (existing) {
    if (params) existing.api.updateParameters(params);
    existing.api.setActive();
    return existing;
  }
  const id = component === "score" ? `score:${Date.now()}` : component;
  return api.addPanel({ id, component, title: labels[component], params });
}

export function useWorkspacePanelShortcuts(
  api: DockviewReadyEvent["api"] | null,
  mode: WorkspaceMode,
  panelParams?: Record<string, unknown>,
) {
  useEffect(() => {
    if (!api) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey ||
        !/^[1-5]$/.test(event.key)
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      )
        return;
      const component = (
        ["metronome", "tuner", "score", "recorder", "session"] as const
      )[Number(event.key) - 1];
      if (
        !component ||
        !(PANEL_CATALOG[component].modes as readonly WorkspaceMode[]).includes(
          mode,
        )
      )
        return;
      event.preventDefault();
      openWorkspacePanel(api, component, panelParams);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [api, mode, panelParams]);
}

export function AddPanelMenu({
  api,
  mode,
  onOpen,
  panelParams,
}: {
  api: DockviewReadyEvent["api"] | null;
  mode: WorkspaceMode;
  onOpen?: () => void;
  panelParams?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [scoreSubmenu, setScoreSubmenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useWorkspacePanelShortcuts(api, mode, panelParams);
  const available = (
    Object.keys(PANEL_CATALOG) as (keyof typeof PANEL_CATALOG)[]
  ).filter((key) =>
    (PANEL_CATALOG[key].modes as readonly WorkspaceMode[]).includes(mode),
  );
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setScoreSubmenu(false);
        trigger.current?.focus();
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = root.current?.querySelectorAll<HTMLButtonElement>(
          "[role=menuitem]:not(:disabled)",
        );
        if (!items?.length) return;
        event.preventDefault();
        const index = [...items].indexOf(
          document.activeElement as HTMLButtonElement,
        );
        items[
          (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length
        ]?.focus();
      }
    };
    window.addEventListener("keydown", close);
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const activate = (key: keyof typeof PANEL_CATALOG) => {
    if (!api) return;
    openWorkspacePanel(api, key, panelParams);
    setOpen(false);
    onOpen?.();
  };
  return (
    <div className="cress-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="cress-control"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Plus size={16} /> Painel
      </button>
      {open && (
        <div
          className="cress-menu-popover cress-add-panel-menu"
          role="menu"
          aria-label="Abrir painel"
        >
          {available.map((key, index) => {
            const item = PANEL_CATALOG[key];
            const opened =
              item.singleton &&
              !!api?.panels.some((panel) => panel.api.component === key);
            if (key === "score")
              return (
                <div key={key} className="cress-submenu-wrap">
                  <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={scoreSubmenu}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") setScoreSubmenu(true);
                    }}
                    onClick={() => setScoreSubmenu(!scoreSubmenu)}
                  >
                    <span>{labels[key]}</span>
                    <ChevronRight size={16} />
                  </button>
                  {scoreSubmenu && (
                    <div className="cress-submenu" role="menu">
                      <button type="button" role="menuitem" disabled>
                        Seleção de partitura chega na Fase 9
                      </button>
                    </div>
                  )}
                </div>
              );
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => activate(key)}
              >
                <span>{labels[key]}</span>
                <span className="cress-menu-meta">
                  {opened ? (
                    <>
                      <Check size={14} /> Aberto
                    </>
                  ) : (
                    `Ctrl+${shortcuts[index]}`
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
