import { describe, expect, it } from "vitest";
import { PANEL_CATALOG } from "../../domain/workspace";
import { panelRegistry, panelRenderer } from "./panelRegistry";

describe("panel registry", () => {
  it("registers one placeholder for each panel in the domain catalog", () => {
    expect(Object.keys(panelRegistry).sort()).toEqual(
      Object.values(PANEL_CATALOG)
        .map(({ component }) => component)
        .sort(),
    );
    expect(
      Object.values(panelRegistry).every(
        (component) => typeof component === "function",
      ),
    ).toBe(true);
  });

  it("keeps score panels mounted and other panels visible-only", () => {
    for (const { component } of Object.values(PANEL_CATALOG)) {
      expect(panelRenderer(component)).toBe(
        component === PANEL_CATALOG.score.component
          ? "always"
          : "onlyWhenVisible",
      );
    }
  });

  it("registers the score viewer instead of the generic placeholder", () => {
    expect(panelRegistry.score?.name).toBe("ScorePanel");
  });
});
