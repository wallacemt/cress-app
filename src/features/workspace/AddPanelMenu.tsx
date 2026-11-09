import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { DockviewReadyEvent } from "dockview-react";
import { PANEL_CATALOG, PANEL_TITLES, type WorkspaceMode } from "../../domain/workspace";
import { ScorePicker } from "./ScorePicker";

const labels = PANEL_TITLES;
const shortcuts = ["1", "2", "3", "4", "5"] as const;

export function openWorkspacePanel(
  api: DockviewReadyEvent["api"],
  component: keyof typeof PANEL_CATALOG,
  params?: Record<string, unknown>,
  explicitId?: string,
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
  if (component === "score" && !explicitId) return undefined;
  const id = component === "score" ? explicitId : component;
  if (component === "score" && explicitId) {
    const existingScore = api.panels.find((panel) => panel.api.id === explicitId);
    if (existingScore) { existingScore.api.setActive(); return existingScore; }
  }
  return api.addPanel({ id: id!, component, title: labels[component], params });
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
      if (component === "score") return;
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
  const [scoreDialog, setScoreDialog] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useWorkspacePanelShortcuts(api, mode, panelParams);
  useEffect(() => {
    if (!scoreDialog) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setScoreDialog(false);
      trigger.current?.focus();
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [scoreDialog]);
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
                <div key={key}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setOpen(false); setScoreDialog(true); }}
                  >
                    <span>{labels[key]}</span>
                    <span className="cress-menu-meta">Selecionar…</span>
                  </button>
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
      {scoreDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setScoreDialog(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="score-picker-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--border-default)] bg-[var(--ink-900)] text-[var(--text-primary)] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
              <h2 id="score-picker-title" className="font-display text-2xl">Selecionar partitura</h2>
              <button type="button" aria-label="Fechar seleção de partitura" className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--violet-tint)]" onClick={() => { setScoreDialog(false); trigger.current?.focus(); }}><X size={18} /></button>
            </header>
            <ScorePicker onSelect={(id, title) => {
              if (!api) return;
              const opened = openWorkspacePanel(api, "score", panelParams, `score:${id}`);
              opened?.api.setTitle(title);
              setScoreDialog(false); onOpen?.();
            }} />
          </section>
        </div>
      )}
    </div>
  );
}
