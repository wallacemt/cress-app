// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DockviewReadyEvent } from "dockview-react";
import { LayoutMenu } from "./LayoutMenu";

describe("LayoutMenu", () => {
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
});
