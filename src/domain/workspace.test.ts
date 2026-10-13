import { describe, expect, it } from "vitest";
import { defaultLayoutPlan, layoutKey, sanitizeLayout } from "./workspace";
describe("workspace", () => {
  it("builds layout modes and keys", () => {
    expect(defaultLayoutPlan("free")).toHaveLength(2);
    expect(defaultLayoutPlan("session")).toHaveLength(4);
    expect(
      defaultLayoutPlan("session", true, "p1").some(
        (panel) => panel.id === "score:p1",
      ),
    ).toBe(true);
    expect(layoutKey({ pieceId: "p1" })).toBe("workspace.layout.piece.p1");
    expect(layoutKey({})).toBe("workspace.layout.free");
  });
  it("sanitizes invalid and duplicate panels", () => {
    const layout = sanitizeLayout(
      {
        grid: {
          type: "branch",
          children: [{ type: "leaf", views: ["a", "b", "bad"] }],
        },
        panels: {
          a: { contentComponent: "metronome" },
          b: { contentComponent: "metronome" },
          bad: { contentComponent: "unknown" },
        },
      },
      { mode: "free", scoreIds: new Set() },
    );
    expect(Object.keys(layout?.panels ?? {})).toEqual(["a"]);
    expect(
      sanitizeLayout(null, { mode: "free", scoreIds: new Set() }),
    ).toBeNull();
  });
});
