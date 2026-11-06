// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DockviewReadyEvent } from "dockview-react";
import {
  AddPanelMenu,
  openWorkspacePanel,
  useWorkspacePanelShortcuts,
} from "./AddPanelMenu";

function fakeApi(component?: string) {
  const panel = component
    ? { id: component, api: { component, setActive: vi.fn() } }
    : undefined;
  return {
    panels: panel ? [panel] : [],
    addPanel: vi.fn((options) => ({ id: options.id })),
  } as unknown as DockviewReadyEvent["api"];
}

describe("AddPanelMenu", () => {
  afterEach(() => document.body.replaceChildren());
  it("activates an existing singleton without adding another", () => {
    const api = fakeApi("metronome");
    openWorkspacePanel(api, "metronome");
    expect(api.panels[0]?.api.setActive).toHaveBeenCalledOnce();
    expect(api.addPanel).not.toHaveBeenCalled();
  });

  it("opens the matching panel shortcut and skips inputs", () => {
    const api = fakeApi();
    const add = vi.spyOn(api, "addPanel");
    function Shortcuts() {
      useWorkspacePanelShortcuts(api, "free");
      return <input aria-label="Entrada" />;
    }
    const { container } = render(
      <div>
        <AddPanelMenu api={api} mode="free" />
        <Shortcuts />
      </div>,
    );
    fireEvent.keyDown(container.querySelector("input")!, {
      key: "1",
      ctrlKey: true,
    });
    expect(add).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ component: "metronome" }),
    );
  });

  it("supports arrows, Enter and Escape in its menu", async () => {
    const api = fakeApi();
    const { container } = render(<AddPanelMenu api={api} mode="free" />);
    fireEvent.click(container.querySelector("button")!);
    const metronome = screen.getByRole("menuitem", { name: /Metrônomo/ });
    await waitFor(() => expect(document.activeElement).toBe(metronome));
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("menuitem", { name: /Afinador/ }),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Abrir painel" })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Painel" }),
    );
  });

  it("keeps session-only panels out of free practice but allows the recorder", () => {
    const { container } = render(<AddPanelMenu api={fakeApi()} mode="free" />);
    fireEvent.click(container.querySelector("button")!);
    expect(screen.queryByText("Gravações")).not.toBeNull();
    expect(screen.queryByText("Sessão")).toBeNull();
  });
});
