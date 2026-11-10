// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DockviewReadyEvent } from "dockview-react";
import { LayoutMenu } from "./LayoutMenu";

describe("LayoutMenu", () => {
  afterEach(cleanup);

  it("moves the active panel into an adjacent group", () => {
    const target = { id: "right" };
    const group = { id: "left" };
    const moveTo = vi.fn();
    const api = {
      activePanel: { id: "tuner", api: { group, moveTo } },
      adjacentGroupInDirection: vi.fn(() => target),
      groups: [group, target],
      addFloatingGroup: vi.fn(),
      getPopouts: vi.fn(() => []),
    } as unknown as DockviewReadyEvent["api"];
    render(<LayoutMenu api={api} mode="free" deps={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Layout" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Direita" }));
    expect(moveTo).toHaveBeenCalledWith({ group: target, position: "right" });
  });

  it("closes popout panels before rebuilding the default layout", () => {
    const events: string[] = [];
    const ids = ["metronome"];
    const floatingGroup = { id: "popout", api: { close: vi.fn(() => { events.push("popout-close"); }) } };
    const api = {
      width: 800,
      height: 600,
      groups: [],
      getPopouts: vi.fn(() => [{ id: "popout", group: floatingGroup }]),
      closeAllGroups: vi.fn(() => { events.push("close-all"); ids.length = 0; }),
      addPanel: vi.fn((panel: { id: string }) => { events.push(`add-${panel.id}`); ids.push(panel.id); }),
    } as unknown as DockviewReadyEvent["api"];
    floatingGroup.api.close.mockImplementation(() => {
      events.push("popout-close");
      ids.splice(ids.indexOf("metronome"), 1);
    });

    render(<LayoutMenu api={api} mode="free" deps={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Layout" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Restaurar layout padrão" }));

    expect(events[0]).toBe("popout-close");
    expect(events[1]).toBe("close-all");
    expect(ids).toEqual(["tuner", "metronome"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
